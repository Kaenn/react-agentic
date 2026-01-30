/**
 * Runtime Function Transformer
 *
 * Extracts runtimeFn(fn) declarations from source files.
 * Tracks wrapper names and import paths for runtime.js extraction.
 */

import { Node, SourceFile } from 'ts-morph';
import type { RuntimeFunctionInfo, RuntimeTransformContext } from './runtime-types.js';

// ============================================================================
// Extraction
// ============================================================================

/**
 * Extract all runtimeFn declarations from a source file
 *
 * Searches for patterns like:
 * - const Init = runtimeFn(initFunction)
 * - const GetContext = runtimeFn(getContext)
 *
 * Also tracks imports of the wrapped functions for extraction.
 *
 * @param sourceFile - Source file to scan
 * @param ctx - Transform context to populate
 */
export function extractRuntimeFnDeclarations(
  sourceFile: SourceFile,
  ctx: RuntimeTransformContext
): void {
  // First, build a map of imports: local name -> import path
  const importMap = new Map<string, { path: string; isDefault: boolean }>();

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    // Default import
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      importMap.set(defaultImport.getText(), {
        path: moduleSpecifier,
        isDefault: true,
      });
    }

    // Named imports
    for (const namedImport of importDecl.getNamedImports()) {
      const localName = namedImport.getAliasNode()?.getText() ?? namedImport.getName();
      importMap.set(localName, {
        path: moduleSpecifier,
        isDefault: false,
      });
    }
  }

  // Find all runtimeFn wrapper declarations
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const init = node.getInitializer();
    if (!init || !Node.isCallExpression(init)) return;

    // Check if it's a runtimeFn call
    const expr = init.getExpression();
    if (!Node.isIdentifier(expr) || expr.getText() !== 'runtimeFn') return;

    // Get the wrapped function (first arg)
    const args = init.getArguments();
    if (args.length < 1) {
      throw ctx.createError(
        'runtimeFn requires a function argument',
        init
      );
    }

    const fnArg = args[0];
    if (!Node.isIdentifier(fnArg)) {
      throw ctx.createError(
        'runtimeFn argument must be a function identifier',
        fnArg
      );
    }

    const fnName = fnArg.getText();
    const wrapperName = node.getName();

    // Check if function is imported
    const importInfo = importMap.get(fnName);

    const info: RuntimeFunctionInfo = {
      fnName,
      wrapperName,
      sourceFilePath: sourceFile.getFilePath(),
      isImported: !!importInfo,
      importPath: importInfo?.path,
    };

    // Check for duplicate wrapper name
    if (ctx.runtimeFunctions.has(wrapperName)) {
      throw ctx.createError(
        `Duplicate runtime function wrapper: ${wrapperName}`,
        node
      );
    }

    ctx.runtimeFunctions.set(wrapperName, info);

    // Track import path for extraction
    if (importInfo) {
      ctx.runtimeImports.add(importInfo.path);
    }
  });
}

/**
 * Get runtime function names from context
 *
 * Returns the list of function names (not wrapper names) that need
 * to be extracted to runtime.js.
 */
export function getRuntimeFunctionNames(ctx: RuntimeTransformContext): string[] {
  return Array.from(ctx.usedRuntimeFunctions);
}

/**
 * Get runtime import paths from context
 *
 * Returns paths that need to be parsed for function extraction.
 */
export function getRuntimeImportPaths(ctx: RuntimeTransformContext): string[] {
  return Array.from(ctx.runtimeImports);
}

// ============================================================================
// Resolution
// ============================================================================

/**
 * Resolve a wrapper name to its runtime function info
 *
 * @param wrapperName - The wrapper identifier (e.g., 'Init')
 * @param ctx - Transform context
 * @returns RuntimeFunctionInfo if found
 */
export function resolveRuntimeFn(
  wrapperName: string,
  ctx: RuntimeTransformContext
): RuntimeFunctionInfo | undefined {
  return ctx.runtimeFunctions.get(wrapperName);
}

/**
 * Check if an identifier is a RuntimeFn wrapper
 */
export function isRuntimeFnWrapper(
  identifierName: string,
  ctx: RuntimeTransformContext
): boolean {
  return ctx.runtimeFunctions.has(identifierName);
}

/**
 * Mark a runtime function as used
 *
 * Called when transforming a .Call invocation.
 * Only used functions get extracted to runtime.js.
 */
export function markRuntimeFnUsed(
  wrapperName: string,
  ctx: RuntimeTransformContext
): void {
  const info = ctx.runtimeFunctions.get(wrapperName);
  if (info) {
    ctx.usedRuntimeFunctions.add(info.fnName);
  }
}
