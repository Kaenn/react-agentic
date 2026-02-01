import type { ReactNode } from 'react';

/**
 * Groups file read operations for context gathering
 *
 * Semantic wrapper around ReadFile components. Pure organizational
 * container - renders children directly.
 *
 * @param props - Component props
 * @param props.children - ReadFile components
 *
 * @example
 * ```tsx
 * import { ReadFile } from 'react-agentic';
 * import { GatherContext } from 'react-agentic/composites';
 *
 * <GatherContext>
 *   <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
 *   <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
 *   <ReadFile path=".planning/CONTEXT.md" as="CONTEXT" optional />
 * </GatherContext>
 * ```
 */
export interface GatherContextProps {
  /** ReadFile components */
  children: ReactNode;
}

export const GatherContext = ({ children }: GatherContextProps): ReactNode => {
  return <>{children}</>;
};
