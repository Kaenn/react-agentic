import type { ReactNode } from 'react';
import { XmlBlock } from '../../primitives/markdown.js';

/**
 * Structure gathered content into named XML block
 *
 * Wraps children in XmlBlock primitive. Use with InlineField
 * and Preamble for structured context composition.
 *
 * @param props - Component props
 * @param props.name - XML block name (e.g., "planning_context")
 * @param props.children - Structured content (InlineFields, Preambles, markdown, etc.)
 *
 * @example
 * ```tsx
 * import { ComposeContext, InlineField, Preamble } from 'react-agentic/composites';
 *
 * <ComposeContext name="planning_context">
 *   <Preamble>You will use this context to create plans.</Preamble>
 *   <InlineField name="Phase" value={8} />
 *   <InlineField name="Mode" value="standard" />
 * </ComposeContext>
 * ```
 *
 * Emits:
 * ```markdown
 * <planning_context>
 *
 * > You will use this context to create plans.
 *
 * **Phase:** 8
 * **Mode:** standard
 *
 * </planning_context>
 * ```
 */
export interface ComposeContextProps {
  /** XML block name (e.g., "planning_context") */
  name: string;
  /** Structured content (InlineFields, Preambles, markdown, etc.) */
  children: ReactNode;
}

export const ComposeContext = ({ name, children }: ComposeContextProps): ReactNode => {
  return (
    <XmlBlock name={name}>
      {children}
    </XmlBlock>
  );
};
