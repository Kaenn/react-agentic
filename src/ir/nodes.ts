/**
 * IR Node Types - Discriminated unions for intermediate representation
 *
 * All nodes have a `kind` property that serves as the discriminator,
 * enabling exhaustive type checking in switch statements.
 */

// ============================================================================
// Inline Nodes (within paragraphs, headings, etc.)
// ============================================================================

/**
 * Plain text content
 */
export interface TextNode {
  kind: 'text';
  value: string;
}

/**
 * Bold/strong text - uses asterisks (**text**)
 */
export interface BoldNode {
  kind: 'bold';
  children: InlineNode[];
}

/**
 * Italic/emphasis text - uses asterisks (*text*)
 */
export interface ItalicNode {
  kind: 'italic';
  children: InlineNode[];
}

/**
 * Inline code - uses backticks (`code`)
 */
export interface InlineCodeNode {
  kind: 'inlineCode';
  value: string;
}

/**
 * Hyperlink with optional text
 */
export interface LinkNode {
  kind: 'link';
  url: string;
  children: InlineNode[];
}

/**
 * Line break within a block element
 */
export interface LineBreakNode {
  kind: 'lineBreak';
}

/**
 * Union of all inline node types
 */
export type InlineNode =
  | TextNode
  | BoldNode
  | ItalicNode
  | InlineCodeNode
  | LinkNode
  | LineBreakNode;

// ============================================================================
// Block Nodes (standalone elements)
// ============================================================================

/**
 * Heading levels 1-6
 */
export interface HeadingNode {
  kind: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: InlineNode[];
}

/**
 * Paragraph containing inline content
 */
export interface ParagraphNode {
  kind: 'paragraph';
  children: InlineNode[];
}

/**
 * List item containing block content
 */
export interface ListItemNode {
  kind: 'listItem';
  children: BaseBlockNode[];
}

/**
 * Ordered or unordered list
 */
export interface ListNode {
  kind: 'list';
  ordered: boolean;
  items: ListItemNode[];
  start?: number;                                         // Start number for ordered lists
}

/**
 * Fenced code block with optional language
 */
export interface CodeBlockNode {
  kind: 'codeBlock';
  language?: string;
  content: string;
}

/**
 * Blockquote containing block content
 */
export interface BlockquoteNode {
  kind: 'blockquote';
  children: BaseBlockNode[];
}

/**
 * Horizontal rule / thematic break
 */
export interface ThematicBreakNode {
  kind: 'thematicBreak';
}

/**
 * Markdown table with optional headers and column alignment
 */
export interface TableNode {
  kind: 'table';
  headers?: string[];                                    // Optional header row
  rows: string[][];                                       // Data rows (can be empty)
  align?: ('left' | 'center' | 'right')[];               // Per-column alignment
  emptyCell?: string;                                     // Empty cell content (default: "")
}

/**
 * ExecutionContext - emits <execution_context> XML with file paths
 */
export interface ExecutionContextNode {
  kind: 'executionContext';
  paths: string[];                                        // File paths to reference
  prefix: string;                                         // Path prefix (default: '@')
  children: BaseBlockNode[];                                  // Optional additional content
}

/**
 * SuccessCriteria item data
 */
export interface SuccessCriteriaItemData {
  text: string;
  checked: boolean;
}

/**
 * SuccessCriteria - emits <success_criteria> XML with checkbox list
 */
export interface SuccessCriteriaNode {
  kind: 'successCriteria';
  items: SuccessCriteriaItemData[];                       // Checkbox items
}

/**
 * OfferNext route data
 */
export interface OfferNextRouteData {
  name: string;
  description?: string;
  path: string;
}

/**
 * OfferNext - emits <offer_next> XML with route bullet list
 */
export interface OfferNextNode {
  kind: 'offerNext';
  routes: OfferNextRouteData[];                           // Route navigation items
}

/**
 * XML-style block element (e.g., <example>content</example>)
 * Used for Claude Code's special sections
 */
export interface XmlBlockNode {
  kind: 'xmlBlock';
  name: string;
  attributes?: Record<string, string>;
  children: BaseBlockNode[];
}

/**
 * Invisible grouping container for tight block spacing
 * Used for <div> without name attribute - no wrapper output, single newlines between children
 */
export interface GroupNode {
  kind: 'group';
  children: BaseBlockNode[];
}

/**
 * Raw markdown content passed through without transformation
 */
export interface RawMarkdownNode {
  kind: 'raw';
  content: string;
}

