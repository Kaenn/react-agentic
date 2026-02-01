/**
 * Runtime IR Node Types
 *
 * Node types for runtime-enabled commands:
 * - Runtime variable declarations and references
 * - Runtime function calls
 * - Typed control flow (condition-based)
 * - User prompts
 *
 * All nodes follow the discriminated union pattern with `kind` property.
 */

import type { BaseBlockNode, InlineNode } from './nodes.js';

// ============================================================================
// Runtime Variable Nodes
// ============================================================================

/**
 * Runtime variable declaration
 *
 * Created from useRuntimeVar<T>('NAME') calls.
 * Tracks the variable name and TypeScript type for validation.
 */
export interface RuntimeVarDeclNode {
  kind: 'runtimeVarDecl';
  /** Shell variable name (e.g., 'CTX') */
  varName: string;
  /** TypeScript type name for documentation (e.g., 'InitResult') */
  tsType?: string;
}

/**
 * Runtime variable reference
 *
 * Created from property access on RuntimeVar proxies.
 * Tracks the full path for jq expression generation.
 */
export interface RuntimeVarRefNode {
  kind: 'runtimeVarRef';
  /** Shell variable name (e.g., 'CTX') */
  varName: string;
  /** Property access path (e.g., ['user', 'name']) */
  path: string[];
}

// ============================================================================
// Runtime Function Nodes
// ============================================================================

/**
 * Discriminated union for RuntimeCall argument values
 *
 * Supports:
 * - Literal values (strings, numbers, booleans, null)
 * - RuntimeVar references (ctx.phaseId)
 * - Expressions with descriptions (ternaries, logical ops)
 * - Nested JSON objects/arrays
 */
export type RuntimeCallArgValue =
  | { type: 'literal'; value: string | number | boolean | null }
  | { type: 'runtimeVarRef'; ref: RuntimeVarRefNode }
  | { type: 'expression'; source: string; description: string }
  | { type: 'json'; value: Record<string, RuntimeCallArgValue> | RuntimeCallArgValue[] }
  | { type: 'conditional'; condition: RuntimeVarRefNode; whenTrue: RuntimeCallArgValue; whenFalse: RuntimeCallArgValue };

/**
 * Runtime function call
 *
 * Created from <RuntimeFn.Call args={...} output={...} /> elements.
 * Emits as a declarative table for LLM consumption.
 */
export interface RuntimeCallNode {
  kind: 'runtimeCall';
  /** Function name in the runtime registry */
  fnName: string;
  /** Typed arguments with proper handling of RuntimeVar references */
  args: Record<string, RuntimeCallArgValue>;
  /** Output variable name to store result */
  outputVar: string;
}

// ============================================================================
// Condition Types
// ============================================================================

/**
 * Condition expression tree
 *
 * Represents parsed condition expressions for If.
 * Supports references, literals, and logical operators.
 */
export type Condition =
  | ConditionRef
  | ConditionLiteral
  | ConditionNot
  | ConditionAnd
  | ConditionOr
  | ConditionEq
  | ConditionNeq
  | ConditionGt
  | ConditionGte
  | ConditionLt
  | ConditionLte;

/**
 * Reference to a runtime variable (truthy check)
 */
export interface ConditionRef {
  type: 'ref';
  ref: RuntimeVarRefNode;
}

/**
 * Literal boolean value
 */
export interface ConditionLiteral {
  type: 'literal';
  value: boolean;
}

/**
 * Logical NOT
 */
export interface ConditionNot {
  type: 'not';
  operand: Condition;
}

/**
 * Logical AND
 */
export interface ConditionAnd {
  type: 'and';
  left: Condition;
  right: Condition;
}

/**
 * Logical OR
 */
export interface ConditionOr {
  type: 'or';
  left: Condition;
  right: Condition;
}

/**
 * Equality check
 */
export interface ConditionEq {
  type: 'eq';
  left: Condition;
  right: string | number | boolean;
}

/**
 * Inequality check
 */
export interface ConditionNeq {
  type: 'neq';
  left: Condition;
  right: string | number | boolean;
}

/**
 * Greater than check
 */
export interface ConditionGt {
  type: 'gt';
  left: Condition;
  right: number;
}

/**
 * Greater than or equal check
 */
export interface ConditionGte {
  type: 'gte';
  left: Condition;
  right: number;
}

/**
 * Less than check
 */
