/**
 * Components Module
 *
 * Re-exports all compile-time JSX components and types.
 * These components are transformed by react-agentic and never run at runtime.
 */

// ============================================================================
// Markdown Primitives
// ============================================================================

export {
  Markdown,
  XmlBlock,
  Indent,
  type MarkdownProps,
  type XmlBlockProps,
  type IndentProps,
} from './markdown.js';

// ============================================================================
// Structured Data
// ============================================================================

export {
  Table,
  List,
  type TableProps,
  type ListProps,
  type TableAlignment,
} from './structured.js';

// ============================================================================
// Command Component
// ============================================================================

export {
  Command,
  type CommandProps,
  type CommandContext,
  type CommandArgument,
} from './Command.js';

// ============================================================================
// Agent System
// ============================================================================

export {
  // Components
  Agent,
  SpawnAgent,
  OnStatus,

  // Utilities
  useOutput,
  defineAgent,
  isAgentRef,
  getAgentName,
  getAgentPath,

  // Types
  type AgentProps,
  type AgentContext,
  type AgentStatus,
  type BaseOutput,
  type SpawnAgentProps,
  type V3SpawnAgentProps,
  type OnStatusProps,
  type OutputRef,
  type AgentRef,
  type DefineAgentConfig,
} from './Agent.js';

// ============================================================================
// Runtime Variable System
// ============================================================================

export {
  useRuntimeVar,
  useVariable,
  isRuntimeVar,
  getRuntimeVarInfo,
  toJqExpression,
  toJqPath,
  type RuntimeVar,
  type RuntimeVarProxy,
  type OrRuntimeVar,
  type AllowRuntimeVars,
} from './runtime-var.js';

// ============================================================================
// Runtime Function System
// ============================================================================

export {
  runtimeFn,
  isRuntimeFn,
  getRuntimeFnRegistry,
  clearRuntimeFnRegistry,
  getRuntimeFn,
  type RuntimeFunction,
  type RuntimeCallProps,
  type RuntimeCallComponent,
  type RuntimeFnComponent,
} from './runtime-fn.js';

// ============================================================================
// Control Flow Components
// ============================================================================

export {
  // Components
  If,
  Else,
  Loop,
  Break,
  Return,

  // Markers
  IF_MARKER,
  ELSE_MARKER,
  LOOP_MARKER,
  BREAK_MARKER,
  RETURN_MARKER,

  // Types
  type Condition,
  type IfProps,
  type ElseProps,
  type LoopProps,
  type BreakProps,
  type ReturnProps,
  type ReturnStatus,
} from './control.js';

// ============================================================================
// AskUser Component
// ============================================================================

export {
  AskUser,
  ASK_USER_MARKER,
  type AskUserProps,
  type AskUserOption,
} from './ask-user.js';

// ============================================================================
// Reference Printing
// ============================================================================

export {
  Ref,
  REF_MARKER,
  type RefProps,
} from './Ref.js';

// ============================================================================
// Agent Contract Components
// ============================================================================

export {
  Role,
  UpstreamInput,
  DownstreamConsumer,
  Methodology,
  StatusReturn,
  StructuredReturns,
  type ContractComponentProps,
  type StatusReturnProps,
  type StructuredReturnsProps,
} from './contract.js';

// ============================================================================
// Meta-Prompting Components
// ============================================================================

// Meta-prompting components removed in Phase 38 Plan 04
// Use Assign with file() source helper instead
