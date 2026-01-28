/**
 * Runtime Emitter
 *
 * Extracts runtime functions from source files and generates runtime.js.
 * The runtime.js file is a CLI-invocable bundle that Claude calls via bash.
 *
 * Output format:
 * ```javascript
 * #!/usr/bin/env node
 * // Extracted functions
 * async function init(args) { ... }
 * async function getContext(args) { ... }
 *
 * // Registry
 * const registry = { init, getContext };
 *
 * // CLI entry
 * const [,, fnName, argsJson] = process.argv;
 * const result = await registry[fnName](JSON.parse(argsJson));
 * console.log(JSON.stringify(result));
 * ```
 */

import { Node, SourceFile, Project, FunctionDeclaration, VariableDeclarationKind } from 'ts-morph';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

/**
 * Extracted function information
 */
export interface ExtractedFunction {
  /** Function name */
  name: string;
  /** Function source code (body only, without signature) */
  body: string;
  /** Parameter names */
  params: string[];
  /** Whether it's async */
  isAsync: boolean;
  /** Original source file path */
  sourcePath: string;
}

/**
 * Extracted constant information
 */
export interface ExtractedConstant {
  /** Constant name */
  name: string;
  /** Constant value as source code */
  value: string;
  /** Original source file path */
  sourcePath: string;
}

/**
 * Runtime emission result
 */
export interface RuntimeEmitResult {
  /** Generated runtime.js content */
  content: string;
  /** List of functions included (namespaced if applicable) */
  functions: string[];
  /** Function bodies for merging (keyed by namespaced name) */
  functionBodies: Map<string, string>;
  /** Constants for merging (keyed by name) */
  constants: Map<string, string>;
  /** Any warnings during extraction */
  warnings: string[];
}

// ============================================================================
// Function Extraction
// ============================================================================

/**
 * Find the index of the function body opening brace
 * Handles nested braces in type annotations (e.g., Promise<{ foo: string }>)
 */
function findFunctionBodyStart(funcText: string): number {
  // Find the last ) that's part of the parameter list
  // Then skip the return type (which may contain nested braces)
  // Then find the { that starts the function body

  // Strategy: Find "function name(" or "(" and track brace/paren depth
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return -1;

  let pos = funcMatch.index! + funcMatch[0].length;
  let parenDepth = 1;

  // Find the closing ) of the parameter list
  while (pos < funcText.length && parenDepth > 0) {
    const char = funcText[pos];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    pos++;
  }

  // Now skip the return type annotation (if any) and find the function body {
  // The return type may contain nested { } for object types inside angle brackets
  let braceDepth = 0;
  let angleBracketDepth = 0;
  let inReturnType = false;

  while (pos < funcText.length) {
    const char = funcText[pos];

    if (char === ':' && !inReturnType) {
      inReturnType = true;
      pos++;
      continue;
    }

    if (char === '<') {
      angleBracketDepth++;
    } else if (char === '>') {
      angleBracketDepth--;
    } else if (char === '{') {
      if (inReturnType && angleBracketDepth > 0) {
        // This { is inside <>, so it's part of an object type (e.g., Promise<{ foo: string }>)
        braceDepth++;
      } else {
        // This { is the function body start (either no return type or outside angle brackets)
        return pos;
      }
    } else if (char === '}' && braceDepth > 0) {
      braceDepth--;
    }

    pos++;
  }

  return -1;
}

/**
 * Strip type annotations from variable declarations
 * Handles complex types with nested braces/brackets like:
 *   const waves: { wave: number; plans: string[] }[] = [];
 */
function stripVariableTypeAnnotations(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    // Look for const/let/var followed by identifier and colon
    const declMatch = code.slice(i).match(/^(const|let|var)\s+(\w+)\s*:/);
    if (declMatch) {
      // Found a typed variable declaration
      const keyword = declMatch[1];
      const name = declMatch[2];

      // Skip past the match
      let j = i + declMatch[0].length;

      // Skip the type annotation - track depth of {}, [], <>
      let depth = 0;
      while (j < code.length) {
        const char = code[j];
        if (char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === '}' || char === ']' || char === '>') {
          depth--;
        } else if (depth === 0 && (char === '=' || char === ';' || char === '\n')) {
          // End of type annotation
          break;
        }
        j++;
      }

      // Output the declaration without the type
      result += keyword + ' ' + name;

      // Continue from where we left off
      i = j;
      continue;
    }

    // No match, copy character as-is
    result += code[i];
    i++;
  }

  return result;
}

