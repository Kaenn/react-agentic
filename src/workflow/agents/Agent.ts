/**
 * JSX component stubs for react-agentic - Agent workflow
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';
import type { VariableRef } from '../../primitives/variables.js';
import type { AgentStatus, BaseOutput } from './types.js';
import type { CommandContext } from '../Command.js';

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

/**
 * Utility type that allows each property to be either the original type or a VariableRef
 * Enables: { key: "string" } OR { key: variableRef }
 */
type AllowVariableRefs<T> = {
  [K in keyof T]: T[K] | VariableRef<T[K]>;
};

/**
 * Props for the SpawnAgent component
 * @typeParam TInput - Type interface to validate against Agent's contract (compile-time only)
 */
export interface SpawnAgentProps<TInput = unknown> {
  /** Agent name to spawn (e.g., 'gsd-researcher') */
  agent: string;
  /** Model to use - supports {variable} placeholders */
  model: string;
  /** Human-readable description of the task */
  description: string;
  /**
   * @deprecated Use `input` prop with typed object or VariableRef instead.
   * Prompt content - supports multi-line and {variable} placeholders
   */
  prompt?: string;
  /**
   * Typed input - either a VariableRef from useVariable() or an object literal.
   * Object literal values can be strings or VariableRefs.
   * Auto-generates structured prompt from Agent's interface contract.
   * Mutually exclusive with prompt prop.
   */
  input?: VariableRef<TInput> | Partial<AllowVariableRefs<TInput>>;
  /**
   * Optional extra instructions appended to the auto-generated prompt.
   * Only used when input prop is provided.
   */
  children?: ReactNode;
  // TInput enables compile-time validation against Agent's interface
}

/**
 * Props for the OnStatus component
 */
export interface OnStatusProps {
  /** Output reference from useOutput */
  output: { agent: string };
  /** Status value to match (SUCCESS, BLOCKED, etc.) */
  status: AgentStatus;
  /** Block content for this status */
  children?: ReactNode;
}

/**
 * Agent component - creates a Claude Code agent with frontmatter
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @typeParam TInput - Type interface for agent input contract (compile-time only)
 * @typeParam TOutput - Type interface for agent output contract (compile-time only, must extend BaseOutput)
 * @example
 * // Define input and output contracts
 * export interface ResearcherInput { phase: string; description: string; }
 * export interface ResearcherOutput extends BaseOutput {
 *   confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
 *   findings?: string[];
 * }
 *
 * // Use generics to declare contracts
 * <Agent<ResearcherInput, ResearcherOutput> name="researcher" description="Research topics" tools="Read Grep Glob">
 *   <h1>Role</h1>
 *   <p>You are a researcher that finds information using code analysis tools.</p>
 * </Agent>
 */
export function Agent<TInput = unknown, TOutput = unknown>(_props: AgentProps<TInput, TOutput>): null {
  return null;
}

/**
 * SpawnAgent component - emits GSD Task() syntax inside a Command
 *
 * This is a compile-time component transformed by react-agentic.
 * It emits Task() function-call syntax, not markdown.
 *
 * @typeParam TInput - Type interface to validate against Agent's contract (compile-time only)
 * @example
 * // Import the Agent's input type
 * import type { ResearcherInput } from './researcher.agent.js';
 *
 * // Use generic to validate against Agent's contract
 * <SpawnAgent<ResearcherInput>
 *   agent="gsd-researcher"
 *   model="{researcher_model}"
 *   description="Research phase requirements"
 *   prompt={`<context>Phase: {phase}</context>`}
 * />
 */
export function SpawnAgent<TInput = unknown>(_props: SpawnAgentProps<TInput>): null {
  return null;
}

/**
 * OnStatus component - conditional block for agent status handling
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits as **On {status}:** pattern.
 *
 * @example
 * const output = useOutput<ResearcherOutput>("researcher");
 *
 * <OnStatus output={output} status="SUCCESS">
 *   <p>Research complete.</p>
 *   <p>Confidence: {output.field('confidence')}</p>
 * </OnStatus>
 * <OnStatus output={output} status="BLOCKED">
 *   <p>Research blocked by: {output.field('blockedBy')}</p>
 * </OnStatus>
 */
export function OnStatus(_props: OnStatusProps): null {
  return null;
}
