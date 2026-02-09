import type { ReactNode } from 'react';
import { Loop, Break, If, type Condition } from '../components/control.js';
import type { RuntimeVarProxy, OrRuntimeVar } from '../components/runtime-var.js';

/**
 * Enhanced loop with built-in break condition support
 *
 * Wraps Loop with a common pattern: iterate until a condition is met,
 * then break with an optional message.
 *
 * @param props - Component props
 * @param props.max - Maximum iterations (required, prevents infinite loops)
 * @param props.counter - Optional counter variable (0-indexed)
 * @param props.breakWhen - Condition that triggers break (checked after body)
 * @param props.breakMessage - Message to display when breaking (optional)
 * @param props.children - Loop body content
 *
 * @example Retry loop with break condition
 * ```tsx
 * import { LoopWithBreak } from 'react-agentic/composites';
 * import { useRuntimeVar, runtimeFn } from 'react-agentic';
 *
 * const result = useRuntimeVar<{ done: boolean; data?: string }>('RESULT');
 * const FetchData = runtimeFn(fetchDataFn);
 *
 * <LoopWithBreak
 *   max={5}
 *   breakWhen={result.done}
 *   breakMessage="Data fetched successfully"
 * >
 *   <FetchData.Call args={{}} output={result} />
 *   <p>Attempt completed, checking result...</p>
 * </LoopWithBreak>
 * ```
 *
 * @example With counter
 * ```tsx
 * const i = useRuntimeVar<number>('I');
 *
 * <LoopWithBreak
 *   max={10}
 *   counter={i}
 *   breakWhen={result.found}
 * >
 *   <p>Iteration {i}, searching...</p>
 * </LoopWithBreak>
 * ```
 *
 * @see {@link Loop} for the underlying iteration primitive
 * @see {@link Break} for the underlying break primitive
 */
export interface LoopWithBreakProps {
  /** Maximum iterations (required for bounded loops) */
  max: OrRuntimeVar<number>;
  /** Optional counter variable (0-indexed) */
  counter?: RuntimeVarProxy<number>;
  /** Condition that triggers break (checked after body execution) */
  breakWhen?: Condition;
  /** Message to display when breaking (optional) */
  breakMessage?: OrRuntimeVar<string>;
  /** Loop body content */
  children?: ReactNode;
}

export const LoopWithBreak = ({
  max,
  counter,
  breakWhen,
  breakMessage,
  children
}: LoopWithBreakProps): ReactNode => {
  return (
    <Loop max={max} counter={counter}>
      {children}
      {breakWhen && (
        <If condition={breakWhen}>
          <Break message={breakMessage} />
        </If>
      )}
    </Loop>
  );
};
