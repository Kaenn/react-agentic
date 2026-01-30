/**
 * esbuild-based Runtime Bundler
 *
 * Uses esbuild to bundle .runtime.ts files with full npm package support.
 * This replaces the manual type-stripping approach with proper bundling.
 */

import * as esbuild from 'esbuild';
import { SourceFile, Node } from 'ts-morph';
import path from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';

// ============================================================================
// Types
// ============================================================================

/**
 * Information about a runtime file for single-entry bundling
 */
export interface RuntimeFileInfo {
  /** Absolute path to the .runtime.ts source file */
  sourcePath: string;
  /** Namespace prefix for functions (e.g., 'planPhase') */
  namespace: string;
  /** Exported function names found in source (without namespace prefix) */
  exportedFunctions: string[];
}

/**
 * Options for single-entry bundling
 */
export interface SingleEntryBundleOptions {
  /** Runtime file info from all V3 files */
  runtimeFiles: RuntimeFileInfo[];
  /** Output path for the final runtime.js */
  outputPath: string;
  /** Directory for temporary entry file (default: .generated) */
  entryDir?: string;
  /** Minify the output bundle (default: false) */
  minify?: boolean;
}

/**
 * Options for code-split bundling
 */
export interface CodeSplitBundleOptions {
  /** Runtime file info from all V3 files */
  runtimeFiles: RuntimeFileInfo[];
  /** Output directory for split bundles */
  outputDir: string;
  /** Directory for temporary entry files (default: .generated) */
  entryDir?: string;
  /** Minify output bundles (default: false) */
  minify?: boolean;
}

/**
 * Result from code-split bundling
 */
export interface CodeSplitBundleResult {
  /** Dispatcher runtime.js content */
  dispatcherContent: string;
  /** Map of namespace -> bundled module content */
  moduleContents: Map<string, string>;
  /** All function names (with namespace prefixes) */
  functions: string[];
  /** Warnings from bundling */
  warnings: string[];
}

/**
 * Result from single-entry bundling
 */
export interface SingleEntryBundleResult {
  /** Final runtime.js content */
  content: string;
  /** All function names in registry (with namespace prefixes) */
  functions: string[];
  /** Warnings from bundling */
  warnings: string[];
}

export interface BundledRuntime {
  /** Bundled JavaScript code (without CLI wrapper) */
  code: string;
  /** Exported function names found in source */
  exportedFunctions: string[];
  /** Source file path */
  sourcePath: string;
  /** Any warnings */
  warnings: string[];
}

export interface BundleRuntimeOptions {
  /** Namespace prefix for functions (e.g., 'planPhase' -> 'planPhase_init') */
  namespace?: string;
  /** External modules to exclude from bundle (default: []) */
  external?: string[];
}

export interface MergedRuntimeResult {
  /** Final runtime.js content */
  content: string;
  /** All function names in registry */
  functions: string[];
  /** Warnings from bundling */
  warnings: string[];
}

// ============================================================================
// Function Extraction (from TypeScript source)
// ============================================================================

/**
 * Extract exported function names from a TypeScript source file
 */
export function extractExportedFunctionNames(sourceFile: SourceFile): string[] {
  const names: string[] = [];

  sourceFile.forEachDescendant((node) => {
    // Exported function declarations: export async function init() {}
    if (Node.isFunctionDeclaration(node)) {
      if (node.isExported()) {
        const name = node.getName();
        if (name) names.push(name);
      }
    }

    // Exported variable declarations with arrow functions:
    // export const init = async () => {}
    if (Node.isVariableStatement(node)) {
      if (node.isExported()) {
        for (const decl of node.getDeclarationList().getDeclarations()) {
          const init = decl.getInitializer();
          if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
            names.push(decl.getName());
          }
        }
      }
    }
  });

  return names;
}

// ============================================================================
// Esbuild Bundling
// ============================================================================

/**
 * Bundle a .runtime.ts file using esbuild
 *
 * This bundles the TypeScript file with all its npm dependencies inlined,
 * producing a self-contained JavaScript module.
 */
