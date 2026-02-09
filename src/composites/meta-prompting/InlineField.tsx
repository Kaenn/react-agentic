import type { ReactNode } from 'react';
import { Markdown } from '../../primitives/markdown.js';

/**
 * Render inline key-value field in bold format
 *
 * Produces **Name:** value markdown pattern. For dynamic
 * runtime values, compose with <Ref> component manually.
 *
 * @param props - Component props
 * @param props.name - Field name/label
 * @param props.value - Static value (string or number)
 *
 * @example Static value
 * ```tsx
 * import { InlineField } from 'react-agentic/composites';
 *
 * <InlineField name="Phase" value={8} />
 * // Emits: **Phase:** 8
 * ```
 *
 * @example String value
 * ```tsx
 * <InlineField name="Mode" value="standard" />
 * // Emits: **Mode:** standard
 * ```
 *
 * @example Dynamic value (use Ref)
 * ```tsx
 * // For runtime variables, compose manually:
 * import { Markdown, Ref } from 'react-agentic';
 *
 * <Markdown>**Phase:** <Ref value={ctx.phase} /></Markdown>
 * ```
 */
export interface InlineFieldProps {
  /** Field name/label */
  name: string;
  /** Static value (string or number) */
  value: string | number;
}

export const InlineField = ({ name, value }: InlineFieldProps): ReactNode => {
  return <Markdown>{`**${name}:** ${value}`}</Markdown>;
};
