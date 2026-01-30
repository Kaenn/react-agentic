/**
 * Agent Reference System - Type-safe agent references with path resolution
 *
 * This module provides a compile-time mechanism for referencing agents
 * with full TypeScript type safety while supporting runtime path resolution.
 */

import type { BaseOutput } from './types.js';

/**
 * Agent reference object - provides type-safe agent metadata
 *
 * @typeParam TInput - The agent's input contract type
 * @typeParam TOutput - The agent's output contract type (must extend BaseOutput)
 */
export interface AgentRef<TInput = unknown, TOutput extends BaseOutput = BaseOutput> {
  /** Agent name (used in Task() subagent_type when NOT using file loading) */
  readonly name: string;
  /**
   * Path to the agent's markdown definition file.
   * When provided and loadFromFile is true, the emitter will:
   * 1. Use subagent_type="general-purpose"
   * 2. Prepend "First, read {path}..." to the prompt
   *
   * Supports:
   * - Absolute paths: /Users/...
   * - Home-relative: ~/.claude/agents/...
   * - Project-relative: .claude/agents/...
   */
  readonly path?: string;
  /**
   * Optional description for documentation/tooling
   */
  readonly description?: string;
  // Phantom types for compile-time validation (never exist at runtime)
  readonly _input?: TInput;
  readonly _output?: TOutput;
}

/**
 * Configuration for defineAgent
 */
export interface DefineAgentConfig<TInput = unknown, TOutput extends BaseOutput = BaseOutput> {
  /** Agent name - should match the agent's `name` prop */
  name: string;
  /**
   * Path to the agent's markdown definition file.
   * This enables the "load from file" pattern used by GSD.
   */
  path?: string;
  /** Optional description */
  description?: string;
  // Phantom types inferred from generics
  _input?: TInput;
  _output?: TOutput;
}

/**
 * Create a type-safe agent reference
 *
 * Agent references enable:
 * 1. Type-safe input validation at compile time
 * 2. Type-safe output field access with useOutput()
 * 3. Path resolution for "load from file" pattern
 *
 * @typeParam TInput - The agent's input contract type
 * @typeParam TOutput - The agent's output contract type
 * @param config - Agent configuration
 * @returns A frozen AgentRef object
 *
 * @example
 * // Define agent reference alongside agent
 * export interface PhaseResearcherInput {
 *   phase: string;
 *   phaseName: string;
 * }
 * export interface PhaseResearcherOutput extends BaseOutput {
 *   confidence: 'HIGH' | 'MEDIUM' | 'LOW';
 * }
 *
 * export const PhaseResearcher = defineAgent<PhaseResearcherInput, PhaseResearcherOutput>({
 *   name: "gsd-phase-researcher",
 *   path: "~/.claude/agents/gsd-phase-researcher.md",
 *   description: "Research phase implementation approach",
 * });
 *
 * @example
 * // Use in SpawnAgent with full type safety
 * import { PhaseResearcher, type PhaseResearcherInput } from './gsd-phase-researcher.js';
 *
 * <SpawnAgent
 *   agent={PhaseResearcher}
 *   loadFromFile  // Uses PhaseResearcher.path
 *   input={{
 *     phase: "{phase}",      // TypeScript validates these fields!
 *     phaseName: "{name}",
 *   }}
 * >
 *   Extra instructions here
 * </SpawnAgent>
 */
export function defineAgent<TInput = unknown, TOutput extends BaseOutput = BaseOutput>(
  config: DefineAgentConfig<TInput, TOutput>
): AgentRef<TInput, TOutput> {
  const ref: AgentRef<TInput, TOutput> = {
    name: config.name,
    ...(config.path && { path: config.path }),
    ...(config.description && { description: config.description }),
  };
  // Freeze to prevent accidental mutation
  return Object.freeze(ref);
}

/**
 * Type guard to check if a value is an AgentRef
 */
export function isAgentRef(value: unknown): value is AgentRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof (value as AgentRef).name === 'string'
  );
}

/**
 * Extract the agent name from either a string or AgentRef
 */
export function getAgentName(agent: string | AgentRef): string {
  return typeof agent === 'string' ? agent : agent.name;
}

/**
 * Extract the agent path from an AgentRef, if present
 */
export function getAgentPath(agent: string | AgentRef): string | undefined {
  return typeof agent === 'string' ? undefined : agent.path;
}
