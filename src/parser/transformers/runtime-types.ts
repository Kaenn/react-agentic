/**
 * Runtime Transform Context and Types
 *
 * Transform context with runtime-specific tracking:
 * - Runtime variable declarations
 * - Runtime function usage
 * - Import paths for extraction
 */

import type { SourceFile, Node, JsxElement, JsxSelfClosingElement, JsxFragment } from 'ts-morph';
import type { RuntimeVarDeclNode, BlockNode } from '../../ir/index.js';

// ============================================================================
// Runtime Variable Info
// ============================================================================

/**
 * Information about a useRuntimeVar declaration
 */
export interface RuntimeVarInfo {
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
// Local Component Info
// ============================================================================

/**
 * Information about a local component definition
 *
 * Tracks PascalCase function components defined in the same file
 * or imported from external files for build-time inlining.
 */
export interface LocalComponentInfo {
  /** Component name (PascalCase) */
  name: string;
  /** The AST node of the declaration (VariableDeclaration or FunctionDeclaration) */
  declaration: Node;
  /** Names of props (from destructured params or single param name) */
  propNames: string[];
  /** Cached JSX returned by the component (filled on first expansion) */
  jsx?: JsxElement | JsxSelfClosingElement | JsxFragment;
  /** Source file path where component is defined (for external components) */
  sourceFilePath?: string;
  /** Whether this component is imported from an external file */
  isExternal?: boolean;
  /** Import path if imported (e.g., './components/banner') */
  importPath?: string;
}

// ============================================================================
// Runtime Transform Context
// ============================================================================

/**
 * Context for runtime transformers
 *
 * Tracks:
 * - RuntimeVar declarations (for type-safe references)
 * - RuntimeFn usage (for extraction to runtime.js)
 */
export interface RuntimeTransformContext {
  /** Source file being transformed */
  sourceFile: SourceFile | undefined;

  /** Namespace for runtime functions (derived from filename) */
  namespace: string;

  /** Visited paths for circular import detection */
  visitedPaths: Set<string>;

  /** Runtime variable declarations: identifier name -> info */
  runtimeVars: Map<string, RuntimeVarInfo>;

  /** Runtime function wrappers: wrapper name -> info */
  runtimeFunctions: Map<string, RuntimeFunctionInfo>;

  /** Runtime function imports: paths to extract from */
  runtimeImports: Set<string>;

  /** Create error with source location */
  createError: (message: string, node: Node) => Error;

  /** Track runtime function usage during transformation */
  usedRuntimeFunctions: Set<string>;

  /** Local component definitions: name -> info */
  localComponents: Map<string, LocalComponentInfo>;

  /** Component expansion stack for circular reference detection */
  componentExpansionStack: Set<string>;

  /** Current component props during expansion (for prop substitution) */
  componentProps: Map<string, unknown> | null;

  /** Current component children during expansion (for children substitution) */
  componentChildren: BlockNode[] | null;
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
 * Create a fresh runtime transform context
 *
 * @param sourceFile - Source file being transformed (optional)
 * @param namespace - Namespace for runtime functions (defaults to basename of sourceFile)
 */
export function createRuntimeContext(
  sourceFile?: SourceFile,
  namespace?: string
): RuntimeTransformContext {
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
    runtimeVars: new Map(),
    runtimeFunctions: new Map(),
    runtimeImports: new Set(),
    usedRuntimeFunctions: new Set(),
    localComponents: new Map(),
    componentExpansionStack: new Set(),
    componentProps: null,
    componentChildren: null,
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
 * Result of runtime transformation
 *
 * Contains the document node and metadata needed for dual emission.
 */
export interface RuntimeTransformResult {
  /** Transformed document */
  document: import('../../ir/index.js').DocumentNode;

  /** Runtime variable declarations (for markdown emission) */
  runtimeVars: RuntimeVarDeclNode[];

  /** Runtime function names used (for runtime.js extraction) */
  runtimeFunctions: string[];

  /** Import paths to extract functions from */
  runtimeImportPaths: string[];
}
