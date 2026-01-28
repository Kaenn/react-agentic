/**
 * V3 Build Pipeline
 *
 * Transforms V3 TSX files to dual output:
 * - COMMAND.md (markdown for Claude)
 * - runtime.js (extracted TypeScript functions)
 */

import { SourceFile, Project, Node } from 'ts-morph';
import path from 'path';

// V3 parser
import {
  createV3Context,
  extractScriptVarDeclarations,
  extractRuntimeFnDeclarations,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
  transformV3Command,
} from '../parser/transformers/index.js';

// V3 emitter
import { emitV3, emitRuntime, isV3File } from '../emitter/index.js';

// V3 IR
import type { V3DocumentNode } from '../ir/index.js';

// ============================================================================
// Types
// ============================================================================

// Import RuntimeEmitResult type
import type { RuntimeEmitResult } from '../emitter/index.js';

/**
 * V3 build result
 */
export interface V3BuildResult {
  /** Generated markdown content */
  markdown: string;
  /** Generated runtime.js content (empty if no runtime functions) */
  runtime: string;
  /** Full runtime result for merging (null if no runtime functions) */
  runtimeResult: RuntimeEmitResult | null;
  /** Path where markdown should be written */
  markdownPath: string;
  /** Path where runtime should be written */
  runtimePath: string;
  /** List of runtime functions extracted */
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
 * Build a V3 file to markdown and runtime.js
 *
 * @param sourceFile - Source file to build
 * @param project - ts-morph project for resolution
 * @param options - Build options
 * @returns Build result with content and paths
 */
export function buildV3File(
  sourceFile: SourceFile,
  project: Project,
  options: V3BuildOptions
): V3BuildResult {
  const filePath = sourceFile.getFilePath();
  const basename = path.basename(filePath, '.tsx');
  const warnings: string[] = [];

  // Create V3 transform context
  const ctx = createV3Context(sourceFile);

  // Phase 1: Extract declarations
  extractScriptVarDeclarations(sourceFile, ctx);
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

  // Phase 5: Emit runtime (if any runtime functions used)
  const runtimeFunctionNames = getRuntimeFunctionNames(ctx);
  const runtimeImportPaths = getRuntimeImportPaths(ctx);

  let runtime = '';
  let runtimeResultData: RuntimeEmitResult | null = null;
  if (runtimeFunctionNames.length > 0) {
    runtimeResultData = emitRuntime(
      project,
      filePath,
      runtimeFunctionNames,
      runtimeImportPaths,
      ctx.namespace // Pass namespace for function prefixing
    );
    runtime = runtimeResultData.content;
    warnings.push(...runtimeResultData.warnings);
  }

  // Determine output paths
  const markdownPath = path.join(options.commandsOut, `${basename}.md`);
  const runtimePath = path.join(options.runtimeOut, 'runtime.js');

  return {
    markdown,
    runtime,
    runtimeResult: runtimeResultData,
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
    content.includes('useScriptVar') ||
    content.includes('runtimeFn') ||
    content.includes('from \'react-agentic/v3\'') ||
    content.includes('from "react-agentic/v3"')
  );
}
