/**
 * JSX component stubs for react-agentic - Template primitives
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Props for the PromptTemplate component
 */
export interface PromptTemplateProps {
  /** Template content - wrapped in markdown code fence */
  children?: ReactNode;
}

/**
 * PromptTemplate component - wrap content in markdown code fence
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Wraps children in a markdown code fence
 * to prevent nested escaping issues.
 *
 * @example Basic usage
 * <PromptTemplate>
 *   <XmlBlock name="objective">
 *     Research Phase {'{phase_number}'}
 *   </XmlBlock>
 * </PromptTemplate>
 *
 * // Output:
 * // ```markdown
 * // <objective>
 * // Research Phase {phase_number}
 * // </objective>
 * // ```
 *
 * @example With multiple blocks
 * <PromptTemplate>
 *   ## Instructions
 *
 *   <rules>
 *   - Rule 1
 *   - Rule 2
 *   </rules>
 * </PromptTemplate>
 *
 * // Output:
 * // ```markdown
 * // ## Instructions
 * //
 * // <rules>
 * // - Rule 1
 * // - Rule 2
 * // </rules>
 * // ```
 *
 * Replaces manual escaping:
 * {`\`\`\`markdown
 * <objective>...
 * \`\`\``}
 */
export function PromptTemplate(_props: PromptTemplateProps): null {
  return null;
}
