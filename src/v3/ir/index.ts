/**
 * V3 IR Module
 *
 * Re-exports V3-specific IR nodes and utilities.
 * Also re-exports v1 inline nodes and shared types for composition.
 */

// V3-specific nodes
export {
  // Script variable nodes
  type ScriptVarDeclNode,
  type ScriptVarRefNode,

  // Runtime function nodes
  type RuntimeCallNode,

  // V3 condition types
  type V3Condition,
  type V3ConditionRef,
  type V3ConditionLiteral,
  type V3ConditionNot,
  type V3ConditionAnd,
  type V3ConditionOr,
  type V3ConditionEq,
  type V3ConditionNeq,

  // V3 control flow nodes
  type V3IfNode,
  type V3ElseNode,
  type V3LoopNode,
  type BreakNode,
  type ReturnNode,

  // AskUser nodes
  type AskUserNode,
  type AskUserOptionNode,

  // V3 SpawnAgent nodes
  type V3SpawnAgentNode,
  type V3SpawnAgentInput,
  type V3InputProperty,
  type V3InputValue,

  // Union types
  type V3SpecificBlockNode,
  type V3BlockNode,

  // Document nodes
  type V3FrontmatterNode,
  type V3DocumentNode,

  // Utilities
  isV3SpecificNode,
  isV3Document,
  assertNeverV3,
} from './nodes.js';

// Re-export v1 inline nodes (used in V3 paragraphs, headings, etc.)
export {
  type InlineNode,
  type TextNode,
  type BoldNode,
  type ItalicNode,
  type InlineCodeNode,
  type LinkNode,
  type LineBreakNode,
} from '../../ir/nodes.js';

// Re-export v1 block nodes that V3 reuses
export {
  type HeadingNode,
  type ParagraphNode,
  type ListNode,
  type ListItemNode,
  type CodeBlockNode,
  type BlockquoteNode,
  type ThematicBreakNode,
  type TableNode,
  type XmlBlockNode,
  type GroupNode,
  type RawMarkdownNode,
} from '../../ir/nodes.js';