/**
 * Strip type assertions from code
 * Handles: value as Type, <Type>value
 */
function stripTypeAssertions(code: string): string {
  // Strip "as Type" assertions - handle nested generics
  let result = code;

  // Strip " as Type" or " as Type<...>"
  // Match "as" followed by type identifier and optional generic args
  result = result.replace(/\s+as\s+\w+(?:<[^>]+>)?/g, '');

  // Strip angle bracket assertions: <Type>value or <Type<...>>value
  result = result.replace(/<\w+(?:<[^>]+>)?>/g, '');

  return result;
}

/**
 * Strip arrow function type annotations from code
 * Handles: (param: Type): ReturnType => ... → (param) => ...
 */
function stripArrowFunctionTypes(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    // Look for arrow function patterns: (params) or (params): ReturnType followed by =>
    // Pattern: = (params): ReturnType =>   or   = (params) =>
    const arrowMatch = code.slice(i).match(/^=\s*\(/);
    if (arrowMatch) {
      result += '= (';
      i += arrowMatch[0].length;

      // Parse parameter list, stripping types
      let parenDepth = 1;
      let inType = false;
      let paramChars = '';

      while (i < code.length && parenDepth > 0) {
        const char = code[i];

        if (char === '(') {
          parenDepth++;
          if (!inType) paramChars += char;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth > 0 && !inType) paramChars += char;
        } else if (char === ':' && parenDepth === 1) {
          // Start of type annotation for this param
          inType = true;
        } else if (char === ',' && parenDepth === 1) {
          // End of param, reset type tracking
          inType = false;
          paramChars += char;
        } else if (!inType) {
          paramChars += char;
        }

        i++;
      }

      result += paramChars + ')';

      // Now check for return type annotation: ): ReturnType =>
      // Skip whitespace
      while (i < code.length && /\s/.test(code[i])) {
        i++;
      }

      // Check for return type annotation
      if (code[i] === ':') {
        i++; // Skip the colon
        // Skip the return type - track depth for nested types like { a: b }
        let depth = 0;
        while (i < code.length) {
          const char = code[i];
          if (char === '{' || char === '<' || char === '(' || char === '[') {
            depth++;
          } else if (char === '}' || char === '>' || char === ')' || char === ']') {
            depth--;
          } else if (depth === 0 && code.slice(i, i + 2) === '=>') {
            // Found the arrow, stop skipping
            break;
          }
          i++;
        }
      }

      // Add space before arrow if needed
      if (result[result.length - 1] !== ' ') {
        result += ' ';
      }

      continue;
    }

    // No match, copy character as-is
    result += code[i];
    i++;
  }

  return result;
}

/**
 * Find the position of the closing paren of the parameter list
 */
function findParamListEnd(funcText: string): number {
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return -1;

  let pos = funcMatch.index! + funcMatch[0].length;
  let parenDepth = 1;

  while (pos < funcText.length && parenDepth > 0) {
    const char = funcText[pos];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    pos++;
  }

  return pos - 1; // Position of the closing )
}

/**
 * Strip TypeScript type annotations from code
 * Handles function signatures, variable declarations, and type casts
 */
