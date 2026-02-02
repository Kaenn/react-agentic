/**
 * react-agentic/composites - User-definable convenience wrappers
 *
 * Composites wrap primitives to provide enhanced variants with common patterns.
 * Users can import these for "batteries included" behavior, or copy/modify
 * the source code to create custom variants.
 *
 * Import: import { IfElseBlock, LoopWithBreak } from 'react-agentic/composites'
 *
 * @packageDocumentation
 */

// Control flow composites
export { IfElseBlock, type IfElseBlockProps } from './IfElseBlock.js';
export { LoopWithBreak, type LoopWithBreakProps } from './LoopWithBreak.js';

// Agent composites
export { SpawnAgentWithRetry, type SpawnAgentWithRetryProps } from './SpawnAgentWithRetry.js';

// Presentation composites
export { StepSection, type StepSectionProps } from './StepSection.js';
export { DataTable, type DataTableProps } from './DataTable.js';
export { BulletList, type BulletListProps } from './BulletList.js';
export { FileContext, type FileContextProps } from './FileContext.js';

// Meta-prompting composites
export {
  MetaPrompt,
  type MetaPromptProps,
  GatherContext,
  type GatherContextProps,
  ComposeContext,
  type ComposeContextProps,
  InlineField,
  type InlineFieldProps,
  Preamble,
  type PreambleProps,
} from './meta-prompting/index.js';

// Agent contract composites
export {
  Role,
  type RoleProps,
  UpstreamInput,
  type UpstreamInputProps,
  DownstreamConsumer,
  type DownstreamConsumerProps,
  Methodology,
  type MethodologyProps,
  type ContractComponentProps,
} from './contract/index.js';
