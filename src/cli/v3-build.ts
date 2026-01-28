/**
 * V3 Build Pipeline
 *
 * Transforms V3 TSX files to dual output:
 * - COMMAND.md (markdown for Claude)
 * - runtime.js (bundled TypeScript functions via esbuild)
 */

import { SourceFile, Project, Node } from 'ts-morph';
import path from 'path';

// V3 parser
import {
  createV3Context,
  extractRuntimeVarDeclarations,
  extractRuntimeFnDeclarations,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
  transformV3Command,
} from '../parser/transformers/index.js';

// V3 emitter
import {
  emitV3,
  isV3File,
  // Esbuild bundler
  extractExportedFunctionNames,
  type RuntimeFileInfo,
} from '../emitter/index.js';

// V3 IR
import type { DocumentNode } from '../ir/index.js';

// ============================================================================
// Types
// ============================================================================

// Re-export for build.ts compatibility (legacy)
import type { RuntimeEmitResult } from '../emitter/index.js';
export type { RuntimeEmitResult };

/**
 * V3 build result
 */
export interface V3BuildResult {
  /** Generated markdown content */
  markdown: string;
  /** Generated runtime.js content (empty - bundling happens at end) */
  runtime: string;
  /** Full runtime result for merging (null if no runtime functions) - LEGACY */
  runtimeResult: RuntimeEmitResult | null;
  /** Runtime file info for single-entry bundling (null if no runtime functions) */
  runtimeFileInfo: RuntimeFileInfo | null;
  /** Path where markdown should be written */
  markdownPath: string;
  /** Path where runtime should be written */
  runtimePath: string;
  /** List of runtime functions extracted (without namespace prefix) */
  runtimeFunctions: string[];
  /** Any warnings during build */
  warnings: string[];
}

/**
 * V3 build options
 */
export interface V3BuildOptions {
  /** Output directory for commands */
  commandsOut: string;
  /** Output directory for runtime */
  runtimeOut: string;
  /** Dry run - don't write files */
  dryRun?: boolean;
}

// ============================================================================
// Root Element Detection
// ============================================================================

/**
 * Unwrap parenthesized expressions to find inner JSX
 */
function unwrapParens(node: Node): Node {
  if (Node.isParenthesizedExpression(node)) {
    return unwrapParens(node.getExpression());
  }
  return node;
}

/**
 * Find the root JSX element in a V3 source file
 *
 * Looks for JSX in:
 * 1. export default <Command>...</Command>
 * 2. export default (<Command>...</Command>)
 * 3. Return statements within the file
 */
function findV3RootElement(sourceFile: SourceFile): Node | null {
  let result: Node | null = null;

  // Use forEachDescendant to find JSX anywhere in file
  sourceFile.forEachDescendant((node, traversal) => {
    // Check export assignments: export default ...
    if (Node.isExportAssignment(node)) {
      const expr = node.getExpression();
      if (expr) {
        const unwrapped = unwrapParens(expr);
        if (Node.isJsxElement(unwrapped) || Node.isJsxSelfClosingElement(unwrapped)) {
          result = unwrapped;
          traversal.stop();
          return;
        }
      }
    }

    // Check return statements
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (expr) {
        const unwrapped = unwrapParens(expr);
        if (Node.isJsxElement(unwrapped) || Node.isJsxSelfClosingElement(unwrapped)) {
          result = unwrapped;
          traversal.stop();
          return;
        }
      }
    }
  });

  return result;
}

/**
 * Check if the root element is a V3 Command
 */
function isV3Command(element: Node): boolean {
  let tagName: string | null = null;

  if (Node.isJsxElement(element)) {
    tagName = element.getOpeningElement().getTagNameNode().getText();
  } else if (Node.isJsxSelfClosingElement(element)) {
    tagName = element.getTagNameNode().getText();
  }

  return tagName === 'Command' || tagName === 'V3Command';
}

// ============================================================================
// Build Pipeline
// ============================================================================

