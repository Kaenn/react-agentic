/**
 * Central transform dispatcher
 *
 * Prevents circular imports by providing a single entry point
 * for recursive transform calls. Individual transformer modules
 * import dispatchBlockTransform instead of each other.
 *
 * NOTE: This is a STUB implementation for Plan 26-02.
 * Full implementation will be completed in Plan 26-03/04 as
 * transformer modules are extracted from transformer.ts.
 */

import type { Node } from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';

/**
 * Dispatch a node transformation to the appropriate handler
 * Called by transformBlockChildren and other recursive transforms
 *
 * This is the central routing mechanism that prevents circular dependencies.
 * Once all transformer modules are extracted, this will route to:
 * - document.ts: transformCommand, transformAgent, transformSkill
 * - html.ts: transformList, transformBlockquote, transformCodeBlock
 * - semantic.ts: transformTable, transformExecutionContext
 * - control.ts: transformIf, transformElse, transformLoop
 * - spawner.ts: transformSpawnAgent
 * - variables.ts: transformAssign, transformAssignGroup
 * - state.ts: transformReadState, transformWriteState
 * - primitives.ts: transformStep, transformBash
 * - markdown.ts: transformMarkdown, transformXmlBlock
 *
 * @param node - The JSX node to transform
 * @param ctx - Transform context with shared state
 * @returns BlockNode or null if node should be skipped
 * @throws TranspileError if transformation fails
 *
 * TODO: Implementation in Plan 26-03/04
 */
export function dispatchBlockTransform(
  node: Node,
  ctx: TransformContext
): BlockNode | null {
  // STUB: Will be implemented when transformer modules are created
  throw new Error(
    'dispatchBlockTransform not yet implemented - complete in Plan 26-03/04. ' +
    'This function will route JSX nodes to appropriate transformer modules.'
  );
}

/**
 * Transform JSX children to BlockNodes, handling If/Else sibling pairs
 *
 * This is the main workhorse for transforming arrays of JSX children.
 * It handles:
 * - Filtering out whitespace-only text nodes
 * - Pairing If/Else siblings (Else must immediately follow If)
 * - Dispatching each child to appropriate transformer
 * - Skipping null results (filtered nodes)
 *
 * Extracted from Transformer.transformBlockChildren
 *
 * @param jsxChildren - Array of JSX child nodes
 * @param ctx - Transform context with shared state
 * @returns Array of BlockNodes (empty array if no valid children)
 * @throws TranspileError if transformation fails
 *
 * TODO: Implementation in Plan 26-03/04
 */
export function transformBlockChildren(
  jsxChildren: Node[],
  ctx: TransformContext
): BlockNode[] {
  // STUB: Will be implemented when transformer modules are created
  throw new Error(
    'transformBlockChildren not yet implemented - complete in Plan 26-03/04. ' +
    'This function will transform arrays of JSX children into BlockNodes, ' +
    'handling If/Else pairing and dispatching to appropriate transformers.'
  );
}

/**
 * Future transformer routing structure (for Plan 26-03/04):
 *
 * import { transformCommand, transformAgent, transformSkill } from './document.js';
 * import { transformList, transformBlockquote, transformCodeBlock } from './html.js';
 * import { transformTable, transformExecutionContext, ... } from './semantic.js';
 * import { transformIf, transformElse, transformLoop, transformOnStatus } from './control.js';
 * import { transformSpawnAgent } from './spawner.js';
 * import { transformAssign, transformAssignGroup } from './variables.js';
 * import { transformReadState, transformWriteState } from './state.js';
 * import { transformStep, transformBash, transformReadFiles, transformPromptTemplate } from './primitives.js';
 * import { transformMarkdown, transformXmlBlock, transformDiv } from './markdown.js';
 * import { isCustomComponent } from './shared.js';
 *
 * Then implement routing logic based on element name and node type.
 */
