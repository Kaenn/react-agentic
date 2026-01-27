/**
 * Transformer modules - JSX AST to IR transformation
 *
 * This directory contains the modularized transformer functions
 * extracted from the monolithic transformer.ts file.
 *
 * Architecture:
 * - types.ts: Shared type definitions (TransformContext, RenderPropsContext)
 * - shared.ts: Pure utility functions and constants
 * - dispatch.ts: Central routing to prevent circular imports
 * - [future modules]: Specialized transformer functions by domain
 *
 * NOTE: This is the foundation structure for Plan 26-02.
 * Individual transformer modules will be added in Plan 26-03/04.
 */

// ============================================================================
// Types
// ============================================================================

export type { TransformContext, RenderPropsContext } from './types.js';

// ============================================================================
// Shared Utilities
// ============================================================================

export {
  // Utility functions
  toSnakeCase,
  isCustomComponent,
  isInlineElement,
  isValidXmlName,
  trimBoundaryTextNodes,
  transformInlineNodes,
  transformMixedChildren,
  // Constants
  HTML_ELEMENTS,
  INLINE_ELEMENTS,
  SPECIAL_COMPONENTS,
} from './shared.js';

// ============================================================================
// Dispatch (recursive transform entry point)
// ============================================================================

export { dispatchBlockTransform, transformBlockChildren } from './dispatch.js';

// ============================================================================
// Future Transformer Modules (Plan 26-03/04)
// ============================================================================
//
// The following modules will be added as transformer.ts is refactored:
//
// Document transformers (root-level):
// - transformCommand, transformAgent, transformSkill, etc.
//
// HTML element transformers:
// - transformList, transformBlockquote, transformCodeBlock, etc.
//
// Semantic component transformers:
// - transformTable, transformExecutionContext, transformSuccessCriteria, etc.
//
// Control flow transformers:
// - transformIf, transformElse, transformLoop, transformOnStatus
//
// Agent spawning transformers:
// - transformSpawnAgent, extractAgentProp, etc.
//
// Variable transformers:
// - transformAssign, transformAssignGroup
//
// State transformers:
// - transformReadState, transformWriteState
//
// Primitive transformers:
// - transformStep, transformBash, transformReadFiles, transformPromptTemplate
//
// Markdown transformers:
// - transformMarkdown, transformXmlBlock, transformDiv
//
// Inline transformers:
// - transformInlineChildren, transformToInline, transformInlineElement
