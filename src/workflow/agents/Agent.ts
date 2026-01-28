/**
 * JSX component stubs for react-agentic - Agent workflow
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';
import type { VariableRef } from '../../primitives/variables.js';
import type { Context } from '../../primitives/schema.js';
import type { AgentStatus, BaseOutput } from './types.js';
import type { CommandContext } from '../Command.js';
import type { AgentRef } from './AgentRef.js';
import type { ScriptVarProxy, OrScriptVar, AllowScriptVars } from '../../v3/primitives/script-var.js';

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
   * Optional unified context from defineContext()
   * Provides organized access to agents, variables, and files
   */
  context?: Context;
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
  /**
   * Agent to spawn - either:
   * - String: Agent name directly (e.g., 'gsd-researcher')
   * - AgentRef: Type-safe reference from defineAgent()
   *
   * When using AgentRef with loadFromFile, the agent's path is used automatically.
   */
  agent: string | AgentRef<TInput>;
  /** Model to use - supports {variable} placeholders */
  model: string;
  /** Human-readable description of the task */
  description: string;
  /**
   * Enable "load from file" pattern for spawning.
   *
   * When true or a string path is provided:
   * - subagent_type becomes "general-purpose"
   * - Prompt is prefixed with "First, read {path} for your role..."
   *
   * Path resolution:
   * - `loadFromFile={true}` uses AgentRef.path (requires AgentRef with path)
   * - `loadFromFile="~/.claude/agents/my-agent.md"` uses explicit path
   *
   * This matches the GSD pattern where agent definitions live in
   * separate markdown files that get loaded at runtime.
   */
  loadFromFile?: boolean | string;
  /**
   * @deprecated Use `input` prop with typed object or VariableRef instead.
   * Prompt content - supports multi-line and {variable} placeholders
   */
  prompt?: string;
  /**
   * Variable name containing the prompt (for runtime concatenation).
   * When used with loadFromFile, outputs: prompt="prefix" + variableName
   * This matches the GSD pattern where prompts are built at runtime.
   */
  promptVariable?: string;
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
 * V3-compatible SpawnAgent props with ScriptVar support
 *
 * Extends SpawnAgentProps to accept ScriptVar values for runtime interpolation
 * and adds the `output` prop for capturing agent results.
 *
 * @typeParam TInput - Type interface to validate against Agent's contract (compile-time only)
 */
export interface V3SpawnAgentProps<TInput = unknown> {
  /**
   * Agent to spawn - either:
   * - String: Agent name directly (e.g., 'gsd-researcher')
   * - AgentRef: Type-safe reference from defineAgent()
   * - ScriptVar: Runtime-resolved agent name
   */
  agent: OrScriptVar<string> | AgentRef<TInput>;
  /** Model to use - supports static string or ScriptVar for runtime resolution */
  model: OrScriptVar<string>;
  /** Human-readable description of the task. Accepts static or ScriptVar. */
  description: OrScriptVar<string>;
  /**
   * Enable "load from file" pattern for spawning.
   * Accepts boolean, string path, or ScriptVar for runtime resolution.
   */
  loadFromFile?: OrScriptVar<string | boolean>;
  /** Prompt content - supports multi-line and ScriptVar interpolation */
  prompt?: OrScriptVar<string>;
  /**
   * Typed input - either a ScriptVar or an object where each value can be static or ScriptVar.
   * Auto-generates structured prompt from Agent's interface contract.
   */
  input?: ScriptVarProxy<TInput> | Partial<AllowScriptVars<TInput>>;
  /**
   * ScriptVar to store the agent's output.
   * Only available in V3 commands using useRuntimeVar.
   */
  output?: ScriptVarProxy<string>;
  /** Optional extra instructions appended to the auto-generated prompt */
  children?: ReactNode;
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
 *
 * @example
 * // Option 1: String agent name (basic usage)
 * <SpawnAgent<ResearcherInput>
 *   agent="gsd-researcher"
 *   model="{researcher_model}"
 *   description="Research phase requirements"
 *   input={{ phase: "{phase}", phaseName: "{name}" }}
 * />
 *
 * @example
 * // Option 2: AgentRef with loadFromFile (GSD pattern)
 * import { PhaseResearcher } from './gsd-phase-researcher.js';
 *
 * <SpawnAgent
 *   agent={PhaseResearcher}
 *   loadFromFile  // Uses PhaseResearcher.path
 *   model="{researcher_model}"
 *   description="Research Phase {phase}"
 *   input={{
 *     phase: "{phase}",        // TypeScript validates these!
 *     phaseName: "{name}",
 *   }}
 * >
 *   Research how to implement this phase well.
 * </SpawnAgent>
 *
 * // Emits:
 * // Task(
 * //   prompt="First, read ~/.claude/agents/gsd-phase-researcher.md for your role...\n\n<phase>...",
 * //   subagent_type="general-purpose",
 * //   model="{researcher_model}",
 * //   description="Research Phase {phase}"
 * // )
 *
 * @example
 * // Option 3: Explicit loadFromFile path
 * <SpawnAgent
 *   agent="my-agent"
 *   loadFromFile="~/.claude/agents/my-agent.md"
 *   model="sonnet"
 *   description="Do the thing"
 *   input={{ task: "..." }}
 * />
 */
export function SpawnAgent<TInput = unknown>(_props: SpawnAgentProps<TInput> | V3SpawnAgentProps<TInput>): null {
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
