/**
 * JSX component stubs for react-agentic
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 *
 * This file re-exports all components from their organized module locations.
 * For implementation details, see:
 * - src/primitives/ - Basic markdown building blocks
 * - src/workflow/ - Framework helpers for agentic flows
 */

// ============================================================================
// Primitives - Basic Markdown Building Blocks
// ============================================================================

// Markdown and XML components
export {
  Markdown,
  XmlBlock,
  type MarkdownProps,
  type XmlBlockProps,
} from './primitives/markdown.js';

// Bash code block
export {
  Bash,
  type BashProps,
} from './primitives/bash.js';

// Schema-based declarations
export {
  defineVars,
  defineFiles,
  defineContext,
  type VarDef,
  type VarSchema,
  type VarsFromSchema,
  type FileDef,
  type FileSchema,
  type FileRef,
  type FilesFromSchema,
  type AgentDef,
  type ContextDef,
  type Context,
} from './primitives/schema.js';

// File reading
export {
  ReadFiles,
  type ReadFilesProps,
} from './primitives/files.js';

// Template primitives
export {
  PromptTemplate,
  type PromptTemplateProps,
} from './primitives/template.js';

// Variable system
export {
  useVariable,
  Assign,
  AssignGroup,
  type VariableRef,
  type AssignProps,
  type AssignGroupProps,
} from './primitives/variables.js';

// Conditional logic and test builders
export {
  If,
  Else,
  Loop,
  fileExists,
  dirExists,
  isEmpty,
  notEmpty,
  equals,
  and,
  or,
  type IfProps,
  type ElseProps,
  type LoopProps,
} from './primitives/control.js';

// Structured data components
export {
  Table,
  List,
  type TableProps,
  type ListProps,
  type TableAlignment,
} from './primitives/structured.js';

// Step workflow primitive
export {
  Step,
  type StepProps,
  type StepVariant,
} from './primitives/step.js';

// ============================================================================
// Workflow - Framework Helpers for Agentic Flows
// ============================================================================

// Command component
export {
  Command,
  type CommandProps,
  type CommandContext,
} from './workflow/Command.js';

// Agent system
export {
  Agent,
  SpawnAgent,
  OnStatus,
  useOutput,
  defineAgent,
  isAgentRef,
  getAgentName,
  getAgentPath,
  type AgentProps,
  type SpawnAgentProps,
  type OnStatusProps,
  type OutputRef,
  type AgentStatus,
  type BaseOutput,
  type AgentContext,
  type AgentRef,
  type DefineAgentConfig,
} from './workflow/agents/index.js';

// State management
export {
  State,
  Operation,
  ReadState,
  WriteState,
  useStateRef,
  type StateProps,
  type OperationProps,
  type SQLiteConfig,
  type ReadStateProps,
  type WriteStateProps,
  type StateRef,
} from './workflow/state/index.js';

// Skill system
export {
  Skill,
  SkillFile,
  SkillStatic,
  type SkillProps,
  type SkillFileProps,
  type SkillStaticProps,
} from './workflow/skill/index.js';

// MCP configuration
export {
  MCPServer,
  MCPStdioServer,
  MCPHTTPServer,
  MCPConfig,
  type MCPServerProps,
  type MCPStdioServerProps,
  type MCPHTTPServerProps,
  type MCPConfigProps,
} from './workflow/mcp/index.js';

// ============================================================================
// Sections - Semantic XML Wrapper Components
// ============================================================================

// Semantic section components
export {
  ExecutionContext,
  SuccessCriteria,
  XmlSection,
  OfferNext,
  DeviationRules,
  CommitRules,
  WaveExecution,
  CheckpointHandling,
  type ExecutionContextProps,
  type SuccessCriteriaProps,
  type SuccessCriteriaItem,
  type XmlSectionProps,
  type OfferNextProps,
  type OfferNextRoute,
  type XmlWrapperProps,
} from './workflow/sections/index.js';
