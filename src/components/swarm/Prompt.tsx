/**
 * Prompt Component
 *
 * Contains multi-line prompt content for a Teammate.
 * Supports full JSX content including XmlBlock, lists, headings, etc.
 */

import type { ReactNode } from 'react';

/**
 * Props for Prompt component
 */
export interface PromptProps {
  /** Full JSX content for the prompt */
  children: ReactNode;
}

/**
 * Prompt component stub
 *
 * Transformed at compile time - content extracted by Teammate transformer.
 * Returns null as it's only used for type checking.
 */
export function Prompt(_props: PromptProps): null {
  return null;
}