/**
 * Indented block - prepends spaces to each line of content
 */
export interface IndentNode {
  kind: 'indent';
  spaces: number;                                         // Number of spaces to indent (default: 2)
  children: BaseBlockNode[];
}

// SpawnAgent types moved to runtime-nodes.ts

/**
 * Shell variable assignment from useVariable/Assign
 * Emits as bash code block with variable assignment
 */
export interface AssignNode {
  kind: 'assign';
  variableName: string;    // Shell variable name (e.g., 'PHASE_DIR')
  assignment: {
    type: 'bash' | 'value' | 'env';  // bash: VAR=$(...), value: VAR=..., env: VAR=$ENV
    content: string;                  // The bash command, static value, or env var name
  };
  comment?: string;        // Optional inline comment (e.g., "Get phase from roadmap")
  blankBefore?: boolean;   // Insert extra blank line before this assignment (from <br/>)
}

/**
 * Group of shell variable assignments
 * Emits as single bash code block with all assignments
 */
export interface AssignGroupNode {
  kind: 'assignGroup';
  assignments: AssignNode[];  // Child Assign nodes
}

// IfNode, ElseNode, LoopNode moved to runtime-nodes.ts

/**
 * Reference to an agent's output in the IR
 * Captures the agent name for output binding
 */
export interface OutputReference {
  kind: 'outputReference';
  /** Agent name this output refers to */
  agent: string;
}

/**
 * OnStatus block - conditional based on agent return status
 * Emits as **On {status}:** prose pattern
 */
export interface OnStatusNode {
  kind: 'onStatus';
  /** Output reference from useOutput */
  outputRef: OutputReference;
  /** Status to match (SUCCESS, BLOCKED, etc.) */
  status: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';
  /** Block content for this status */
  children: BaseBlockNode[];
}

/**
 * OnStatusDefault block - catch-all for unhandled agent statuses
 * Emits as **On any other status:** prose pattern
 */
export interface OnStatusDefaultNode {
  kind: 'onStatusDefault';
  /** Output reference from useOutput (inherited from preceding OnStatus) */
  outputRef: OutputReference;
  /** Block content for default case */
  children: BaseBlockNode[];
}

/**
 * Role - agent identity and responsibilities
 * Renders as <role> XML block
 */
export interface RoleNode {
  kind: 'role';
  children: BaseBlockNode[];
}

/**
 * UpstreamInput - documents expected input context
 * Renders as <upstream_input> XML block
 */
export interface UpstreamInputNode {
  kind: 'upstreamInput';
  children: BaseBlockNode[];
}

/**
 * DownstreamConsumer - documents output consumers
 * Renders as <downstream_consumer> XML block
 */
export interface DownstreamConsumerNode {
  kind: 'downstreamConsumer';
  children: BaseBlockNode[];
}

/**
 * Methodology - describes working approach
 * Renders as <methodology> XML block
 */
export interface MethodologyNode {
  kind: 'methodology';
  children: BaseBlockNode[];
}

/**
 * Return - individual return status with description
 * Only valid inside StructuredReturns
 * Named ReturnStatusNode to avoid conflict with control flow ReturnNode
 */
export interface ReturnStatusNode {
  kind: 'returnStatus';
  status: string;
  children: BaseBlockNode[];
}

/**
 * StructuredReturns - container for Return children
 * Renders as <structured_returns> with ## headings for each status
 */
export interface StructuredReturnsNode {
  kind: 'structuredReturns';
  returns: ReturnStatusNode[];
}

/**
 * Read state value from registry
 * Emits as bash JSON read operation
 */
export interface ReadStateNode {
  kind: 'readState';
  /** State key identifier (e.g., 'projectContext') */
  stateKey: string;
  /** Variable to store result (from useVariable) */
  variableName: string;
  /** Optional: nested field path (e.g., 'user.preferences.theme') */
  field?: string;
}

/**
 * Write state value to registry
 * Emits as bash JSON write operation
 */
export interface WriteStateNode {
  kind: 'writeState';
  /** State key identifier (e.g., 'projectContext') */
  stateKey: string;
  /** Write mode: 'field' for single field, 'merge' for partial update */
  mode: 'field' | 'merge';
  /** For field mode: nested field path (e.g., 'user.name') */
  field?: string;
  /** Value to write - either variable reference or literal */
  value: {
    type: 'variable' | 'literal';
    content: string;
  };
}

/**
 * PromptTemplate node - wraps children in markdown code fence
 * Used to avoid nested escaping in prompt content
 */