export async function bundleRuntimeFile(
  runtimeFilePath: string,
  options: BundleRuntimeOptions = {}
): Promise<BundledRuntime> {
  const warnings: string[] = [];
  const { namespace, external = [] } = options;

  // Bundle with esbuild
  const result = await esbuild.build({
    entryPoints: [runtimeFilePath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    // Keep node built-ins external, they'll be imported at runtime
    external: ['fs', 'fs/promises', 'path', 'node:fs', 'node:path', ...external],
    // Target modern Node.js
    target: 'node18',
    // Don't minify for readability
    minify: false,
    // Keep names for debugging
    keepNames: true,
    // Tree-shake unused exports
    treeShaking: true,
  });

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      warnings.push(`esbuild error: ${error.text}`);
    }
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      warnings.push(`esbuild warning: ${warning.text}`);
    }
  }

  let code = result.outputFiles?.[0]?.text || '';

  // The bundled code has ESM exports. We need to extract the function bodies
  // and make them available as regular functions for the registry.
  //
  // esbuild output looks like:
  // ```
  // // ... bundled deps ...
  // async function init(args) { ... }
  // export { init, otherFn };
  // ```
  //
  // We need to:
  // 1. Remove the export statement
  // 2. Rename functions if namespace is provided

  // Remove ESM export statements
  code = code.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');

  // Remove ESM import statements (they'll be added once in the wrapper)
  // Handles: import * as fs from "fs/promises"; import { x } from "y";
  code = code.replace(/^import\s+.*?from\s+['"][^'"]+['"];?\s*$/gm, '');
  code = code.replace(/^import\s+['"][^'"]+['"];?\s*$/gm, ''); // import "side-effect";

  // Also remove any leading comments about the source file that esbuild adds
  // e.g., "// src/app/v3/map-codebase.runtime.ts"
  code = code.replace(/^\/\/\s+src\/.*\.ts\s*$/gm, '');

  // Extract function names from the export statement before removing it
  // (we already have them from ts-morph, but this is a backup)
  const exportedFunctions: string[] = [];
  const exportMatch = code.match(/export\s*\{\s*([^}]+)\s*\}/);
  if (exportMatch) {
    const exports = exportMatch[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
    exportedFunctions.push(...exports);
  }

  // If namespace provided, rename functions
  if (namespace) {
    // Build a map of old name -> new name
    const renameMap = new Map<string, string>();
    for (const fn of exportedFunctions) {
      renameMap.set(fn, `${namespace}_${fn}`);
    }

    // Rename function declarations
    for (const [oldName, newName] of renameMap) {
      // Match "async function name" or "function name"
      const fnDeclPattern = new RegExp(`((?:async\\s+)?function\\s+)${oldName}(\\s*\\()`, 'g');
      code = code.replace(fnDeclPattern, `$1${newName}$2`);

      // Rename calls to other functions in this module
      // Be careful not to rename method calls (obj.name) or property access
      const fnCallPattern = new RegExp(`(?<![.\\w])\\b${oldName}(\\s*\\()`, 'g');
      code = code.replace(fnCallPattern, `${newName}$1`);
    }

    // Update exportedFunctions with new names
    exportedFunctions.length = 0;
    for (const [, newName] of renameMap) {
      exportedFunctions.push(newName);
    }
  }

  return {
    code: code.trim(),
    exportedFunctions,
    sourcePath: runtimeFilePath,
    warnings,
  };
}

// ============================================================================
// Runtime Merging
// ============================================================================

/**
 * Merge multiple bundled runtimes into a single runtime.js
 */
export function mergeAndWrapRuntimes(bundledRuntimes: BundledRuntime[]): MergedRuntimeResult {
  const allFunctions: string[] = [];
  const allWarnings: string[] = [];
  const codeBlocks: string[] = [];

  for (const runtime of bundledRuntimes) {
    allFunctions.push(...runtime.exportedFunctions);
    allWarnings.push(...runtime.warnings);
    codeBlocks.push(runtime.code);
  }

  // Generate the final runtime.js with CLI wrapper
  const content = `#!/usr/bin/env node
/**
 * V3 Runtime - Bundled functions for Claude Code execution
 * Generated by react-agentic (esbuild bundler)
 *
 * Usage: node runtime.js <functionName> '<jsonArgs>'
 */

// ============================================================================
// Imports (Node.js built-ins)
// ============================================================================

import * as fs from 'fs/promises';
import * as path from 'path';

// ============================================================================
// Bundled Runtime Code
// ============================================================================

${codeBlocks.join('\n\n// ----------------------------------------------------------------------------\n\n')}

// ============================================================================
// Function Registry
// ============================================================================

const registry = {
${allFunctions.map(n => `  ${n},`).join('\n')}
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
`;

  return {
    content,
    functions: allFunctions,
    warnings: allWarnings,
  };
}

