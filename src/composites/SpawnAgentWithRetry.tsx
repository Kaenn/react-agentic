import type { ReactNode } from 'react';
import { SpawnAgent } from '../workflow/agents/index.js';
import { Loop, If, Break, type Condition } from '../components/control.js';
import type { AgentRef } from '../workflow/agents/AgentRef.js';
import type { BaseOutput } from '../workflow/agents/types.js';
import type { RuntimeVarProxy, OrRuntimeVar, AllowRuntimeVars } from '../components/runtime-var.js';

/**
 * Enhanced SpawnAgent with built-in retry support
 *
 * Wraps SpawnAgent with a retry loop for resilient agent execution.
 * Automatically retries on non-SUCCESS status until max attempts reached.
 *
 * @param props - Component props (extends SpawnAgentProps)
 * @param props.agent - Agent name or AgentRef
 * @param props.model - Model to use for the agent
 * @param props.description - Task description for the agent
 * @param props.maxRetries - Maximum retry attempts (default: 3)
 * @param props.retryWhen - Custom condition for retry (default: status !== SUCCESS)
 * @param props.output - RuntimeVar to store agent output
 * @param props.loadFromFile - Load agent from file path
 * @param props.input - Input data for the agent
 * @param props.children - Additional instructions for the agent
 *
 * @example Basic retry with default behavior
 * ```tsx
 * import { SpawnAgentWithRetry } from 'react-agentic/composites';
 * import { useRuntimeVar } from 'react-agentic';
 * import type { BaseOutput } from 'react-agentic';
 *
 * const result = useRuntimeVar<BaseOutput>('RESULT');
 *
 * <SpawnAgentWithRetry
 *   agent="data-processor"
 *   model="sonnet"
 *   description="Process the data file"
 *   maxRetries={5}
 *   output={result}
 * />
 * ```
 *
 * @example With custom retry condition
 * ```tsx
 * interface ProcessorOutput extends BaseOutput {
 *   partialData?: string;
 * }
 *
 * const result = useRuntimeVar<ProcessorOutput>('RESULT');
 *
 * <SpawnAgentWithRetry
 *   agent="data-processor"
 *   model="sonnet"
 *   description="Process incrementally"
 *   maxRetries={10}
 *   retryWhen={result.status === 'BLOCKED'}
 *   output={result}
 * >
 *   Continue from partial data: {result.partialData}
 * </SpawnAgentWithRetry>
 * ```
 *
 * @example With AgentRef for type-safe input
 * ```tsx
 * import { MyAgent, type MyAgentInput } from './my-agent.js';
 *
 * <SpawnAgentWithRetry
 *   agent={MyAgent}
 *   loadFromFile
 *   input={{ taskId: "123" } satisfies MyAgentInput}
 *   maxRetries={3}
 *   output={result}
 * />
 * ```
 *
 * @see {@link SpawnAgent} for the underlying agent spawning primitive
 * @see {@link Loop} for the underlying iteration primitive
 */
export interface SpawnAgentWithRetryProps<TInput = unknown, TOutput extends BaseOutput = BaseOutput> {
  /** Agent name or AgentRef */
  agent: string | AgentRef<TInput, TOutput>;
  /** Model to use (opus, sonnet, haiku) */
  model?: OrRuntimeVar<string>;
  /** Task description */
  description?: OrRuntimeVar<string>;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: OrRuntimeVar<number>;
  /** Custom condition for retry (default: non-SUCCESS status triggers retry) */
  retryWhen?: Condition;
  /**
   * Condition to break out of retry loop.
   * Provide this when using retryWhen for the inverse condition.
   * If not provided with retryWhen, loop breaks when retryWhen is falsy.
   */
  breakWhen?: Condition;
  /** RuntimeVar to store agent output */
  output?: RuntimeVarProxy<TOutput>;
  /** Load agent definition from file path */
  loadFromFile?: boolean | string;
  /** Input data for the agent - accepts RuntimeVar values per field */
  input?: RuntimeVarProxy<TInput> | Partial<AllowRuntimeVars<TInput>>;
  /** Additional instructions */
  children?: ReactNode;
}

export const SpawnAgentWithRetry = <TInput = unknown, TOutput extends BaseOutput = BaseOutput>({
  agent,
  model = 'sonnet',
  description = 'Execute agent task',
  maxRetries = 3,
  retryWhen,
  breakWhen,
  output,
  loadFromFile,
  input,
  children
}: SpawnAgentWithRetryProps<TInput, TOutput>): ReactNode => {
  // If no retry condition is provided, the loop runs once and breaks
  // Users can use retryWhen to control when to retry
  // breakWhen provides the inverse condition for exiting the loop

  return (
    <Loop max={maxRetries}>
      <SpawnAgent
        agent={agent}
        model={model}
        description={description}
        output={output as unknown as RuntimeVarProxy<string>}
        loadFromFile={loadFromFile}
        input={input}
      >
        {children}
      </SpawnAgent>
      {retryWhen ? (
        <>
          <If condition={retryWhen}>
            <p>Retry condition met, attempting again...</p>
          </If>
          {breakWhen ? (
            <If condition={breakWhen}>
              <Break message="Agent task completed successfully" />
            </If>
          ) : null}
        </>
      ) : (
        <Break message="Agent task completed" />
      )}
    </Loop>
  );
};
