/**
 * Shared types for transformer modules
 *
 * Unified TransformContext supports both V1 (static) and V3 (runtime) paths.
 * V3-specific fields are optional — absent for Agent/Skill/State documents.
 */

import type { SourceFile, Node, Expression } from 'ts-morph';
import type { ExtractedVariable } from '../parser.js';
import type { BlockNode } from '../../ir/index.js';
import type { RuntimeVarInfo, RuntimeFunctionInfo, LocalComponentInfo } from './runtime-types.js';

/**
 * Context values available for render props interpolation
 */
export interface RenderPropsContext {
  /** Parameter name used in arrow function (e.g., 'ctx') */
  paramName: string;
  /** Context values that can be interpolated */
  values: Record<string, string>;
}

/**
 * Function signature for transformBlockChildren
 * Allows document transformers to work in both V1 (Transformer class) and V3 (runtime) contexts
 */
export type TransformBlockChildrenFn = (children: Node[], ctx: TransformContext) => BlockNode[];

/**
 * Unified transform context passed to all transformer functions.
 * V3-specific fields are optional — absent for Agent/Skill/State documents.
 */
export interface TransformContext {
  // === Shared ===

  /** Source file for component resolution (optional - only needed for composition) */
  sourceFile: SourceFile | undefined;
  /** Visited paths for circular import detection */
  visitedPaths: Set<string>;
  /** Create error with source location */
  createError: (message: string, node: Node) => Error;

  // === V1-specific ===

  /** Extracted useVariable declarations from source file */
  variables: Map<string, ExtractedVariable>;
  /** Extracted useOutput declarations: identifier name -> agent name */
  outputs: Map<string, string>;
  /** Extracted useStateRef declarations: identifier name -> state key */
  stateRefs: Map<string, string>;
  /** Current render props context for interpolation */
  renderPropsContext: RenderPropsContext | undefined;
  /**
   * Optional transformBlockChildren function for V1 context delegation.
   * When provided, document transformers use this instead of the dispatch.js import.
   */
  transformBlockChildren?: TransformBlockChildrenFn;
  /** Workflow team context for child components (ShutdownSequence) */
  workflowTeam?: {
    teamId: string;
    teamName: string;
  };

  // === Shared (component composition) ===

  /** Props for current component substitution during composition */
  componentProps?: Map<string, unknown> | null;
  /** Children blocks for {children} substitution during composition */
  componentChildren?: BlockNode[] | null;
  /** Local component declarations for composition */
  localComponents?: Map<string, LocalComponentInfo>;
  /** Component expansion stack for circular reference detection */
  componentExpansionStack?: Set<string>;

  // === V3-specific (optional — absent for Agent/Skill/State docs) ===

  /** Namespace for runtime functions (derived from filename) */
  namespace?: string;
  /** Runtime variable declarations: identifier name -> info */
  runtimeVars?: Map<string, RuntimeVarInfo>;
  /** Runtime function wrappers: wrapper name -> info */
  runtimeFunctions?: Map<string, RuntimeFunctionInfo>;
  /** Runtime function imports: paths to extract from */
  runtimeImports?: Set<string>;
  /** Track runtime function usage during transformation */
  usedRuntimeFunctions?: Set<string>;
  /** Current component prop expressions (for resolving prop identifiers in conditions) */
  componentPropExpressions?: Map<string, Expression> | null;
}

/** Type guard: does this context have V3 runtime features? */
export function isRuntimeContext(ctx: TransformContext): boolean {
  return ctx.runtimeVars !== undefined;
}
