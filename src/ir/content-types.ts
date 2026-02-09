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
 * - Status handling (OnStatus)
 *
 * Use this type when defining Command children props to allow the full
 * command feature set.
 *
 * @example
 * ```tsx
 * import type { CommandContent } from 'react-agentic';
 * import type { CommandContext } from 'react-agentic';
 * import type { ReactNode } from 'react';
 *
 * interface MyCommandProps {
 *   children?: CommandContent | CommandContent[] | ((ctx: CommandContext) => ReactNode);
 * }
 *
 * // All command-level features are valid
 * <MyCommand>
 *   <SpawnAgent agent="test" model="sonnet" description="Task" />
 *   <If condition={someVar}>
 *     <p>Conditional content</p>
 *   </If>
 * </MyCommand>
 * ```
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
 *
 * Use this type when defining Agent children props to allow the full
 * agent feature set.
 *
 * @example
 * ```tsx
 * import type { AgentContent } from 'react-agentic';
 * import type { AgentContext } from 'react-agentic';
 * import type { ReactNode } from 'react';
 *
 * interface MyAgentProps {
 *   children?: AgentContent | AgentContent[] | ((ctx: AgentContext) => ReactNode);
 * }
 *
 * // All agent-level features are valid
 * <MyAgent>
 *   <If condition={someVar}>
 *     <p>Conditional content</p>
 *   </If>
 *   <AskUser question="Continue?" options={["yes", "no"]} />
 * </MyAgent>
 * ```
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
 * **Excluded from SubComponentContent** (document-level only):
 *
 * These 10 node types are command/agent-level features and will cause
 * TypeScript compile-time errors if used in SubComponentContent:
 *
 * 1. **SpawnAgent** - Agent spawning (kind: 'spawnAgent')
 * 2. **OnStatus** - Status-based conditionals (kind: 'onStatus')
 * 3. **If** - Conditional blocks (kind: 'if')
 * 4. **Else** - Else blocks (kind: 'else')
 * 5. **Loop** - Iteration blocks (kind: 'loop')
 * 6. **Break** - Loop control (kind: 'break')
 * 7. **Return** - Early exit (kind: 'return')
 * 8. **AskUser** - User prompts (kind: 'askUser')
 * 9. **RuntimeVarDecl** - Runtime variable declarations (kind: 'runtimeVarDecl')
 * 10. **RuntimeCall** - Runtime function calls (kind: 'runtimeCall')
 *
 * **Why these restrictions?**
 *
 * SubComponentContent is for presentation components (Card, Section, Panel)
 * that structure markdown output. Document-level features like agent spawning
 * and control flow are orchestration concerns that belong at the Command/Agent
 * top level, not nested inside presentational wrappers.
 *
 * **TypeScript will automatically reject invalid assignments** when you type
 * your component's children prop with SubComponentContent.
 *
 * @example
 * ```tsx
 * import type { SubComponentContent } from 'react-agentic';
 * import type { ReactNode } from 'react';
 *
 * interface CardProps {
 *   title: string;
 *   children?: SubComponentContent | SubComponentContent[];
 * }
 *
 * export function Card({ title, children }: CardProps): ReactNode {
 *   return (
 *     <XmlBlock name="card">
 *       <h2>{title}</h2>
 *       {children}
 *     </XmlBlock>
 *   );
 * }
 *
 * // ✓ VALID - Table is allowed in SubComponentContent
 * <Card title="Overview">
 *   <Table headers={["Name"]} rows={[["Alice"]]} />
 * </Card>
 *
 * // ✗ COMPILE ERROR - SpawnAgent not assignable to SubComponentContent
 * <Card title="Invalid">
 *   <SpawnAgent agent="test" model="sonnet" description="Task" />
 *   // Error: Type 'SpawnAgentNode' is not assignable to type 'SubComponentContent'
 * </Card>
 * ```
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
