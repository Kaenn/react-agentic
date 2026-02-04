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

  // Agent contract components
  Role,
  UpstreamInput,
  DownstreamConsumer,
  Methodology,
  StatusReturn,
  StructuredReturns,

  // Runtime primitives
  useRuntimeVar,
  useVariable,
  runtimeFn,
  Ref,

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
  REF_MARKER,

  // Types
  type CommandProps,
  type CommandContext,
  type CommandArgument,
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
  type ContractComponentProps,
  type StatusReturnProps,
  type StructuredReturnsProps,
} from './components/index.js';

// ============================================================================
// IR Types
// ============================================================================

export * from './ir/index.js';

// ============================================================================
// Emitters (Runtime)
// ============================================================================

export {
  RuntimeMarkdownEmitter,
  emitDocument,
  emitRuntime,
  extractFunctions,
  generateRuntime,
  isRuntimeFile,
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
// Transformers
// ============================================================================

export {
  type RuntimeTransformContext,
  type RuntimeTransformResult,
  type RuntimeVarInfo,
  type RuntimeFunctionInfo,
  type LocalComponentInfo,
  createRuntimeContext,
  extractRuntimeVarDeclarations,
  extractRuntimeFnDeclarations,
  extractLocalComponentDeclarations,
  extractExternalComponentDeclarations,
  transformRuntimeCommand,
  transformToRuntimeBlock,
  transformRuntimeBlockChildren,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
} from './parser/transformers/index.js';

// ============================================================================
// Build Functions
// ============================================================================

export {
  buildRuntimeFile,
  detectRuntime,
  hasRuntimeImports,
  type RuntimeBuildResult,
  type RuntimeBuildOptions,
} from './cli/runtime-build.js';

// ============================================================================
// Parser Utilities (for CLI compatibility)
// ============================================================================

export { createProject } from './parser/utils/project.js';
export {
  findRootJsxElement,
  transform,
  getAttributeValue,
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
  // Additional parser utilities
  parseSource,
  parseFile,
  getElementName,
  getJsxChildren,
  isWhitespaceOnlyText,
  normalizeWhitespace,
  extractText,
  extractTypeArguments,
  getArrayAttributeValue,
  extractVariableDeclarations,
  extractInputObjectLiteral,
  // V1 Transformer class
  Transformer,
  type JsxChild,
  type ExtractedVariable,
} from './parser/index.js';

// ============================================================================
// Schema Primitives
// ============================================================================

export { defineVars, defineFiles, defineContext } from './primitives/schema.js';

// ============================================================================
// Additional Emitters
// ============================================================================

export { emit, emitAgent, emitSkill, emitSkillFile, emitSettings, mergeSettings } from './emitter/index.js';

// ============================================================================
// Semantic Components
// ============================================================================

export {
  ExecutionContext,
  type ExecutionContextProps,
} from './workflow/sections/index.js';

// ============================================================================
// Primitive Helpers
// ============================================================================

export {
  file,
  bash,
  value,
  env,
  type FileSource,
  type BashSource,
  type ValueSource,
  type EnvSource,
  type AssignSource,
} from './primitives/sources.js';

// ============================================================================
// Swarm System
// ============================================================================

export {
  // Enums
  AgentType,
  PluginAgentType,
  Model,

  // Factories
  defineTask,
  defineWorker,
  defineTeam,

  // Guards
  isTaskRef,
  isWorkerRef,
  isTeamRef,

  // Components
  TaskDef,
  TaskPipeline,
  ShutdownSequence,

  // Pipeline Builder
  createPipeline,

  // Types
  type TaskRef,
  type WorkerRef,
  type TeamRef,
  type TaskDefProps,
  type TaskPipelineProps,
  type ShutdownSequenceProps,
  type Pipeline,
  type PipelineBuilder,
  type PipelineStage,
} from './components/swarm/index.js';
