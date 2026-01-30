/**
 * Shared types for transformer modules
 */

import type { SourceFile, Node } from 'ts-morph';
import type { ExtractedVariable } from '../parser.js';
import type { BlockNode } from '../../ir/index.js';

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
 * Transform context passed to all transformer functions
 * Replaces class instance state with explicit context object
 */
export interface TransformContext {
  /** Source file for component resolution (optional - only needed for composition) */
  sourceFile: SourceFile | undefined;
  /** Visited paths for circular import detection */
  visitedPaths: Set<string>;
  /** Extracted useVariable declarations from source file */
  variables: Map<string, ExtractedVariable>;
  /** Extracted useOutput declarations: identifier name -> agent name */
  outputs: Map<string, string>;
  /** Extracted useStateRef declarations: identifier name -> state key */
  stateRefs: Map<string, string>;
  /** Current render props context for interpolation */
  renderPropsContext: RenderPropsContext | undefined;
  /** Create error with source location */
  createError: (message: string, node: Node) => Error;
  /**
   * Optional transformBlockChildren function for V1 context delegation.
   * When provided, document transformers use this instead of the dispatch.js import.
   */
  transformBlockChildren?: TransformBlockChildrenFn;
}
