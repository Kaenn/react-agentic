/**
 * V3 Transform Context and Types
 *
 * Extends the v1 TransformContext with V3-specific tracking:
 * - Script variable declarations
 * - Runtime function usage
 * - Import paths for extraction
 */

import type { SourceFile, Node } from 'ts-morph';
import type { ScriptVarDeclNode } from '../../ir/index.js';

// ============================================================================
// Script Variable Info
// ============================================================================

/**
 * Information about a useRuntimeVar declaration
 */
export interface ScriptVarInfo {
  /** Variable name (shell variable) */
  varName: string;
  /** TypeScript identifier name in source */
  identifierName: string;
  /** TypeScript type argument (if provided) */
  tsType?: string;
  /** Source location for error messages */
  location: {
    line: number;
    column: number;
  };
}

// ============================================================================
// Runtime Function Info
// ============================================================================

/**
 * Information about a runtimeFn declaration
 */
export interface RuntimeFunctionInfo {
  /** Function name */
  fnName: string;
  /** Identifier name of the wrapper (e.g., 'Init' from 'const Init = runtimeFn(init)') */
  wrapperName: string;
  /** Source file path where function is defined */
  sourceFilePath: string;
  /** Whether the function is imported vs defined locally */
  isImported: boolean;
  /** Import path if imported (e.g., './runtime/init') */
  importPath?: string;
}

// ============================================================================
// V3 Transform Context
// ============================================================================

/**
 * Context for V3 transformers
 *
 * Extends the v1 context with V3-specific tracking.
 * Unlike v1 which tracks shell variables, V3 tracks:
 * - ScriptVar declarations (for type-safe references)
 * - RuntimeFn usage (for extraction to runtime.js)
 */
export interface V3TransformContext {
  /** Source file being transformed */
  sourceFile: SourceFile | undefined;

  /** Namespace for runtime functions (derived from filename) */
  namespace: string;

  /** Visited paths for circular import detection */
  visitedPaths: Set<string>;

  /** Script variable declarations: identifier name -> info */
  scriptVars: Map<string, ScriptVarInfo>;

  /** Runtime function wrappers: wrapper name -> info */
  runtimeFunctions: Map<string, RuntimeFunctionInfo>;

  /** Runtime function imports: paths to extract from */
  runtimeImports: Set<string>;

  /** Create error with source location */
  createError: (message: string, node: Node) => Error;

  /** Track runtime function usage during transformation */
  usedRuntimeFunctions: Set<string>;
}

// ============================================================================
// Context Creation
// ============================================================================

/**
 * Convert kebab-case or snake_case to camelCase
 * @example 'plan-phase' -> 'planPhase'
 * @example 'test_v3' -> 'testV3'
 */
function toCamelCase(str: string): string {
  return str.replace(/[-_]([a-z0-9])/gi, (_, char) => char.toUpperCase());
}

/**
 * Create a fresh V3 transform context
 *
 * @param sourceFile - Source file being transformed (optional)
 * @param namespace - Namespace for runtime functions (defaults to basename of sourceFile)
 */
export function createV3Context(
  sourceFile?: SourceFile,
  namespace?: string
): V3TransformContext {
  // Derive namespace from source file if not provided
  let ns = namespace ?? '';
  if (!ns && sourceFile) {
    const filePath = sourceFile.getFilePath();
    const basename = filePath.split('/').pop()?.replace(/\.tsx?$/, '') ?? '';
    ns = toCamelCase(basename);
  }

  return {
    sourceFile,
    namespace: ns,
    visitedPaths: new Set(),
    scriptVars: new Map(),
    runtimeFunctions: new Map(),
    runtimeImports: new Set(),
    usedRuntimeFunctions: new Set(),
    createError: (message: string, node: Node) => {
      const startLine = node.getStartLineNumber();
      const file = node.getSourceFile().getFilePath();
      return new Error(`${message}\n  at ${file}:${startLine}`);
    },
  };
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of V3 transformation
 *
 * Contains the document node and metadata needed for dual emission.
 */
export interface V3TransformResult {
  /** Transformed V3 document */
  document: import('../../ir/index.js').V3DocumentNode;

  /** Script variable declarations (for markdown emission) */
  scriptVars: ScriptVarDeclNode[];

  /** Runtime function names used (for runtime.js extraction) */
  runtimeFunctions: string[];

  /** Import paths to extract functions from */
  runtimeImportPaths: string[];
}
