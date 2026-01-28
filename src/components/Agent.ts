/**
 * Agent Components - Compile-time JSX components
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';
import type { CommandContext } from './Command.js';
import type { ScriptVarProxy, OrScriptVar, AllowScriptVars } from './script-var.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Standard agent status values
 */
export type AgentStatus = 'SUCCESS' | 'BLOCKED' | 'NOT_FOUND' | 'ERROR' | 'CHECKPOINT';

/**
 * Base output interface for all agents
 */
export interface BaseOutput {
  /** Agent completion status */
  status: AgentStatus;
  /** Explanation when blocked */
  blockedBy?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Context available in Agent render props pattern
 * Extends CommandContext with agent-specific fields
 */
export interface AgentContext extends CommandContext {
  /** Space-separated tool names if defined */
  tools?: string;
  /** Model name if specified in agent */
  model?: string;
}

/**
 * Props for the Agent component
 * @typeParam TInput - Type interface for agent input contract (compile-time only)
 * @typeParam TOutput - Type interface for agent output contract (compile-time only)
 */
export interface AgentProps<TInput = unknown, TOutput = unknown> {
  /** Agent name (used in frontmatter and Task() spawning) */
  name: string;
  /** Agent description (used in frontmatter) */
  description: string;
  /** Space-separated tool names (optional) */
  tools?: string;
  /** Terminal color for agent output (optional) */
  color?: string;
  /** Subfolder for output path (optional) - determines namespaced agent name */
  folder?: string;
  /** Model name (optional) - for AgentContext access */
  model?: string;
  /**
   * Agent body content - either regular JSX or render props function
   * Render props: (ctx: AgentContext) => ReactNode
   */
  children?: ReactNode | ((ctx: AgentContext) => ReactNode);
  // TInput and TOutput are compile-time only - used for cross-file type validation
}

// ============================================================================
// AgentRef Types
// ============================================================================

/**
 * Configuration for defining an agent reference
 */
export interface DefineAgentConfig<TInput = unknown> {
  /** Agent name (must match the Agent's name prop) */
  name: string;
  /** Optional path to the agent markdown file for loadFromFile pattern */
  path?: string;
  /** Input type - only for compile-time inference, not used at runtime */
  _inputType?: TInput;
}

/**
 * Type-safe reference to an agent definition
 */
export interface AgentRef<TInput = unknown> {
  /** Agent name for Task() subagent_type */
  name: string;
  /** Optional path for loadFromFile pattern */
  path?: string;
  /** Marker for type guard */
  readonly __isAgentRef: true;
  /** Phantom type for input validation */
  readonly __inputType?: TInput;
}

/**
 * Define a type-safe reference to an agent
 */
export function defineAgent<TInput = unknown>(
  config: DefineAgentConfig<TInput>
): AgentRef<TInput> {
  return {
    name: config.name,
    path: config.path,
    __isAgentRef: true,
  };
}

/**
 * Type guard for AgentRef
 */
export function isAgentRef(value: unknown): value is AgentRef {
  if (!value || typeof value !== 'object') return false;
  return (value as AgentRef).__isAgentRef === true;
}

/**
 * Get agent name from string or AgentRef
 */
export function getAgentName(agent: string | AgentRef): string {
  return isAgentRef(agent) ? agent.name : agent;
}

/**
 * Get agent path from AgentRef (undefined for string)
 */
export function getAgentPath(agent: string | AgentRef): string | undefined {
  return isAgentRef(agent) ? agent.path : undefined;
}

// ============================================================================
// SpawnAgent Types
// ============================================================================

/**
 * Props for the SpawnAgent component
 * @typeParam TInput - Type interface to validate against Agent's contract (compile-time only)
 */
export interface SpawnAgentProps<TInput = unknown> {
  /**
   * Agent to spawn - either:
   * - String: Agent name directly (e.g., 'gsd-researcher')
   * - AgentRef: Type-safe reference from defineAgent()
   */
  agent: string | AgentRef<TInput>;
  /** Model to use - supports {variable} placeholders */
  model: string;
  /** Human-readable description of the task */
  description: string;
  /**
   * Enable "load from file" pattern for spawning.
   */
  loadFromFile?: boolean | string;
  /** Prompt content - supports multi-line and {variable} placeholders */
  prompt?: string;
  /** Variable name containing the prompt (for runtime concatenation) */
  promptVariable?: string;
  /** Typed input - either a variable ref or an object literal */
  input?: Partial<TInput>;
  /** Optional extra instructions appended to the auto-generated prompt */
  children?: ReactNode;
}

/**
 * V3-compatible SpawnAgent props with ScriptVar support
 */
export interface V3SpawnAgentProps<TInput = unknown> {
  /** Agent to spawn - accepts ScriptVar for runtime resolution */
  agent: OrScriptVar<string> | AgentRef<TInput>;
  /** Model to use - supports static string or ScriptVar */
  model: OrScriptVar<string>;
  /** Human-readable description - accepts static or ScriptVar */
  description: OrScriptVar<string>;
  /** Enable "load from file" pattern - accepts ScriptVar */
  loadFromFile?: OrScriptVar<string | boolean>;
  /** Prompt content - supports ScriptVar interpolation */
  prompt?: OrScriptVar<string>;
  /** Typed input - accepts ScriptVar values */
  input?: ScriptVarProxy<TInput> | Partial<AllowScriptVars<TInput>>;
  /** ScriptVar to store the agent's output */
  output?: ScriptVarProxy<string>;
  /** Optional extra instructions */
  children?: ReactNode;
}

// ============================================================================
// OnStatus Types
// ============================================================================

/**
 * Output reference for OnStatus matching
 */
export interface OutputRef {
  agent: string;
}

/**
 * Create an output reference for OnStatus
 */
export function useOutput<T = unknown>(agent: string): OutputRef & { field: (name: keyof T) => string } {
  return {
    agent,
    field: (name: keyof T) => `{${agent}.${String(name)}}`,
  };
}

/**
 * Props for the OnStatus component
 */
export interface OnStatusProps {
  /** Output reference from useOutput */
  output: OutputRef;
  /** Status value to match (SUCCESS, BLOCKED, etc.) */
  status: AgentStatus;
  /** Block content for this status */
  children?: ReactNode;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Agent component - creates a Claude Code agent with frontmatter
 *
 * @typeParam TInput - Type interface for agent input contract
 * @typeParam TOutput - Type interface for agent output contract
 */
export function Agent<TInput = unknown, TOutput = unknown>(_props: AgentProps<TInput, TOutput>): null {
  return null;
}

/**
 * SpawnAgent component - emits Task() syntax inside a Command
 *
 * @typeParam TInput - Type interface to validate against Agent's contract
 */
export function SpawnAgent<TInput = unknown>(_props: SpawnAgentProps<TInput> | V3SpawnAgentProps<TInput>): null {
  return null;
}

/**
 * OnStatus component - conditional block for agent status handling
 */
export function OnStatus(_props: OnStatusProps): null {
  return null;
}
