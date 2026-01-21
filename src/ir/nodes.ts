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
  | RawMarkdownNode;

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
 * Document root node
 */
export interface DocumentNode {
  kind: 'document';
  frontmatter?: FrontmatterNode;
  children: BlockNode[];
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
  | ListItemNode
  | DocumentNode;

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
