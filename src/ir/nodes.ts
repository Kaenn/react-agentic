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
  children: BlockNode[];
}

/**
 * Ordered or unordered list
 */
export interface ListNode {
  kind: 'list';
  ordered: boolean;
  items: ListItemNode[];
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
  children: BlockNode[];
}

/**
 * Horizontal rule / thematic break
 */
export interface ThematicBreakNode {
  kind: 'thematicBreak';
}

/**
 * XML-style block element (e.g., <example>content</example>)
 * Used for Claude Code's special sections
 */
export interface XmlBlockNode {
  kind: 'xmlBlock';
  name: string;
  attributes?: Record<string, string>;
  children: BlockNode[];
}

/**
 * Raw markdown content passed through without transformation
 */
export interface RawMarkdownNode {
  kind: 'raw';
  content: string;
}

/**
 * SpawnAgent invocation within a Command
 * Emits as Task() syntax in markdown
 */
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agent: string;           // Agent name/reference (e.g., 'gsd-researcher')
  model: string;           // Model to use (supports {variable} syntax)
  description: string;     // Human-readable task description
  prompt: string;          // Task prompt (supports {variable} and template literals)
}

/**
 * Union of all block node types
 */
export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode
  | BlockquoteNode
  | ThematicBreakNode
  | XmlBlockNode
  | RawMarkdownNode
  | SpawnAgentNode;

// ============================================================================
// Special Nodes
// ============================================================================

/**
 * YAML frontmatter data
 */
export interface FrontmatterNode {
  kind: 'frontmatter';
  data: Record<string, unknown>;
}

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
}

/**
 * Document root node
 */
export interface DocumentNode {
  kind: 'document';
  frontmatter?: FrontmatterNode;
  children: BlockNode[];
}

/**
 * Agent document root node
 * Similar to DocumentNode but with required AgentFrontmatterNode
 */
export interface AgentDocumentNode {
  kind: 'agentDocument';
  frontmatter: AgentFrontmatterNode;  // Required for agents (vs optional for Command)
  children: BlockNode[];
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
  | FrontmatterNode
  | AgentFrontmatterNode
  | ListItemNode
  | DocumentNode
  | AgentDocumentNode
  | TypeReference;

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
