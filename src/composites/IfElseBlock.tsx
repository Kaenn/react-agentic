import type { ReactNode } from 'react';
import { If, Else, type Condition } from '../components/control.js';

/**
 * Enhanced if/else block with unified condition and branches
 *
 * Wraps If and Else primitives with a single component API for common
 * conditional rendering patterns.
 *
 * @param props - Component props
 * @param props.condition - RuntimeVar condition to evaluate (truthy check)
 * @param props.then - Content when condition is truthy
 * @param props.otherwise - Content when condition is falsy (optional)
 *
 * @example Basic conditional
 * ```tsx
 * import { IfElseBlock } from 'react-agentic/composites';
 * import { useRuntimeVar } from 'react-agentic';
 *
 * const ctx = useRuntimeVar<{ error?: string }>('CTX');
 *
 * <IfElseBlock
 *   condition={ctx.error}
 *   then={<p>Error: {ctx.error}</p>}
 *   otherwise={<p>Success!</p>}
 * />
 * ```
 *
 * @example Without else branch
 * ```tsx
 * <IfElseBlock
 *   condition={ctx.verbose}
 *   then={<p>Debug info: {ctx.debugData}</p>}
 * />
 * ```
 *
 * @see {@link If} for the underlying conditional primitive
 * @see {@link Else} for the underlying else primitive
 */
export interface IfElseBlockProps {
  /** RuntimeVar condition to evaluate (truthy = render then, falsy = render otherwise) */
  condition: Condition;
  /** Content when condition is truthy */
  then: ReactNode;
  /** Content when condition is falsy (optional) */
  otherwise?: ReactNode;
}

export const IfElseBlock = ({ condition, then: thenContent, otherwise }: IfElseBlockProps): ReactNode => {
  return (
    <>
      <If condition={condition}>{thenContent}</If>
      {otherwise && <Else>{otherwise}</Else>}
    </>
  );
};
