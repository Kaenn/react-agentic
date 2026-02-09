import type { ReactNode } from 'react';

/**
 * Render preamble text in blockquote for visual distinction
 *
 * Wraps children in blockquote for introductory context.
 * Use at the start of ComposeContext blocks.
 *
 * @param props - Component props
 * @param props.children - Introductory text content
 *
 * @example
 * ```tsx
 * import { Preamble } from 'react-agentic/composites';
 *
 * <Preamble>
 *   You will use this context to create executable phase plans.
 *   Output consumed by /gsd:execute-phase.
 * </Preamble>
 * ```
 *
 * Emits:
 * ```markdown
 * > You will use this context to create executable phase plans.
 * > Output consumed by /gsd:execute-phase.
 * ```
 */
export interface PreambleProps {
  /** Introductory text content */
  children: ReactNode;
}

export const Preamble = ({ children }: PreambleProps): ReactNode => {
  return <blockquote>{children}</blockquote>;
};