function stripTypes(funcText: string): string {
  const bodyStart = findFunctionBodyStart(funcText);
  if (bodyStart === -1) return funcText;

  const paramListEnd = findParamListEnd(funcText);
  if (paramListEnd === -1) return funcText;

  // Match the function declaration to get prefix
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return funcText;

  // Extract parts:
  // - prefix: "async function name(" or "function name("
  // - params: everything between ( and ) of parameter list
  // - body: from the opening { of function body to the end
  const prefix = funcText.slice(0, funcMatch.index! + funcMatch[0].length);
  const params = funcText.slice(funcMatch.index! + funcMatch[0].length, paramListEnd);
  let body = funcText.slice(bodyStart);

  // Remove 'export' keyword from prefix
  let cleanPrefix = prefix.replace(/^export\s+/, '');

  // Remove generic type parameters on function: function name<T>( -> function name(
  cleanPrefix = cleanPrefix.replace(/function\s+(\w+)\s*<[^>]+>\s*\(/, 'function $1(');

  // Extract just parameter names from params string
  // Handle complex types like { foo: string } by tracking brace depth
  const paramNames: string[] = [];
  let depth = 0;
  let current = '';
  let inName = true;

  for (const char of params) {
    if (char === '{' || char === '<' || char === '(') {
      depth++;
      if (!inName) continue;
    } else if (char === '}' || char === '>' || char === ')') {
      depth--;
      if (!inName) continue;
    } else if (char === ':' && depth === 0) {
      inName = false;
      continue;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) paramNames.push(current.trim());
      current = '';
      inName = true;
      continue;
    }

    if (inName) {
      current += char;
    }
  }
  if (current.trim()) paramNames.push(current.trim());

  // Build clean signature: prefix + stripped params + )
  const cleanSignature = cleanPrefix + paramNames.join(', ') + ')';

  // Strip type annotations from variable declarations in the body
  // Uses a state machine to handle complex types with nested braces/brackets
  body = stripVariableTypeAnnotations(body);

  // Strip type assertions: value as Type  ->  value
  // Must be careful to handle nested generics
  body = stripTypeAssertions(body);

  // Strip arrow function type annotations: (param: Type): ReturnType => ...
  body = stripArrowFunctionTypes(body);

  return cleanSignature + ' ' + body;
}

/**
 * Extract ALL function declarations from a source file
 *
 * When extractAll is true, extracts all functions (for runtime files).
 * Otherwise, only extracts functions in functionNames set.
 *
 * @param sourceFile - Source file to scan
 * @param functionNames - Names of functions to extract (if extractAll is false)
 * @param extractAll - If true, extract all functions regardless of names
 * @returns Map of function name -> extracted info
 */
export function extractFunctions(
  sourceFile: SourceFile,
  functionNames: Set<string>,
  extractAll = false
): Map<string, ExtractedFunction> {
  const extracted = new Map<string, ExtractedFunction>();

  // Find function declarations
  sourceFile.forEachDescendant((node) => {
    if (!Node.isFunctionDeclaration(node)) return;

    const name = node.getName();
    if (!name) return;
    if (!extractAll && !functionNames.has(name)) return;

    const body = node.getBody();
    if (!body) return;

    // Get the full function text and strip TypeScript types
    const fullText = stripTypes(node.getText());

    extracted.set(name, {
      name,
      body: fullText,
      params: node.getParameters().map(p => p.getName()),
      isAsync: node.isAsync(),
      sourcePath: sourceFile.getFilePath(),
    });
  });

  // Also check variable declarations with arrow functions
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const name = node.getName();
    if (!extractAll && !functionNames.has(name)) return;
    if (extracted.has(name)) return; // Already found as function declaration

    const init = node.getInitializer();
    if (!init) return;

    // Arrow function
    if (Node.isArrowFunction(init)) {
      const params = init.getParameters().map(p => p.getName());
      const body = init.getBody();
      if (!body) return;

      // Reconstruct as regular async function for consistency
      const bodyText = Node.isBlock(body)
        ? body.getText()
        : `{ return ${body.getText()}; }`;

      const asyncKeyword = init.isAsync() ? 'async ' : '';
      const funcText = `${asyncKeyword}function ${name}(${params.join(', ')}) ${bodyText}`;

      extracted.set(name, {
        name,
        body: funcText,
        params,
        isAsync: init.isAsync(),
        sourcePath: sourceFile.getFilePath(),
      });
    }
  });

  return extracted;
}

/**
 * Extract top-level constants from a source file
 *
 * Extracts const declarations that are object literals, arrays, or primitives.
 * These are needed when functions reference module-level constants.
 *
 * @param sourceFile - Source file to scan
 * @returns Map of constant name -> extracted info
 */
