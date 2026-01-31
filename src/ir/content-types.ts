/**
 * Content types for constraining what components are valid in different contexts.
 *
 * These discriminated unions enable TypeScript compile-time errors when users
 * misuse components in different contexts (Command vs Agent vs SubComponent).
 *
 * Purpose: Establishes the type foundation for Phase 31 content validation -
 * users can type their custom component children props to get compile-time safety.
 */

import type { BaseBlockNode } from './nodes.js';
import type { RuntimeBlockNode } from './runtime-nodes.js';

/**
 * CommandContent - Full feature set for Command context
 *
 * Allows all primitives including:
 * - Document structure (headings, paragraphs, lists, tables)
 * - SpawnAgent (agent spawning)
 * - Control flow (If/Else, Loop/Break, Return)
 * - Runtime features (useRuntimeVar, runtimeFn calls)
 * - User interaction (AskUser)
 */
export type CommandContent = BaseBlockNode | RuntimeBlockNode;

/**
 * AgentContent - Full feature set for Agent context
 *
 * Allows all primitives including:
 * - Document structure (headings, paragraphs, lists, tables)
 * - Control flow (If/Else, Loop/Break, Return)
 * - Runtime features (useRuntimeVar, runtimeFn calls)
 * - User interaction (AskUser)
 *
 * Separate type from CommandContent to allow future divergence
 * (e.g., agents may gain or lose features relative to commands).
 */
export type AgentContent = BaseBlockNode | RuntimeBlockNode;

/**
 * SubComponentContent - Restricted subset for nested components
 *
 * Only allows document-level primitives:
 * - Document structure (headings, paragraphs, lists, tables)
 * - Execution context and semantic components
 * - XML blocks and grouping
 *
 * Excludes command/agent-level features:
 * - SpawnAgent (document-level only)
 * - OnStatus (document-level only)
 * - Control flow (If/Else, Loop/Break, Return - document-level only)
 * - Runtime features (useRuntimeVar, runtimeFn calls - document-level only)
 * - User interaction (AskUser - document-level only)
 *
 * This restriction enables component authors to type their children props
 * and get compile-time errors if users try to nest command-level features
 * inside presentation components.
 */
export type SubComponentContent =
  | Extract<
      BaseBlockNode,
      | { kind: 'heading' }
      | { kind: 'paragraph' }
      | { kind: 'list' }
      | { kind: 'codeBlock' }
      | { kind: 'blockquote' }
      | { kind: 'thematicBreak' }
      | { kind: 'table' }
      | { kind: 'executionContext' }
      | { kind: 'successCriteria' }
      | { kind: 'offerNext' }
      | { kind: 'xmlBlock' }
      | { kind: 'group' }
      | { kind: 'raw' }
      | { kind: 'indent' }
      | { kind: 'step' }
    >;
