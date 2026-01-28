/**
 * react-agentic - Compile-time safety for Claude Code commands
 *
 * Main entry point - exports components, IR types, and build functions.
 */

// ============================================================================
// Components - Compile-time JSX components
// ============================================================================

export {
  // Core components
  Command,
  Agent,
  SpawnAgent,
  OnStatus,
  Markdown,
  XmlBlock,
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

  // Agent utilities
  useOutput,
  defineAgent,
  isAgentRef,
  getAgentName,
  getAgentPath,

  // RuntimeVar utilities
  isRuntimeVar,
  getRuntimeVarInfo,
  toJqExpression,
  toJqPath,
  // RuntimeFn utilities
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
} from './components/index.js';

// ============================================================================
// IR Types (from V3)
// ============================================================================

export * from './ir/index.js';

// ============================================================================
// Emitters (from V3)
// ============================================================================

export {
  V3MarkdownEmitter,
  emitV3,
  emitRuntime,
  extractFunctions,
  generateRuntime,
  isV3File,
  bundleSingleEntryRuntime,
  bundleCodeSplit,
  extractExportedFunctionNames,
  type ExtractedFunction,
  type RuntimeEmitResult,
  type RuntimeFileInfo,
  type SingleEntryBundleResult,
  type CodeSplitBundleResult,
} from './emitter/index.js';

// ============================================================================
// Transformers (from V3)
// ============================================================================

export {
  type V3TransformContext,
  type V3TransformResult,
  type RuntimeVarInfo,
  type RuntimeFunctionInfo,
  createV3Context,
  extractRuntimeVarDeclarations,
  extractRuntimeFnDeclarations,
  transformV3Command,
  transformToV3Block,
  transformV3BlockChildren,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
} from './parser/transformers/index.js';

// ============================================================================
// Build Functions
// ============================================================================

export {
  buildV3File,
  detectV3,
  hasV3Imports,
  type V3BuildResult,
  type V3BuildOptions,
} from './cli/v3-build.js';

// ============================================================================
// Parser Utilities (for CLI compatibility)
// ============================================================================

export { createProject } from './parser/utils/project.js';
export { findRootJsxElement, transform, getAttributeValue, resolveTypeImport, extractInterfaceProperties, extractPromptPlaceholders } from './parser/index.js';

// ============================================================================
// Additional Emitters
// ============================================================================

export { emit, emitAgent, emitSkill, emitSkillFile, emitSettings, mergeSettings } from './emitter/index.js';