export function extractConstants(
  sourceFile: SourceFile
): Map<string, ExtractedConstant> {
  const extracted = new Map<string, ExtractedConstant>();

  // Look for top-level variable statements
  for (const statement of sourceFile.getStatements()) {
    if (!Node.isVariableStatement(statement)) continue;

    // Only extract const declarations
    const declList = statement.getDeclarationList();
    if (declList.getDeclarationKind() !== VariableDeclarationKind.Const) continue;

    for (const decl of declList.getDeclarations()) {
      const name = decl.getName();
      const init = decl.getInitializer();
      if (!init) continue;

      // Skip functions (already handled by extractFunctions)
      if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
        continue;
      }

      // Extract object literals, array literals, and primitives
      if (
        Node.isObjectLiteralExpression(init) ||
        Node.isArrayLiteralExpression(init) ||
        Node.isStringLiteral(init) ||
        Node.isNumericLiteral(init) ||
        Node.isTrueLiteral(init) ||
        Node.isFalseLiteral(init)
      ) {
        // Get the value, stripping any type annotations
        let value = init.getText();

        // For object literals, strip type annotations from values
        // e.g., { key: 'value' as const } -> { key: 'value' }
        value = value.replace(/\s+as\s+\w+(?:<[^>]+>)?/g, '');
        value = value.replace(/\s+as\s+const/g, '');

        extracted.set(name, {
          name,
          value,
          sourcePath: sourceFile.getFilePath(),
        });
      }
    }
  }

  return extracted;
}

/**
 * Extract functions from import paths
 *
 * Resolves import paths relative to the main source file and extracts
 * ALL functions from those files (runtime files need all helpers).
 */
/**
 * Result of extracting from import paths
 */
export interface ExtractFromImportsResult {
  functions: Map<string, ExtractedFunction>;
  constants: Map<string, ExtractedConstant>;
}

export function extractFromImports(
  project: Project,
  mainSourcePath: string,
  importPaths: string[],
  functionNames: Set<string>
): ExtractFromImportsResult {
  const allFunctions = new Map<string, ExtractedFunction>();
  const allConstants = new Map<string, ExtractedConstant>();
  const mainDir = path.dirname(mainSourcePath);

  for (const importPath of importPaths) {
    // Resolve relative import to absolute path
    let resolvedPath: string;
    if (importPath.startsWith('.')) {
      resolvedPath = path.resolve(mainDir, importPath);
      // Convert .js extension to .ts for TypeScript source lookup
      // (TSX files import from .js but actual sources are .ts)
      if (resolvedPath.endsWith('.js')) {
        resolvedPath = resolvedPath.replace(/\.js$/, '.ts');
      } else if (!resolvedPath.endsWith('.ts')) {
        resolvedPath += '.ts';
      }
    } else {
      // Node module - skip for now (would need node_modules resolution)
      continue;
    }

    try {
      const sourceFile = project.addSourceFileAtPath(resolvedPath);

      // Extract ALL functions from runtime files (they need helper functions)
      const extractedFunctions = extractFunctions(sourceFile, functionNames, true);
      extractedFunctions.forEach((info, name) => {
        allFunctions.set(name, info);
      });

      // Extract constants from runtime files
      const extractedConstants = extractConstants(sourceFile);
      extractedConstants.forEach((info, name) => {
        allConstants.set(name, info);
      });
    } catch (e) {
      // File not found - will be reported as warning
      continue;
    }
  }

  return { functions: allFunctions, constants: allConstants };
}

// ============================================================================
// Runtime Generation
// ============================================================================

/**
 * Analyze function bodies to detect required imports
 */
