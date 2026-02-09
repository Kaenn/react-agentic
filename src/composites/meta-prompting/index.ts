/**
 * Meta-prompting composites for context composition
 *
 * Components for structured context gathering and composition,
 * following GSD patterns for file reading and XML block assembly.
 *
 * Import: import { MetaPrompt, GatherContext, ... } from 'react-agentic/composites'
 *
 * @example Full pattern
 * ```tsx
 * import { ReadFile } from 'react-agentic';
 * import { MetaPrompt, GatherContext, ComposeContext, InlineField, Preamble } from 'react-agentic/composites';
 *
 * <MetaPrompt>
 *   <GatherContext>
 *     <ReadFile path=".planning/STATE.md" as="STATE" />
 *   </GatherContext>
 *   <ComposeContext name="planning_context">
 *     <Preamble>Use this context to plan.</Preamble>
 *     <InlineField name="Phase" value={8} />
 *   </ComposeContext>
 * </MetaPrompt>
 * ```
 */

export { MetaPrompt, type MetaPromptProps } from './MetaPrompt.js';
export { GatherContext, type GatherContextProps } from './GatherContext.js';
export { ComposeContext, type ComposeContextProps } from './ComposeContext.js';
export { InlineField, type InlineFieldProps } from './InlineField.js';
export { Preamble, type PreambleProps } from './Preamble.js';
