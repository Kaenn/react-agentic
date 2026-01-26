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

// Variable system
export {
  useVariable,
  Assign,
  type VariableRef,
  type AssignProps,
} from './primitives/variables.js';

// Conditional logic and test builders
export {
  If,
  Else,
  fileExists,
  dirExists,
  isEmpty,
  notEmpty,
  equals,
  and,
  or,
  type IfProps,
  type ElseProps,
} from './primitives/control.js';

// Structured data components
export {
  Table,
  List,
  type TableProps,
  type ListProps,
  type TableAlignment,
} from './primitives/structured.js';

// ============================================================================
// Workflow - Framework Helpers for Agentic Flows
// ============================================================================

// Command component
export {
  Command,
  type CommandProps,
} from './workflow/Command.js';

// Agent system
export {
  Agent,
  SpawnAgent,
  OnStatus,
  useOutput,
  type AgentProps,
  type SpawnAgentProps,
  type OnStatusProps,
  type OutputRef,
  type AgentStatus,
  type BaseOutput,
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
  type ExecutionContextProps,
  type SuccessCriteriaProps,
  type SuccessCriteriaItem,
  type XmlSectionProps,
} from './workflow/sections/index.js';