function detectRequiredImports(functionBodies: string[]): string[] {
  const imports: string[] = [];
  const allBodies = functionBodies.join('\n');

  // Check for fs usage (fs.promises, fs.readFile, fs.stat, fs.mkdir, etc.)
  if (/\bfs\./.test(allBodies) || /await import\(['"]fs/.test(allBodies)) {
    imports.push("const fs = await import('fs/promises');");
  }

  // Check for path usage (path.join, path.dirname, path.basename, etc.)
  if (/\bpath\./.test(allBodies)) {
    imports.push("const path = await import('path');");
  }

  return imports;
}

/**
 * Rename a function declaration in its source text
 *
 * @example renameFunctionDeclaration('async function init(args) { ... }', 'init', 'planPhase_init')
 *          → 'async function planPhase_init(args) { ... }'
 */
function renameFunctionDeclaration(source: string, originalName: string, newName: string): string {
  // Match "function name" or "async function name" and replace name
  const pattern = new RegExp(`((?:async\\s+)?function\\s+)${originalName}(\\s*\\()`);
  return source.replace(pattern, `$1${newName}$2`);
}

/**
 * Rename function calls in source code
 *
 * Replaces standalone function calls like `fnName(...)` with `newName(...)`.
 * Avoids replacing object method calls like `obj.fnName(...)` or `await fnName(...)`.
 *
 * @example renameFunctionCalls('fileExists(path)', { 'fileExists': 'ns_fileExists' })
 *          → 'ns_fileExists(path)'
 */
function renameFunctionCalls(source: string, nameMap: Map<string, string>): string {
  let result = source;

  nameMap.forEach((newName, oldName) => {
    // Match function calls: word boundary + name + (
    // But NOT: .name( (method call) or name without (
    // Use negative lookbehind for . and positive lookahead for (
    const pattern = new RegExp(`(?<![.\\w])\\b${oldName}\\s*\\(`, 'g');
    result = result.replace(pattern, `${newName}(`);
  });

  return result;
}

/**
 * Generate runtime.js content from extracted functions and constants
 *
 * @param functions - Map of original function name -> extracted info
 * @param constants - Map of constant name -> extracted info
 * @param namespace - Optional namespace prefix for function names
 */
export function generateRuntime(
  functions: Map<string, ExtractedFunction>,
  constants: Map<string, ExtractedConstant> = new Map(),
  namespace?: string
): RuntimeEmitResult {
  const warnings: string[] = [];
  const functionNames: string[] = [];
  const functionBodies: string[] = [];

  // Build name mapping for internal call renaming
  const nameMap = new Map<string, string>();
  if (namespace) {
    functions.forEach((_, originalName) => {
      nameMap.set(originalName, `${namespace}_${originalName}`);
    });
  }

  functions.forEach((info, originalName) => {
    // Apply namespace prefix if provided
    const finalName = namespace ? `${namespace}_${originalName}` : originalName;
    functionNames.push(finalName);

    let body = info.body;
    if (namespace) {
      // Rename the function declaration
      body = renameFunctionDeclaration(body, originalName, finalName);
      // Rename internal function calls
      body = renameFunctionCalls(body, nameMap);
    }
    functionBodies.push(body);
  });

  if (functionNames.length === 0) {
    return {
      content: '',
      functions: [],
      functionBodies: new Map(),
      constants: new Map(),
      warnings: ['No runtime functions to extract'],
    };
  }

  // Build maps for merging support
  const functionBodiesMap = new Map<string, string>();
  const constantsMap = new Map<string, string>();

  for (let i = 0; i < functionNames.length; i++) {
    functionBodiesMap.set(functionNames[i], functionBodies[i]);
  }

  constants.forEach((info) => {
    constantsMap.set(info.name, info.value);
  });

  // Detect which imports are needed
  const requiredImports = detectRequiredImports(functionBodies);
  const importsSection = requiredImports.length > 0
    ? `  // Imports (dynamic for ESM compatibility)
${requiredImports.map(i => '  ' + i).join('\n')}

`
    : '';

  // Generate constants section
  const constantDefs: string[] = [];
  constants.forEach((info) => {
    constantDefs.push(`const ${info.name} = ${info.value};`);
  });
  const constantsSection = constantDefs.length > 0
    ? `  // ============================================================================
  // Constants
  // ============================================================================

${constantDefs.map(c => '  ' + c).join('\n')}

`
    : '';

  // Generate the runtime.js content wrapped in async IIFE
  const content = `#!/usr/bin/env node
/**
 * V3 Runtime - Extracted functions for Claude Code execution
 * Generated by react-agentic
 *
 * Usage: node runtime.js <functionName> '<jsonArgs>'
 */

(async () => {
${importsSection}${constantsSection}  // ============================================================================
  // Extracted Functions
  // ============================================================================

${functionBodies.map(b => '  ' + b.split('\n').join('\n  ')).join('\n\n')}

  // ============================================================================
  // Function Registry
  // ============================================================================

  const registry = {
${functionNames.map(n => `    ${n},`).join('\n')}
  };

  // ============================================================================
  // CLI Entry Point
  // ============================================================================

  const [,, fnName, argsJson] = process.argv;

  if (!fnName) {
    console.error('Usage: node runtime.js <functionName> <jsonArgs>');
    console.error('Available functions:', Object.keys(registry).join(', '));
    process.exit(1);
  }

  const fn = registry[fnName];
  if (!fn) {
    console.error(\`Unknown function: \${fnName}\`);
    console.error('Available functions:', Object.keys(registry).join(', '));
    process.exit(1);
  }

  let args = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      console.error(\`Invalid JSON args: \${e.message}\`);
      process.exit(1);
    }
  }

  try {
    const result = await fn(args);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.error(\`Function error: \${e.message}\`);
    process.exit(1);
  }
})();
`;

  return {
    content,
    functions: functionNames,
    functionBodies: functionBodiesMap,
    constants: constantsMap,
    warnings,
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Emit runtime.js from a V3 document's runtime function usage
 *
 * @param project - ts-morph project for file resolution
 * @param mainSourcePath - Path to the main TSX source file
 * @param functionNames - Names of functions that need to be extracted
 * @param importPaths - Import paths where functions might be defined
 * @param namespace - Optional namespace prefix for function names (e.g., 'planPhase')
 * @returns Runtime emit result with content and metadata
 */
export function emitRuntime(
  project: Project,
  mainSourcePath: string,
  functionNames: string[],
  importPaths: string[],
  namespace?: string
): RuntimeEmitResult {
  if (functionNames.length === 0) {
    return {
      content: '',
      functions: [],
      functionBodies: new Map(),
      constants: new Map(),
      warnings: [],
    };
  }

  const namesSet = new Set(functionNames);
  const warnings: string[] = [];

  // First try to extract from the main source file
  const mainSource = project.getSourceFile(mainSourcePath);
  let extractedFunctions = new Map<string, ExtractedFunction>();
  let extractedConstants = new Map<string, ExtractedConstant>();

  if (mainSource) {
    extractedFunctions = extractFunctions(mainSource, namesSet);
    extractedConstants = extractConstants(mainSource);
  }

  // Then try import paths for any missing functions (also gets constants)
  const missing = new Set(
    functionNames.filter(n => !extractedFunctions.has(n))
  );

  if (missing.size > 0 && importPaths.length > 0) {
    const fromImports = extractFromImports(project, mainSourcePath, importPaths, missing);

    fromImports.functions.forEach((info, name) => {
      extractedFunctions.set(name, info);
    });

    fromImports.constants.forEach((info, name) => {
      extractedConstants.set(name, info);
    });
  }

  // Check for still-missing functions
  for (const name of functionNames) {
    if (!extractedFunctions.has(name)) {
      warnings.push(`Could not extract function: ${name}`);
    }
  }

  return generateRuntime(extractedFunctions, extractedConstants, namespace);
}

/**
 * Merge multiple RuntimeEmitResults into a single result
 *
 * Used when building multiple V3 files that share a single runtime.js.
 * Each file's functions are already namespaced to avoid collisions.
 *
 * @param results - Array of RuntimeEmitResults to merge
 * @returns Merged result with combined functions and constants
 */
export function mergeRuntimeResults(results: RuntimeEmitResult[]): RuntimeEmitResult {
  const mergedFunctions = new Map<string, string>();
  const mergedConstants = new Map<string, string>();
  const allFunctionNames: string[] = [];
  const allWarnings: string[] = [];

  for (const result of results) {
    result.functionBodies.forEach((body, name) => {
      if (!mergedFunctions.has(name)) {
        mergedFunctions.set(name, body);
        allFunctionNames.push(name);
      }
    });

    result.constants.forEach((value, name) => {
      if (!mergedConstants.has(name)) {
        mergedConstants.set(name, value);
      }
    });

    allWarnings.push(...result.warnings);
  }

  if (allFunctionNames.length === 0) {
    return {
      content: '',
      functions: [],
      functionBodies: new Map(),
      constants: new Map(),
      warnings: allWarnings,
    };
  }

  // Generate merged runtime content
  const functionBodies = allFunctionNames.map(name => mergedFunctions.get(name)!);

  // Detect which imports are needed
  const requiredImports = detectRequiredImports(functionBodies);
  const importsSection = requiredImports.length > 0
    ? `  // Imports (dynamic for ESM compatibility)
${requiredImports.map(i => '  ' + i).join('\n')}

`
    : '';

  // Generate constants section
  const constantDefs: string[] = [];
  mergedConstants.forEach((value, name) => {
    constantDefs.push(`const ${name} = ${value};`);
  });
  const constantsSection = constantDefs.length > 0
    ? `  // ============================================================================
  // Constants
  // ============================================================================

${constantDefs.map(c => '  ' + c).join('\n')}

`
    : '';

  // Generate the runtime.js content
  const content = `#!/usr/bin/env node
/**
 * V3 Runtime - Extracted functions for Claude Code execution
 * Generated by react-agentic
 *
 * Usage: node runtime.js <functionName> '<jsonArgs>'
 */

(async () => {
${importsSection}${constantsSection}  // ============================================================================
  // Extracted Functions
  // ============================================================================

${functionBodies.map(b => '  ' + b.split('\n').join('\n  ')).join('\n\n')}

  // ============================================================================
  // Function Registry
  // ============================================================================

  const registry = {
${allFunctionNames.map(n => `    ${n},`).join('\n')}
  };

  // ============================================================================
  // CLI Entry Point
  // ============================================================================

  const [,, fnName, argsJson] = process.argv;

  if (!fnName) {
    console.error('Usage: node runtime.js <functionName> <jsonArgs>');
    console.error('Available functions:', Object.keys(registry).join(', '));
    process.exit(1);
  }

  const fn = registry[fnName];
  if (!fn) {
    console.error(\`Unknown function: \${fnName}\`);
    console.error('Available functions:', Object.keys(registry).join(', '));
    process.exit(1);
  }

  let args = {};
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch (e) {
      console.error(\`Invalid JSON args: \${e.message}\`);
      process.exit(1);
    }
  }

  try {
    const result = await fn(args);
    console.log(JSON.stringify(result));
  } catch (e) {
    console.error(\`Function error: \${e.message}\`);
    process.exit(1);
  }
})();
`;

  return {
    content,
    functions: allFunctionNames,
    functionBodies: mergedFunctions,
    constants: mergedConstants,
    warnings: allWarnings,
  };
}

/**
 * Check if a source file contains V3 runtime usage
 *
 * Looks for:
 * - useRuntimeVar imports/usage
 * - runtimeFn imports/usage
 *
 * @param sourceFile - Source file to check
 * @returns true if file uses V3 runtime features
 */
export function isV3File(sourceFile: SourceFile): boolean {
  let hasV3Usage = false;

  sourceFile.forEachDescendant((node) => {
    if (hasV3Usage) return; // Early exit

    // Check for useRuntimeVar call
    if (Node.isCallExpression(node)) {
      const expr = node.getExpression();
      if (Node.isIdentifier(expr)) {
        const name = expr.getText();
        if (name === 'useRuntimeVar' || name === 'runtimeFn') {
          hasV3Usage = true;
        }
      }
    }

    // Check for imports from react-agentic/v3
    if (Node.isImportDeclaration(node)) {
      const moduleSpec = node.getModuleSpecifierValue();
      if (moduleSpec.includes('/v3') || moduleSpec.endsWith('/v3')) {
        hasV3Usage = true;
      }
    }
  });

  return hasV3Usage;
}