export interface PromptTemplateNode {
  kind: 'promptTemplate';
  children: BaseBlockNode[];
}

/**
 * File entry for ReadFilesNode
 */
export interface ReadFileEntry {
  /** Variable name for content (e.g., "STATE_CONTENT") */
  varName: string;
  /** File path (may contain variable references) */
  path: string;
  /** Whether file is required (affects error suppression) */
  required: boolean;
}

/**
 * ReadFiles node - emit bash commands to read multiple files
 * Emits as single bash code block with cat commands
 */
export interface ReadFilesNode {
  kind: 'readFiles';
  files: ReadFileEntry[];
}

/**
 * Step output variant
 */
export type StepVariant = 'heading' | 'bold' | 'xml';

/**
 * Numbered workflow step
 * Emits formatted step section based on variant
 */
export interface StepNode {
  kind: 'step';
  /** Step number (string to support "1.1" sub-steps) */
  number: string;
  /** Step name/title */
  name: string;
  /** Output format variant (default: 'heading') */
  variant: StepVariant;
  /** Step body content */
  children: BaseBlockNode[];
}

/**
 * Base union of all block node types (without runtime nodes)
 * Use BlockNode from runtime-nodes.ts for the full union including runtime nodes
 */
export type BaseBlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode
  | BlockquoteNode
  | ThematicBreakNode
  | TableNode
  | ExecutionContextNode
  | SuccessCriteriaNode
  | OfferNextNode
  | XmlBlockNode
  | GroupNode
  | RawMarkdownNode
  | IndentNode
  | AssignNode
  | AssignGroupNode
  | OnStatusNode
  | OnStatusDefaultNode
  | ReadStateNode
  | WriteStateNode
  | ReadFilesNode
  | PromptTemplateNode
  | MCPServerNode
  | StepNode
  | RoleNode
  | UpstreamInputNode
  | DownstreamConsumerNode
  | MethodologyNode
  | StructuredReturnsNode;

/**
 * Internal alias for backward compatibility within this file
 * @internal
 */
type BlockNode = BaseBlockNode;

// ============================================================================
// Special Nodes
// ============================================================================

// FrontmatterNode moved to runtime-nodes.ts

/**
 * Agent YAML frontmatter data
 * Uses GSD format: tools as space-separated string, not array like Command
 */
export interface AgentFrontmatterNode {
  kind: 'agentFrontmatter';
  name: string;              // Required: agent identifier (e.g., 'researcher')
  description: string;       // Required: agent purpose
  tools?: string;            // Optional: space-separated tool names (e.g., 'Read Grep Glob')
  color?: string;            // Optional: terminal color (e.g., 'cyan')
  inputType?: TypeReference; // Optional: generic type parameter if provided (e.g., 'ResearcherInput')
  outputType?: TypeReference; // Optional: second generic type parameter (e.g., 'ResearcherOutput')
}

// DocumentNode moved to runtime-nodes.ts

/**
 * Agent document root node
 * Similar to DocumentNode but with required AgentFrontmatterNode
 */
export interface AgentDocumentNode {
  kind: 'agentDocument';
  frontmatter: AgentFrontmatterNode;  // Required for agents (vs optional for Command)
  children: BaseBlockNode[];
}

// ============================================================================
// MCP Configuration Nodes
// ============================================================================

/**
 * MCP Server configuration node
 * Represents a single MCP server definition
 */
export interface MCPServerNode {
  kind: 'mcpServer';
  name: string;                        // Server name (key in mcpServers object)
  type: 'stdio' | 'http' | 'sse';      // Transport type
  // Stdio-specific
  command?: string;                    // Executable command
  args?: string[];                     // Command arguments
  // HTTP/SSE-specific
  url?: string;                        // Remote URL
  headers?: Record<string, string>;    // Request headers
  // Common
  env?: Record<string, string>;        // Environment variables
}

/**
 * MCP configuration document root node
 * Contains one or more MCP server definitions
 */
export interface MCPConfigDocumentNode {
  kind: 'mcpConfigDocument';
  servers: MCPServerNode[];
}

// ============================================================================
// State Document Nodes
// ============================================================================

/**
 * Flattened state schema field
 * Represents a single column in the generated SQLite table
 */
