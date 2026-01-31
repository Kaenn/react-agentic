/**
 * JSX component stubs for react-agentic
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 *
 * This file re-exports all components from their organized module locations.
 */

// ============================================================================
// Core Components
// ============================================================================

export {
  // Document components
  Command,
  Agent,
  SpawnAgent,
  OnStatus,

  // Content components
  Markdown,
  XmlBlock,
  Indent,
  Table,
  List,

  // Control flow
  If,
  Else,
  Loop,
  Break,
  Return,
  AskUser,

  // Runtime primitives
  useRuntimeVar,
  runtimeFn,
  Ref,

  // Utilities
  useOutput,
  defineAgent,
  isAgentRef,
  getAgentName,
  getAgentPath,
  isRuntimeVar,
  getRuntimeVarInfo,
  toJqExpression,
  toJqPath,
  isRuntimeFn,
  getRuntimeFnRegistry,
  clearRuntimeFnRegistry,
  getRuntimeFn,

  // Markers
  IF_MARKER,
  ELSE_MARKER,
  LOOP_MARKER,
  BREAK_MARKER,
  RETURN_MARKER,
  ASK_USER_MARKER,
  REF_MARKER,

  // Types
  type CommandProps,
  type CommandContext,
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
  type MarkdownProps,
  type XmlBlockProps,
  type IndentProps,
  type TableProps,
  type TableAlignment,
  type ListProps,
  type IfProps,
  type ElseProps,
  type LoopProps,
  type BreakProps,
  type ReturnProps,
  type ReturnStatus,
  type Condition,
  type AskUserProps,
  type AskUserOption,
  type RuntimeVar,
  type RuntimeVarProxy,
  type OrRuntimeVar,
  type AllowRuntimeVars,
  type RuntimeFunction,
  type RuntimeCallProps,
  type RuntimeCallComponent,
  type RuntimeFnComponent,
  type RefProps,
} from './components/index.js';

// ============================================================================
// Semantic Components (merged from V1 sections)
// ============================================================================

export {
  ExecutionContext,
  type ExecutionContextProps,
} from './workflow/sections/index.js';
