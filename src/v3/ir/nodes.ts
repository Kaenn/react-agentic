/**
 * V3 IR Node Types
 *
 * Extends the base IR nodes with V3-specific nodes for:
 * - Script variable declarations and references
 * - Runtime function calls
 * - V3 control flow (condition-based, not shell-test based)
 * - User prompts
 *
 * All nodes follow the discriminated union pattern with `kind` property.
 */

import type { BlockNode as V1BlockNode, InlineNode } from '../../ir/nodes.js';

// ============================================================================
// Script Variable Nodes
// ============================================================================

/**
 * Script variable declaration
 *
 * Created from useRuntimeVar<T>('NAME') calls.
 * Tracks the variable name and TypeScript type for validation.
 */
export interface ScriptVarDeclNode {
  kind: 'scriptVarDecl';
  /** Shell variable name (e.g., 'CTX') */
  varName: string;
  /** TypeScript type name for documentation (e.g., 'InitResult') */
  tsType?: string;
}

/**
 * Script variable reference
 *
 * Created from property access on ScriptVar proxies.
 * Tracks the full path for jq expression generation.
 */
export interface ScriptVarRefNode {
  kind: 'scriptVarRef';
  /** Shell variable name (e.g., 'CTX') */
  varName: string;
  /** Property access path (e.g., ['user', 'name']) */
  path: string[];
}

// ============================================================================
// Runtime Function Nodes
// ============================================================================

/**
 * Runtime function call
 *
 * Created from <RuntimeFn.Call args={...} output={...} /> elements.
 * Emits as: VAR=$(node runtime.js fnName '{"args"}')
 */
export interface RuntimeCallNode {
  kind: 'runtimeCall';
  /** Function name in the runtime registry */
  fnName: string;
  /** JSON-serializable arguments */
  args: Record<string, unknown>;
  /** Output variable name to store result */
  outputVar: string;
}

// ============================================================================
// V3 Control Flow Nodes
// ============================================================================

/**
 * V3 condition expression tree
 *
 * Represents parsed condition expressions for V3If.
 * Supports references, literals, and logical operators.
 */
export type V3Condition =
  | V3ConditionRef
  | V3ConditionLiteral
  | V3ConditionNot
  | V3ConditionAnd
  | V3ConditionOr
  | V3ConditionEq
  | V3ConditionNeq
  | V3ConditionGt
  | V3ConditionGte
  | V3ConditionLt
  | V3ConditionLte;

/**
 * Reference to a script variable (truthy check)
 */
export interface V3ConditionRef {
  type: 'ref';
  ref: ScriptVarRefNode;
}

/**
 * Literal boolean value
 */
export interface V3ConditionLiteral {
  type: 'literal';
  value: boolean;
}

/**
 * Logical NOT
 */
export interface V3ConditionNot {
  type: 'not';
  operand: V3Condition;
}

/**
 * Logical AND
 */
export interface V3ConditionAnd {
  type: 'and';
  left: V3Condition;
  right: V3Condition;
}

/**
 * Logical OR
 */
export interface V3ConditionOr {
  type: 'or';
  left: V3Condition;
  right: V3Condition;
}

/**
 * Equality check
 */
export interface V3ConditionEq {
  type: 'eq';
  left: V3Condition;
  right: string | number | boolean;
}

/**
 * Inequality check
 */
export interface V3ConditionNeq {
  type: 'neq';
  left: V3Condition;
  right: string | number | boolean;
}

/**
 * Greater than check
 */
export interface V3ConditionGt {
  type: 'gt';
  left: V3Condition;
  right: number;
}

/**
 * Greater than or equal check
 */
export interface V3ConditionGte {
  type: 'gte';
  left: V3Condition;
  right: number;
}

/**
 * Less than check
 */
export interface V3ConditionLt {
  type: 'lt';
  left: V3Condition;
  right: number;
}

/**
 * Less than or equal check
 */
export interface V3ConditionLte {
  type: 'lte';
  left: V3Condition;
  right: number;
}

/**
 * V3 If node - condition-based conditional
 *
 * Unlike v1 IfNode which has a `test: string` shell expression,
 * V3IfNode has a `condition: V3Condition` tree.
 */
export interface V3IfNode {
  kind: 'v3If';
  /** Parsed condition expression tree */
  condition: V3Condition;
  /** "then" block content */
  children: V3BlockNode[];
}

/**
 * V3 Else node (same as v1, but paired with V3If)
 */
export interface V3ElseNode {
  kind: 'v3Else';
  /** "else" block content */
  children: V3BlockNode[];
}

/**
 * V3 Loop node - bounded iteration
 *
 * Unlike v1 LoopNode which iterates over items,
 * V3LoopNode executes up to `max` times.
 */