// ============================================================================
// Single-Entry Bundling (New Approach)
// ============================================================================

/**
 * Generate a TypeScript entry point that imports all runtime modules
 *
 * Creates content like:
 * ```typescript
 * import * as mapCodebase from '../src/app/v3/map-codebase.runtime.js';
 * import * as planPhase from '../src/app/v3/plan-phase.runtime.js';
 *
 * export const registry = {
 *   mapCodebase_init: mapCodebase.init,
 *   planPhase_init: planPhase.init,
 * };
 * ```
 */
export function generateRuntimeEntryPoint(
  runtimeFiles: RuntimeFileInfo[],
  entryDir: string
): { content: string; functions: string[] } {
  const imports: string[] = [];
  const registryEntries: string[] = [];
  const allFunctions: string[] = [];

  for (const file of runtimeFiles) {
    const { sourcePath, namespace, exportedFunctions } = file;

    // Calculate relative path from entry dir to source file
    // Entry will be in entryDir, source is absolute path
    let relativePath = path.relative(entryDir, sourcePath);

    // Convert to .js extension for ESM imports
    relativePath = relativePath.replace(/\.ts$/, '.js');

    // Ensure path starts with ./ or ../
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }

    // Add import statement
    imports.push(`import * as ${namespace} from '${relativePath}';`);

    // Add registry entries for each exported function
    for (const fn of exportedFunctions) {
      const qualifiedName = `${namespace}_${fn}`;
      registryEntries.push(`  ${qualifiedName}: ${namespace}.${fn},`);
      allFunctions.push(qualifiedName);
    }
  }

  const content = `/**
 * Runtime Entry Point - Generated by react-agentic
 * DO NOT EDIT - This file is auto-generated
 */

${imports.join('\n')}

export const registry = {
${registryEntries.join('\n')}
};
`;

  return { content, functions: allFunctions };
}

/**
 * Wrap bundled code with CLI entry point
 */
export function wrapWithCLI(bundledCode: string): string {
  return `#!/usr/bin/env node
/**
 * V3 Runtime - Bundled functions for Claude Code execution
 * Generated by react-agentic (single-entry esbuild bundler)
 *
 * Usage: node runtime.js <functionName> '<jsonArgs>'
 */

${bundledCode}

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
`;
}

/**
 * Bundle all runtime files using a single entry point
 *
 * This approach:
 * 1. Generates a TypeScript entry file that imports all runtime modules
 * 2. Bundles with esbuild (deduplicates shared code automatically)
 * 3. Wraps with CLI entry point
 * 4. Cleans up temporary files
 */
