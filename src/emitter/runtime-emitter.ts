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

// Extracted modules for DRY
import { stripTypesFromFunction } from './type-stripper.js';
import { generateRuntimeContent } from './runtime-template.js';

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
    const fullText = stripTypesFromFunction(node.getText());

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

  // Generate constant definitions
  const constantDefs: string[] = [];
  constants.forEach((info) => {
    constantDefs.push(`const ${info.name} = ${info.value};`);
  });

  // Generate runtime content using shared template
  const content = generateRuntimeContent({
    functionNames,
    functionBodies,
    imports: detectRequiredImports(functionBodies),
    constants: constantDefs,
  });

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

  // Generate constant definitions
  const constantDefs: string[] = [];
  mergedConstants.forEach((value, name) => {
    constantDefs.push(`const ${name} = ${value};`);
  });

  // Generate runtime content using shared template
  const content = generateRuntimeContent({
    functionNames: allFunctionNames,
    functionBodies,
    imports: detectRequiredImports(functionBodies),
    constants: constantDefs,
  });

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
export function isRuntimeFile(sourceFile: SourceFile): boolean {
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