export interface V3LoopNode {
  kind: 'v3Loop';
  /** Maximum iteration count */
  max: number;
  /** Optional counter variable name */
  counterVar?: string;
  /** Loop body content */
  children: V3BlockNode[];
}

/**
 * Break node - exit current loop
 */
export interface BreakNode {
  kind: 'break';
  /** Optional message to display */
  message?: string;
}

/**
 * Return node - exit command early
 */
export interface ReturnNode {
  kind: 'return';
  /** Optional status code */
  status?: 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';
  /** Optional message to display */
  message?: string;
}

// ============================================================================
// AskUser Node
// ============================================================================

/**
 * Option for AskUser
 */
export interface AskUserOptionNode {
  value: string;
  label: string;
  description?: string;
}

/**
 * AskUser node - prompt user for input
 *
 * Emits as AskUserQuestion tool syntax.
 */
export interface AskUserNode {
  kind: 'askUser';
  /** Question text */
  question: string;
  /** Available options */
  options: AskUserOptionNode[];
  /** Output variable name */
  outputVar: string;
  /** Optional header/chip label */
  header?: string;
  /** Allow multiple selections */
  multiSelect: boolean;
}

// ============================================================================
// V3 SpawnAgent Node
// ============================================================================

/**
 * V3 SpawnAgent with output capture
 *
 * Extends v1 SpawnAgentNode with output variable binding.
 */
export interface V3SpawnAgentNode {
  kind: 'v3SpawnAgent';
  /** Agent name/reference */
  agent: string;
  /** Model to use */
  model: string;
  /** Human-readable description */
  description: string;
  /** Prompt content or variable */
  prompt?: string;
  /** Input object (alternative to prompt) */
  input?: V3SpawnAgentInput;
  /** Output variable name to store agent result */
  outputVar?: string;
  /** Load agent from file path */
  loadFromFile?: string;
}

/**
 * V3 SpawnAgent input types
 */
export type V3SpawnAgentInput =
  | { type: 'object'; properties: V3InputProperty[] }
  | { type: 'variable'; varName: string };

/**
 * Property in V3 SpawnAgent input object
 */
export interface V3InputProperty {
  name: string;
  value: V3InputValue;
}

/**
 * Value types for V3 SpawnAgent input
 */
export type V3InputValue =
  | { type: 'string'; value: string }
  | { type: 'scriptVarRef'; ref: ScriptVarRefNode }
  | { type: 'json'; value: unknown };

// ============================================================================
// V3 Block Node Union
// ============================================================================

/**
 * V3-specific block nodes
 */
export type V3SpecificBlockNode =
  | ScriptVarDeclNode
  | RuntimeCallNode
  | V3IfNode
  | V3ElseNode
  | V3LoopNode
  | BreakNode
  | ReturnNode
  | AskUserNode
  | V3SpawnAgentNode;

/**
 * Union of V1 and V3 block nodes
 *
 * V3 documents can use both v1 nodes (headings, paragraphs, etc.)
 * and V3-specific nodes (runtime calls, typed conditionals, etc.)
 */
export type V3BlockNode = V1BlockNode | V3SpecificBlockNode;

// ============================================================================
// V3 Document Nodes
// ============================================================================

/**
 * V3 Command frontmatter
 *
 * Same structure as v1 but indicates V3 processing.
 */
export interface V3FrontmatterNode {
  kind: 'v3Frontmatter';
  data: Record<string, unknown>;
}

/**
 * V3 Document root node
 *
 * Represents a V3 command that produces dual output:
 * - COMMAND.md (markdown for Claude)
 * - runtime.js (extracted TypeScript functions)
 */
export interface V3DocumentNode {
  kind: 'v3Document';
  frontmatter?: V3FrontmatterNode;
  /** Script variable declarations */
  scriptVars: ScriptVarDeclNode[];
  /** Runtime function names used (for extraction) */
  runtimeFunctions: string[];
  /** Body content */
  children: V3BlockNode[];
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Type guard for V3-specific nodes
 */
export function isV3SpecificNode(node: unknown): node is V3SpecificBlockNode {
  if (!node || typeof node !== 'object') return false;
  const kind = (node as { kind?: string }).kind;
  return [
    'scriptVarDecl',
    'runtimeCall',
    'v3If',
    'v3Else',
    'v3Loop',
    'break',
    'return',
    'askUser',
    'v3SpawnAgent',
  ].includes(kind ?? '');
}

/**
 * Type guard for V3 document
 */
export function isV3Document(node: unknown): node is V3DocumentNode {
  if (!node || typeof node !== 'object') return false;
  return (node as { kind?: string }).kind === 'v3Document';
}

/**
 * Helper for exhaustiveness checking
 */
export function assertNeverV3(x: never): never {
  throw new Error(`Unexpected V3 node: ${JSON.stringify(x)}`);
}