export async function bundleSingleEntryRuntime(
  options: SingleEntryBundleOptions
): Promise<SingleEntryBundleResult> {
  const { runtimeFiles, outputPath, entryDir = '.generated', minify = false } = options;
  const warnings: string[] = [];

  if (runtimeFiles.length === 0) {
    return { content: '', functions: [], warnings: [] };
  }

  // Ensure entry directory exists
  const entryDirPath = path.resolve(entryDir);
  await mkdir(entryDirPath, { recursive: true });

  // Generate entry point content
  const entryPath = path.join(entryDirPath, '_runtime_entry.ts');
  const { content: entryContent, functions } = generateRuntimeEntryPoint(
    runtimeFiles,
    entryDirPath
  );

  // Write temporary entry file
  await writeFile(entryPath, entryContent, 'utf-8');

  try {
    // Bundle with esbuild
    const result = await esbuild.build({
      entryPoints: [entryPath],
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      // Keep node built-ins external
      external: ['fs', 'fs/promises', 'path', 'node:fs', 'node:path'],
      target: 'node18',
      minify,
      keepNames: !minify,  // Keep names unless minifying
      treeShaking: true,
    });

    // Collect warnings
    if (result.errors.length > 0) {
      for (const error of result.errors) {
        warnings.push(`esbuild error: ${error.text}`);
      }
    }
    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        warnings.push(`esbuild warning: ${warning.text}`);
      }
    }

    let bundledCode = result.outputFiles?.[0]?.text || '';

    // esbuild outputs with ESM exports. We need to ensure registry is available.
    // The bundled code should already have `export { registry }` or similar.
    // We just need to make registry accessible for CLI usage.

    // Handle the ESM export - when minified, the registry variable might be renamed
    // e.g., "export { a as registry };" where 'a' is the actual variable
    //
    // We need to:
    // 1. Find the export statement
    // 2. Extract the actual variable name (might be different from 'registry' when minified)
    // 3. Either remove the export (if var is already named 'registry')
    //    or add an alias (if var was renamed)

    // Match export statements like: export { registry }, export { a as registry }, export{a as registry};
    const exportMatch = bundledCode.match(/export\s*\{\s*(\w+)(?:\s+as\s+registry)?\s*\};?\s*$/m);
    if (exportMatch) {
      const actualVarName = exportMatch[1];
      // Remove the export statement
      bundledCode = bundledCode.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');

      // If the variable was renamed (not 'registry'), add an alias
      if (actualVarName !== 'registry') {
        bundledCode = bundledCode.trim() + `\nconst registry = ${actualVarName};`;
      }
    } else {
      // Fallback: just remove any export statement
      bundledCode = bundledCode.replace(/^export\s*\{[^}]*\};?\s*$/gm, '');
    }

    // Wrap with CLI entry point
    const finalContent = wrapWithCLI(bundledCode);

    return {
      content: finalContent,
      functions,
      warnings,
    };
  } finally {
    // Cleanup temporary entry file
    try {
      await rm(entryPath);
      // Try to remove entry dir if empty
      await rm(entryDirPath, { recursive: false }).catch(() => {
        // Ignore - directory not empty or doesn't exist
      });
    } catch {
      // Ignore cleanup errors
    }
  }
}

// ============================================================================
// Code-Split Bundling
// ============================================================================

/**
 * Generate a TypeScript entry point for a single namespace
 *
 * Creates content like:
 * ```typescript
 * export { init, buildMapperPrompt } from '../src/app/v3/map-codebase.runtime.js';
 * ```
 */
export function generateNamespaceEntry(
  file: RuntimeFileInfo,
  entryDir: string
): string {
  const { sourcePath, exportedFunctions } = file;

  // Calculate relative path from entry dir to source file
  let relativePath = path.relative(entryDir, sourcePath);

  // Convert to .js extension for ESM imports
  relativePath = relativePath.replace(/\.ts$/, '.js');

  // Ensure path starts with ./ or ../
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }

  // Generate re-export statement
  const exports = exportedFunctions.join(', ');
  return `/**
 * Namespace Entry Point - Generated by react-agentic
 * DO NOT EDIT - This file is auto-generated
 */

export { ${exports} } from '${relativePath}';
`;
}

/**
 * Generate the CLI dispatcher for code-split bundles
 *
 * The dispatcher is a small CLI wrapper that loads modules on-demand
 * based on the namespace prefix in the function name.
 */
export function generateDispatcher(namespaces: string[]): string {
  const moduleList = namespaces.map(n => `'${n}'`).join(', ');

  return `#!/usr/bin/env node
/**
 * V3 Runtime Dispatcher
 * Loads modules on-demand for fast startup
 * Generated by react-agentic (code-split bundler)
 *
 * Usage: node runtime.js <namespace_function> '<jsonArgs>'
 */

const [,, fnName, argsJson] = process.argv;

if (!fnName) {
  console.error('Usage: node runtime.js <namespace_function> <jsonArgs>');
  console.error('Run with --list to see available namespaces');
  process.exit(1);
}

if (fnName === '--list') {
  const modules = [${moduleList}];
  console.log('Available namespaces:', modules.join(', '));
  process.exit(0);
}

const underscoreIdx = fnName.indexOf('_');
if (underscoreIdx === -1) {
  console.error('Invalid format. Use: namespace_functionName');
  console.error('Example: planPhase_init');
  process.exit(1);
}

const namespace = fnName.slice(0, underscoreIdx);
const fn = fnName.slice(underscoreIdx + 1);

try {
  const mod = await import(\`./$\{namespace}.js\`);
  if (typeof mod[fn] !== 'function') {
    console.error(\`Function not found: $\{fn} in $\{namespace}\`);
    console.error('Available functions:', Object.keys(mod).filter(k => typeof mod[k] === 'function').join(', '));
    process.exit(1);
  }

  const args = argsJson ? JSON.parse(argsJson) : {};
  const result = await mod[fn](args);
  console.log(JSON.stringify(result));
} catch (e) {
  if (e.code === 'ERR_MODULE_NOT_FOUND') {
    console.error(\`Unknown namespace: $\{namespace}\`);
    console.error('Available namespaces: ${namespaces.join(', ')}');
  } else {
    console.error(\`Error: $\{e.message}\`);
  }
  process.exit(1);
}
`;
}