export interface StateSchemaField {
  /** Column name (flattened path, e.g., "config_debug") */
  name: string;
  /** TypeScript type (string, number, boolean, Date) */
  tsType: string;
  /** SQL type (TEXT, INTEGER) */
  sqlType: 'TEXT' | 'INTEGER';
  /** Default value for init SQL */
  defaultValue: string;
  /** Optional: enum values for CHECK constraint */
  enumValues?: string[];
}

/**
 * Parsed state schema from TypeScript interface
 * Fields are flattened (nested objects become underscore-separated)
 */
export interface StateSchema {
  /** Interface name (e.g., "ReleasesState") */
  interfaceName: string;
  /** Flattened fields for SQL columns */
  fields: StateSchemaField[];
}

/**
 * Custom operation node
 * Represents an Operation child of State component
 */
export interface OperationNode {
  kind: 'operation';
  /** Operation name (e.g., "record") - becomes skill suffix */
  name: string;
  /** SQL template body with $variable placeholders */
  sqlTemplate: string;
  /** Inferred argument names from $variable references */
  args: string[];
}

/**
 * State node representing parsed State component
 */
export interface StateNode {
  kind: 'state';
  /** State name (e.g., "releases") - becomes skill prefix */
  name: string;
  /** Provider type (only "sqlite" for now) */
  provider: 'sqlite';
  /** Provider-specific configuration */
  config: {
    /** Database file path */
    database: string;
  };
  /** Parsed schema from generic type parameter */
  schema: StateSchema;
  /** Custom operations defined as children */
  operations: OperationNode[];
}

/**
 * State document root node
 * Produces multiple skill files in .claude/skills/
 */
export interface StateDocumentNode {
  kind: 'stateDocument';
  /** The State definition */
  state: StateNode;
}

// ============================================================================
// Skill Nodes
// ============================================================================

/**
 * Skill YAML frontmatter data
 * Uses Claude Code skills format with kebab-case field names
 */
export interface SkillFrontmatterNode {
  kind: 'skillFrontmatter';
  name: string;                        // Required: skill directory name
  description: string;                 // Required: what/when description
  disableModelInvocation?: boolean;    // Optional: prevent auto-invoke
  userInvocable?: boolean;             // Optional: hide from / menu
  allowedTools?: string[];             // Optional: tools without permission
  argumentHint?: string;               // Optional: [filename] hint
  model?: string;                      // Optional: model override
  context?: 'fork';                    // Optional: run in subagent
  agent?: string;                      // Optional: which subagent
}

/**
 * SkillFile node for generated files within skill
 * Each SkillFile produces an output file in the skill directory
 */
export interface SkillFileNode {
  kind: 'skillFile';
  name: string;                        // Output filename (e.g., "reference.md")
  children: BaseBlockNode[];               // Content to generate
}

/**
 * SkillStatic node for static file copying
 * Copies files from source location to skill directory
 */
export interface SkillStaticNode {
  kind: 'skillStatic';
  src: string;                         // Source path relative to TSX file
  dest?: string;                       // Optional destination path override
}

/**
 * Skill document root node
 * Produces a skill directory with SKILL.md plus optional supporting files
 */
export interface SkillDocumentNode {
  kind: 'skillDocument';
  frontmatter: SkillFrontmatterNode;   // Required (like Agent)
  children: BaseBlockNode[];               // SKILL.md body content
  files: SkillFileNode[];              // Generated files from SkillFile
  statics: SkillStaticNode[];          // Static files from SkillStatic
}

/**
 * Reference to a TypeScript type across files
 * Used for tracking Agent interface imports in SpawnAgent
 * Actual validation happens in Phase 11
 */
export interface TypeReference {
  kind: 'typeReference';
  name: string;            // Type/interface name (e.g., 'ResearcherInput')
  sourceFile?: string;     // Relative path to defining file
  resolved?: boolean;      // Whether type was successfully resolved
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union of all IR node types
 */
export type IRNode =
  | BlockNode
  | InlineNode
  | AgentFrontmatterNode
  | SkillFrontmatterNode
  | SkillFileNode
  | SkillStaticNode
  | ListItemNode
  | AgentDocumentNode
  | SkillDocumentNode
  | MCPConfigDocumentNode
  | StateDocumentNode
  | TypeReference
  | RoleNode
  | UpstreamInputNode
  | DownstreamConsumerNode
  | MethodologyNode
  | StructuredReturnsNode
  | ReturnStatusNode;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Helper for exhaustiveness checking in switch statements.
 * If TypeScript complains that the argument is not of type 'never',
 * it means there's an unhandled case in the switch.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected node: ${JSON.stringify(x)}`);
}
