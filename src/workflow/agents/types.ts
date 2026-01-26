/**
 * JSX component stubs for react-agentic - Agent types
 *
 * Types and utilities for agent output handling.
 */

/**
 * Standard agent return status codes (HTTP-like semantics)
 *
 * - SUCCESS: Agent completed task successfully
 * - BLOCKED: Agent cannot proceed, needs external input/action
 * - NOT_FOUND: Requested resource or information not found
 * - ERROR: Agent encountered an error during execution
 * - CHECKPOINT: Agent reached milestone, pausing for verification
 */
export type AgentStatus =
  | 'SUCCESS'
  | 'BLOCKED'
  | 'NOT_FOUND'
  | 'ERROR'
  | 'CHECKPOINT';

/**
 * Base interface all agent outputs must extend
 *
 * Provides standard structure for agent return values with required
 * status code and optional human-readable message.
 *
 * @example
 * export interface ResearcherOutput extends BaseOutput {
 *   // SUCCESS-specific fields
 *   confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
 *   findings?: string[];
 *   // BLOCKED-specific fields
 *   blockedBy?: string;
 * }
 */
export interface BaseOutput {
  /** Required: Agent completion status */
  status: AgentStatus;
  /** Optional: Human-readable status message */
  message?: string;
}

/**
 * Reference to an agent's output from useOutput
 * @typeParam T - The agent's TOutput type (compile-time only)
 */
export interface OutputRef<T = unknown> {
  /** Agent name this output is bound to */
  agent: string;
  /** Field accessor - returns placeholder for interpolation */
  field: <K extends keyof T>(key: K) => string;
  /** Phantom type marker (compile-time only) */
  _type?: T;
}

/**
 * Bind to a spawned agent's output for status-based handling
 *
 * This is a compile-time hook. The actual output binding happens at runtime
 * when the agent completes. The hook returns an OutputRef for use in OnStatus
 * and field interpolation.
 *
 * @typeParam T - The agent's TOutput type (must extend BaseOutput)
 * @param agentName - Agent name matching SpawnAgent's agent prop
 * @returns OutputRef for use in OnStatus and field interpolation
 *
 * @example
 * import type { ResearcherOutput } from './researcher.agent.js';
 *
 * const output = useOutput<ResearcherOutput>("researcher");
 *
 * // In JSX:
 * <OnStatus output={output} status="SUCCESS">
 *   <p>Research complete with {output.field('confidence')} confidence.</p>
 * </OnStatus>
 */
export function useOutput<T extends BaseOutput = BaseOutput>(
  agentName: string
): OutputRef<T> {
  return {
    agent: agentName,
    field: (key) => `{output.${String(key)}}`,
  };
}
