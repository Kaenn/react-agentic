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
  transformInlineNodes,
  // Constants
  HTML_ELEMENTS,
  INLINE_ELEMENTS,
  SPECIAL_COMPONENTS,
} from './shared.js';

// ============================================================================
// Dispatch (recursive transform entry point)
// ============================================================================

export { transformToBlock, transformBlockChildren } from './dispatch.js';

// ============================================================================
// Document Transformers (Plan 26-03)
// ============================================================================

export {
  transformCommand,
  transformAgent,
  transformSkill,
  processSkillChildren,
  transformSkillFile,
  transformSkillStatic,
  transformMCPConfig,
  transformMCPServer,
  transformState,
  transformOperation,
  transformArrowFunctionBody,
} from './document.js';

// ============================================================================
// HTML Element Transformers (Plan 26-03)
// ============================================================================

export {
  transformList,
  transformListItem,
  transformBlockquote,
  transformCodeBlock,
  extractCodeContent,
  transformDiv,
  transformMixedChildren,
  extractAllText,
} from './html.js';

// ============================================================================
// Inline Transformers (Plan 26-03)
// ============================================================================

export {
  transformInlineChildren,
  transformToInline,
  transformInlineElement,
  transformLink,
  trimBoundaryTextNodes,
} from './inline.js';

// ============================================================================
// Semantic Component Transformers (Plan 26-03)
// ============================================================================

export {
  transformTable,
  parseRowsAttribute,
  transformPropList,
  transformExecutionContext,
  transformSuccessCriteria,
  parseSuccessCriteriaItems,
  transformOfferNext,
  parseOfferNextRoutes,
  transformXmlSection,
  transformXmlWrapper,
} from './semantic.js';

// ============================================================================
// Control Flow Transformers (Plan 26-03)
// ============================================================================

export {
  transformIf,
  transformElse,
  transformLoop,
  transformOnStatus,
  extractOutputDeclarations,
  extractStateRefDeclarations,
} from './control.js';

// ============================================================================
// Future Transformer Modules (Plan 26-04+)
// ============================================================================
//
// The following modules will be added as transformer.ts is refactored:
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
// - transformMarkdown, transformXmlBlock

// ============================================================================
// SpawnAgent Transformers (Plan 26-04)
// ============================================================================

export {
  transformSpawnAgent,
} from './spawner.js';

// ============================================================================
// Variable Transformers (Plan 26-04)
// ============================================================================

export {
  transformAssign,
  transformAssignGroup,
} from './variables.js';

// ============================================================================
// State Transformers (Plan 26-04)
// ============================================================================

export {
  transformReadState,
  transformWriteState,
} from './state.js';

// ============================================================================
// Primitive Transformers (Plan 26-04)
// ============================================================================

export {
  transformStep,
  transformBash,
  transformReadFiles,
  transformPromptTemplate,
} from './primitives.js';

// ============================================================================
// Markdown Transformers (Plan 26-04)
// ============================================================================

export {
  transformMarkdown,
  transformXmlBlock,
  transformCustomComponent,
  extractTemplateText,
} from './markdown.js';

// ============================================================================
// V3 Transformers
// ============================================================================

export * from './v3-index.js';
