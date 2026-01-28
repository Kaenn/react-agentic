/**
 * V3 Module - Hybrid Runtime Architecture
 *
 * Exports all V3 primitives, types, IR nodes, and build functions.
 *
 * Usage:
 * import { useScriptVar, runtimeFn, If, Loop } from 'react-agentic/v3';
 */

// ============================================================================
// Primitives
// ============================================================================

export {
  // Script Variable System
  useScriptVar,
  isScriptVar,
  getScriptVarInfo,
  toJqExpression,
  toJqPath,
  type ScriptVar,
  type ScriptVarProxy,

  // Runtime Function System
  runtimeFn,
  isRuntimeFn,
  getRuntimeFnRegistry,
  clearRuntimeFnRegistry,
  getRuntimeFn,
  type RuntimeFunction,
  type RuntimeCallProps,
  type RuntimeCallComponent,
  type RuntimeFnComponent,

  // Control Flow Components
  V3If,
  V3Else,
  V3Loop,
  Break,
  Return,
  If,
  Else,
  Loop,
  V3_IF_MARKER,
  V3_ELSE_MARKER,
  V3_LOOP_MARKER,
  V3_BREAK_MARKER,
  V3_RETURN_MARKER,
  type V3IfProps,
  type V3ElseProps,
  type V3LoopProps,
  type BreakProps,
  type ReturnProps,
  type V3Condition,

  // AskUser Component
  AskUser,
  ASK_USER_MARKER,
  type AskUserProps,
  type AskUserOption,
} from './primitives/index.js';

// ============================================================================
// IR Nodes
// ============================================================================

export {
  // V3-specific nodes
  type ScriptVarDeclNode,
  type ScriptVarRefNode,
  type RuntimeCallNode,
  type V3Condition as V3ConditionNode,
  type V3ConditionRef,
  type V3ConditionLiteral,
  type V3ConditionNot,
  type V3ConditionAnd,
  type V3ConditionOr,
  type V3ConditionEq,
  type V3ConditionNeq,
  type V3IfNode,
  type V3ElseNode,
  type V3LoopNode,
  type BreakNode,
  type ReturnNode,
  type AskUserNode,
  type AskUserOptionNode,
  type V3SpawnAgentNode,
  type V3SpawnAgentInput,
  type V3InputProperty,
  type V3InputValue,
  type V3SpecificBlockNode,
  type V3BlockNode,
  type V3FrontmatterNode,
  type V3DocumentNode,
  isV3SpecificNode,
  isV3Document,
  assertNeverV3,
} from './ir/index.js';

// ============================================================================
// Transformers
// ============================================================================

export {
  // Context and types
  type V3TransformContext,
  type V3TransformResult,
  type ScriptVarInfo,
  type RuntimeFunctionInfo,
  createV3Context,

  // Transform functions
  extractScriptVarDeclarations,
  extractRuntimeFnDeclarations,
  transformV3Command,
  transformToV3Block,
  transformV3BlockChildren,
} from './parser/transformers/index.js';

// ============================================================================
// Emitters
// ============================================================================

export {
  // Markdown emitter
  V3MarkdownEmitter,
  emitV3,

  // Runtime emitter
  emitRuntime,
  extractFunctions,
  generateRuntime,
  isV3File,
  type ExtractedFunction,
  type RuntimeEmitResult,
} from './emitter/index.js';

// ============================================================================
// CLI / Build
// ============================================================================

export {
  buildV3File,
  detectV3,
  hasV3Imports,
  type V3BuildResult,
  type V3BuildOptions,
} from './cli/build-v3.js';

// ============================================================================
// Re-export shared components from main package
// ============================================================================

// Command component (same as v1)
export { Command, type CommandProps } from '../workflow/Command.js';

// SpawnAgent (v3 version supports output binding)
export { SpawnAgent, type SpawnAgentProps } from '../workflow/agents/index.js';

// Markdown and XmlBlock (same as v1)
export { Markdown, XmlBlock, type MarkdownProps, type XmlBlockProps } from '../primitives/markdown.js';

// Table and List (same as v1)
export { Table, List, type TableProps, type ListProps } from '../primitives/structured.js';