/**
 * Bundle all runtime files using code-split approach
 *
 * This approach:
 * 1. Generates a TypeScript entry file for each namespace
 * 2. Bundles each namespace separately with esbuild (in parallel)
 * 3. Generates a small dispatcher that loads modules on-demand
 * 4. Cleans up temporary files
 *
 * Benefits:
 * - Faster startup (only loads dispatcher, ~2KB)
 * - Modules loaded on-demand when function is called
 * - Each module independently tree-shaken
 */
export async function bundleCodeSplit(
  options: CodeSplitBundleOptions
): Promise<CodeSplitBundleResult> {
  const { runtimeFiles, outputDir, entryDir = '.generated', minify = false } = options;
  const warnings: string[] = [];
  const moduleContents = new Map<string, string>();
  const allFunctions: string[] = [];

  if (runtimeFiles.length === 0) {
    return {
      dispatcherContent: '',
      moduleContents,
      functions: [],
      warnings: [],
    };
  }

  // Ensure entry directory exists
  const entryDirPath = path.resolve(entryDir);
  await mkdir(entryDirPath, { recursive: true });

  // Track entry files for cleanup
  const entryFiles: string[] = [];

  try {
    // Generate entry points for each namespace
    const bundlePromises = runtimeFiles.map(async (file) => {
      const { namespace, exportedFunctions } = file;

      // Track functions with namespace prefix
      for (const fn of exportedFunctions) {
        allFunctions.push(`${namespace}_${fn}`);
      }

      // Generate entry point content
      const entryContent = generateNamespaceEntry(file, entryDirPath);
      const entryPath = path.join(entryDirPath, `_${namespace}_entry.ts`);
      entryFiles.push(entryPath);

      // Write temporary entry file
      await writeFile(entryPath, entryContent, 'utf-8');

      // Bundle with esbuild
      const result = await esbuild.build({
        entryPoints: [entryPath],
        bundle: true,
        platform: 'node',
        format: 'esm',
        write: false,
        external: ['fs', 'fs/promises', 'path', 'node:fs', 'node:path'],
        target: 'node18',
        minify,
        keepNames: !minify,
        treeShaking: true,
      });

      // Collect warnings
      if (result.errors.length > 0) {
        for (const error of result.errors) {
          warnings.push(`esbuild error (${namespace}): ${error.text}`);
        }
      }
      if (result.warnings.length > 0) {
        for (const warning of result.warnings) {
          warnings.push(`esbuild warning (${namespace}): ${warning.text}`);
        }
      }

      const bundledCode = result.outputFiles?.[0]?.text || '';
      return { namespace, bundledCode };
    });

    // Wait for all bundles to complete (parallel)
    const bundleResults = await Promise.all(bundlePromises);

    // Collect results
    const namespaces: string[] = [];
    for (const { namespace, bundledCode } of bundleResults) {
      namespaces.push(namespace);
      moduleContents.set(namespace, bundledCode);
    }

    // Generate dispatcher
    const dispatcherContent = generateDispatcher(namespaces);

    return {
      dispatcherContent,
      moduleContents,
      functions: allFunctions,
      warnings,
    };
  } finally {
    // Cleanup temporary entry files
    for (const entryPath of entryFiles) {
      try {
        await rm(entryPath);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Try to remove entry dir if empty
    try {
      await rm(entryDirPath, { recursive: false });
    } catch {
      // Ignore - directory not empty or doesn't exist
    }
  }
}