export interface ConditionLt {
  type: 'lt';
  left: Condition;
  right: number;
}

/**
 * Less than or equal check
 */
export interface ConditionLte {
  type: 'lte';
  left: Condition;
  right: number;
}

// ============================================================================
// Control Flow Nodes
// ============================================================================

/**
 * If node - condition-based conditional
 *
 * Uses a Condition tree for typed conditional logic.
 */
export interface IfNode {
  kind: 'if';
  /** Parsed condition expression tree */
  condition: Condition;
  /** "then" block content */
  children: BlockNode[];
}

/**
 * Else node - paired with If
 */
export interface ElseNode {
  kind: 'else';
  /** "else" block content */
  children: BlockNode[];
}

/**
 * Loop node - bounded iteration
 *
 * Executes up to `max` times.
 */
export interface LoopNode {
  kind: 'loop';
  /** Maximum iteration count */
  max: number;
  /** Optional counter variable name */
  counterVar?: string;
  /** Loop body content */
  children: BlockNode[];
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
// SpawnAgent Node
// ============================================================================

/**
 * SpawnAgent with output capture
 */
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  /** Agent name/reference (static string or RuntimeVar) */
  agent: string | RuntimeVarRefNode;
  /** Model to use (static string or RuntimeVar) */
  model: string | RuntimeVarRefNode;
  /** Human-readable description (static string or RuntimeVar) */
  description: string | RuntimeVarRefNode;
  /** Prompt content or variable */
  prompt?: string;
  /** Input object (alternative to prompt) */
  input?: SpawnAgentInput;
  /** Output variable name to store agent result */
  outputVar?: string;
  /** Load agent from file path */
  loadFromFile?: string;
}

/**
 * SpawnAgent input types
 */
export type SpawnAgentInput =
  | { type: 'object'; properties: InputProperty[] }
  | { type: 'variable'; varName: string };

/**
 * Property in SpawnAgent input object
 */
export interface InputProperty {
  name: string;
  value: InputValue;
}

/**
 * Value types for SpawnAgent input
 */
export type InputValue =
  | { type: 'string'; value: string }
  | { type: 'runtimeVarRef'; ref: RuntimeVarRefNode }
  | { type: 'json'; value: unknown };

// ============================================================================
// Block Node Union
// ============================================================================

/**
 * Runtime-specific block nodes
 */
export type RuntimeBlockNode =
  | RuntimeVarDeclNode
  | RuntimeCallNode
  | IfNode
  | ElseNode
  | LoopNode
  | BreakNode
  | ReturnNode
  | AskUserNode
  | SpawnAgentNode;

/**
 * Union of base and runtime block nodes
 */
export type BlockNode = BaseBlockNode | RuntimeBlockNode;

// ============================================================================
// Document Nodes
// ============================================================================

/**
 * Command frontmatter
 */
export interface FrontmatterNode {
  kind: 'frontmatter';
  data: Record<string, unknown>;
}

/**
 * Build-time metadata (not emitted to output)
 */
export interface DocumentMetadata {
  /** Subfolder for output path (e.g., "gsd" → .claude/commands/gsd/cmd.md) */
  folder?: string;
}

/**
 * Document root node
 *
 * Represents a command that produces dual output:
 * - COMMAND.md (markdown for Claude)
 * - runtime.js (extracted TypeScript functions)
 */
export interface DocumentNode {
  kind: 'document';
  frontmatter?: FrontmatterNode;
  /** Build-time metadata (not emitted to output) */
  metadata?: DocumentMetadata;
  /** Runtime variable declarations */
  runtimeVars: RuntimeVarDeclNode[];
  /** Runtime function names used (for extraction) */
  runtimeFunctions: string[];
  /** Body content */
  children: BlockNode[];
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Type guard for runtime-specific nodes
 */
export function isRuntimeNode(node: unknown): node is RuntimeBlockNode {
  if (!node || typeof node !== 'object') return false;
  const kind = (node as { kind?: string }).kind;
  return [
    'runtimeVarDecl',
    'runtimeCall',
    'if',
    'else',
    'loop',
    'break',
    'return',
    'askUser',
    'spawnAgent',
  ].includes(kind ?? '');
}

/**
 * Type guard for document
 */
export function isDocument(node: unknown): node is DocumentNode {
  if (!node || typeof node !== 'object') return false;
  return (node as { kind?: string }).kind === 'document';
}
