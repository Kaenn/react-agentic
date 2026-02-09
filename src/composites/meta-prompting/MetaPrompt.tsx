import type { ReactNode } from 'react';

/**
 * Semantic wrapper for meta-prompting context composition
 *
 * Groups GatherContext and ComposeContext for structured context assembly.
 * Pass-through container for organizational clarity.
 *
 * @param props - Component props
 * @param props.children - Context composition content
 *
 * @example
 * ```tsx
 * import { ReadFile } from 'react-agentic';
 * import { MetaPrompt, GatherContext, ComposeContext, InlineField, Preamble } from 'react-agentic/composites';
 *
 * <MetaPrompt>
 *   <GatherContext>
 *     <ReadFile path=".planning/STATE.md" as="STATE" />
 *   </GatherContext>
 *   <ComposeContext name="planning">
 *     <InlineField name="Phase" value={8} />
 *   </ComposeContext>
 * </MetaPrompt>
 * ```
 */
export interface MetaPromptProps {
  /** Context composition content */
  children: ReactNode;
}

export const MetaPrompt = ({ children }: MetaPromptProps): ReactNode => {
  return <>{children}</>;
};