/**
 * Resolve runtime file path from import path
 */
function resolveRuntimePath(tsxFilePath: string, importPath: string): string {
  const tsxDir = path.dirname(tsxFilePath);
  let resolved = path.resolve(tsxDir, importPath);

  // Convert .js extension to .ts for TypeScript source
  if (resolved.endsWith('.js')) {
    resolved = resolved.replace(/\.js$/, '.ts');
  } else if (!resolved.endsWith('.ts')) {
    resolved += '.ts';
  }

  return resolved;
}

/**
 * Build a V3 file to markdown and runtime.js
 *
 * @param sourceFile - Source file to build
 * @param project - ts-morph project for resolution
 * @param options - Build options
 * @returns Build result with content and paths
 */
export async function buildV3File(
  sourceFile: SourceFile,
  project: Project,
  options: V3BuildOptions
): Promise<V3BuildResult> {
  const filePath = sourceFile.getFilePath();
  const basename = path.basename(filePath, '.tsx');
  const warnings: string[] = [];

  // Create V3 transform context
  const ctx = createV3Context(sourceFile);

  // Phase 1: Extract declarations
  extractRuntimeVarDeclarations(sourceFile, ctx);
  extractRuntimeFnDeclarations(sourceFile, ctx);

  // Phase 2: Find root element
  const rootElement = findV3RootElement(sourceFile);
  if (!rootElement) {
    throw new Error(`No JSX element found in ${filePath}`);
  }

  if (!isV3Command(rootElement)) {
    throw new Error(`V3 file must have <Command> as root element`);
  }

  // Phase 3: Transform to V3 IR
  if (!Node.isJsxElement(rootElement) && !Node.isJsxSelfClosingElement(rootElement)) {
    throw new Error('Root element must be JSX');
  }

  const document = transformV3Command(rootElement, ctx);

  // Phase 4: Emit markdown
  const markdown = emitV3(document);

  // Phase 5: Extract runtime info (bundling happens at the end for all files)
  const runtimeFunctionNames = getRuntimeFunctionNames(ctx);
  const runtimeImportPaths = getRuntimeImportPaths(ctx);

  let runtimeFileInfo: RuntimeFileInfo | null = null;

  if (runtimeFunctionNames.length > 0 && runtimeImportPaths.length > 0) {
    // Resolve the first runtime import path (typically the .runtime.ts file)
    const runtimeFilePath = resolveRuntimePath(filePath, runtimeImportPaths[0]);

    try {
      // Parse the runtime file to extract exported functions
      const runtimeSourceFile = project.addSourceFileAtPath(runtimeFilePath);
      const exportedFunctions = extractExportedFunctionNames(runtimeSourceFile);

      runtimeFileInfo = {
        sourcePath: runtimeFilePath,
        namespace: ctx.namespace!,
        exportedFunctions,
      };
    } catch (e) {
      warnings.push(`Failed to parse runtime file: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Determine output paths
  const markdownPath = path.join(options.commandsOut, `${basename}.md`);
  const runtimePath = path.join(options.runtimeOut, 'runtime.js');

  return {
    markdown,
    runtime: '', // Bundling happens at the end
    runtimeResult: null, // Legacy field, no longer used
    runtimeFileInfo,
    markdownPath,
    runtimePath,
    runtimeFunctions: runtimeFunctionNames,
    warnings,
  };
}

/**
 * Check if a source file is a V3 file
 *
 * Uses import detection to determine if file uses V3 features.
 */
export function detectV3(sourceFile: SourceFile): boolean {
  return isV3File(sourceFile);
}

/**
 * Quick check for V3 markers in file content
 *
 * Faster than full parse - checks for import patterns.
 */
export function hasV3Imports(content: string): boolean {
  return (
    content.includes('useRuntimeVar') ||
    content.includes('runtimeFn') ||
    content.includes('from \'react-agentic/v3\'') ||
    content.includes('from "react-agentic/v3"')
  );
}
