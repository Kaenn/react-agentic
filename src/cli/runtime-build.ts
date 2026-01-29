/**
 * Runtime Build Pipeline
 *
 * Transforms TSX files to dual output:
 * - COMMAND.md (markdown for Claude)
 * - runtime.js (bundled TypeScript functions via esbuild)
 */

import { SourceFile, Project, Node } from 'ts-morph';
import path from 'path';

// Runtime parser
import {
  createRuntimeContext,
  extractRuntimeVarDeclarations,
  extractRuntimeFnDeclarations,
  extractLocalComponentDeclarations,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
  transformRuntimeCommand,
} from '../parser/transformers/index.js';

// Runtime emitter
import {
  emitDocument,
  emitAgent,
  isRuntimeFile,
  // Esbuild bundler
  extractExportedFunctionNames,
  type RuntimeFileInfo,
} from '../emitter/index.js';

// V1 transformer for Agent support
import { transformAgent } from '../parser/transformers/document.js';
import type { TransformContext } from '../parser/transformers/types.js';

// IR
import type { DocumentNode, AgentDocumentNode } from '../ir/index.js';

// ============================================================================
// Types
// ============================================================================

// Re-export for build.ts compatibility (legacy)
import type { RuntimeEmitResult } from '../emitter/index.js';
export type { RuntimeEmitResult };

/**
 * V3 build result
 */
export interface RuntimeBuildResult {
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
export interface RuntimeBuildOptions {
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
 * Find the root JSX element in a runtime source file
 *
 * Looks for JSX in:
 * 1. export default <Command>...</Command>
 * 2. export default (<Command>...</Command>)
 * 3. Return statements within the file
 */
function findRuntimeRootElement(sourceFile: SourceFile): Node | null {
  let result: Node | null = null;

  // Pass 1: Look for export default (highest priority)
  sourceFile.forEachDescendant((node, traversal) => {
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
  });

  // If found via export default, return it
  if (result) return result;

  // Pass 2: Fall back to looking for return statements at module level
  // This is for files without export default
  sourceFile.forEachDescendant((node, traversal) => {
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
 * Get the root element tag name
 */
function getRootElementTagName(element: Node): string | null {
  if (Node.isJsxElement(element)) {
    return element.getOpeningElement().getTagNameNode().getText();
  } else if (Node.isJsxSelfClosingElement(element)) {
    return element.getTagNameNode().getText();
  }
  return null;
}

/**
 * Check if the root element is a Command
 */
function isRuntimeCommand(element: Node): boolean {
  const tagName = getRootElementTagName(element);
  return tagName === 'Command' || tagName === 'RuntimeCommand';
}

/**
 * Check if the root element is an Agent
 */
function isAgentElement(element: Node): boolean {
  const tagName = getRootElementTagName(element);
  return tagName === 'Agent';
}

/**
 * Check if the root element is a supported document type
 */
function isSupportedRootElement(element: Node): boolean {
  return isRuntimeCommand(element) || isAgentElement(element);
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
 * Build a Runtime file to markdown and runtime.js
 *
 * @param sourceFile - Source file to build
 * @param project - ts-morph project for resolution
 * @param options - Build options
 * @returns Build result with content and paths
 */
export async function buildRuntimeFile(
  sourceFile: SourceFile,
  project: Project,
  options: RuntimeBuildOptions
): Promise<RuntimeBuildResult> {
  const filePath = sourceFile.getFilePath();
  const basename = path.basename(filePath, '.tsx');
  const warnings: string[] = [];

  // Create Runtime transform context
  const ctx = createRuntimeContext(sourceFile);

  // Phase 1: Extract declarations
  extractRuntimeVarDeclarations(sourceFile, ctx);
  extractRuntimeFnDeclarations(sourceFile, ctx);
  extractLocalComponentDeclarations(sourceFile, ctx);

  // Phase 2: Find root element
  const rootElement = findRuntimeRootElement(sourceFile);
  if (!rootElement) {
    throw new Error(`No JSX element found in ${filePath}`);
  }

  if (!isSupportedRootElement(rootElement)) {
    throw new Error(`File must have <Command> or <Agent> as root element`);
  }

  // Phase 3: Transform to IR
  if (!Node.isJsxElement(rootElement) && !Node.isJsxSelfClosingElement(rootElement)) {
    throw new Error('Root element must be JSX');
  }

  // Check if this is an Agent or Command
  const isAgent = isAgentElement(rootElement);
  let markdown: string;
  let document: DocumentNode | null = null;
  let agentDocument: AgentDocumentNode | null = null;

  if (isAgent) {
    // Transform Agent element using V1 transformer
    const agentCtx: TransformContext = {
      sourceFile,
      visitedPaths: new Set(),
      variables: new Map(),
      outputs: new Map(),
      stateRefs: new Map(),
      renderPropsContext: undefined,
      createError: (message: string, node: Node) => new Error(`${message} at ${node.getStartLineNumber()}`),
    };
    agentDocument = transformAgent(rootElement, agentCtx);
    markdown = emitAgent(agentDocument);
  } else {
    // Transform Command element
    document = transformRuntimeCommand(rootElement, ctx);
    markdown = emitDocument(document);
  }

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

  // Extract folder from metadata (if present) - only for Command documents
  const folder = document?.metadata?.folder;

  // Determine output paths (with optional folder subdirectory)
  const markdownPath = folder
    ? path.join(options.commandsOut, folder, `${basename}.md`)
    : path.join(options.commandsOut, `${basename}.md`);
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
 * Check if a source file is a runtime file
 *
 * Uses import detection to determine if file uses runtime features.
 */
export function detectRuntime(sourceFile: SourceFile): boolean {
  return isRuntimeFile(sourceFile);
}

/**
 * Quick check for runtime markers in file content
 *
 * Faster than full parse - checks for import patterns.
 */
export function hasRuntimeImports(content: string): boolean {
  return (
    content.includes('useRuntimeVar') ||
    content.includes('runtimeFn') ||
    content.includes('from \'react-agentic/v3\'') ||
    content.includes('from "react-agentic/v3"')
  );
}
