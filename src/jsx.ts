/**
 * JSX component stubs for react-agentic
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Props for the Command component
 */
export interface CommandProps {
  /** Command name (used in frontmatter) */
  name: string;
  /** Command description (used in frontmatter) */
  description: string;
  /** Optional argument hint (maps to argument-hint in frontmatter) */
  argumentHint?: string;
  /** Optional agent name (maps to agent in frontmatter) */
  agent?: string;
  /** Optional list of allowed tools (maps to allowed-tools in frontmatter) */
  allowedTools?: string[];
  /** Command body content */
  children?: ReactNode;
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
  /** Agent body content */
  children?: ReactNode;
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
 * Props for the Markdown component
 */
export interface MarkdownProps {
  /** Raw Markdown content to pass through */
  children?: ReactNode;
}

/**
 * Props for the XmlBlock component
 */
export interface XmlBlockProps {
  /** XML tag name for the block */
  name: string;
  /** Block content */
  children?: ReactNode;
}

/**
 * Command component - creates a Claude Code command with frontmatter
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Command name="my-command" description="Does something useful">
 *   <p>Command instructions here</p>
 * </Command>
 */
export function Command(_props: CommandProps): null {
  return null;
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
 * Markdown component - passes content through as raw Markdown
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <Markdown>
 * ## Pre-formatted Section
 *
 * Content that is already in Markdown format.
 * </Markdown>
 */
export function Markdown(_props: MarkdownProps): null {
  return null;
}

/**
 * XmlBlock component - creates a named XML block
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime.
 *
 * @example
 * <XmlBlock name="instructions">
 *   <p>Content inside the block</p>
 * </XmlBlock>
 *
 * Outputs:
 * <instructions>
 * Content inside the block
 * </instructions>
 */
export function XmlBlock(_props: XmlBlockProps): null {
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

// ============================================================================
// Variable Assignment (useVariable hook + Assign component)
// ============================================================================

/**
 * Reference to a shell variable created by useVariable
 * @typeParam T - Phantom type for value (compile-time only)
 */
export interface VariableRef<T = string> {
  /** Shell variable name (e.g., "PHASE_DIR") */
  name: string;
  /** Same as name - for interpolation in bash strings */
  ref: string;
  /** Phantom type marker (compile-time only) */
  _type?: T;
}

/**
 * Assignment specification for useVariable
 * Either a bash command or a static value
 */
export type Assignment<T> =
  | { bash: string }
  | { value: T };

/**
 * Declare a shell variable with bash command or static value
 *
 * This is a compile-time hook. The actual variable assignment is emitted
 * when <Assign var={...} /> is used in the JSX.
 *
 * @param name - Shell variable name (e.g., "PHASE_DIR")
 * @param assignment - Bash command or static value
 * @returns VariableRef for use in Assign and string interpolation
 *
 * @example
 * const phaseDir = useVariable<string>("PHASE_DIR", {
 *   bash: `ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1`
 * });
 *
 * // In JSX:
 * <Assign var={phaseDir} />
 *
 * // For interpolation:
 * <Condition test={`[ -z ${phaseDir.ref} ]`}>
 */
export function useVariable<T = string>(
  name: string,
  _assignment: Assignment<T>
): VariableRef<T> {
  return { name, ref: name };
}

/**
 * Props for the Assign component
 */
export interface AssignProps {
  /** Variable reference from useVariable */
  var: VariableRef;
}

/**
 * Assign component - emits shell variable assignment
 *
 * This is a compile-time component. It's never executed at runtime.
 * It emits a bash code block with the variable assignment.
 *
 * @example
 * const phaseDir = useVariable("PHASE_DIR", { bash: `ls -d test` });
 * <Assign var={phaseDir} />
 *
 * Outputs:
 * ```bash
 * PHASE_DIR=$(ls -d test)
 * ```
 */
export function Assign(_props: AssignProps): null {
  return null;
}

// ============================================================================
// Agent Output Types
// ============================================================================

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

// ============================================================================
// Agent Output Handling (useOutput hook + OnStatus component)
// ============================================================================

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

// ============================================================================
// Conditional Logic (If/Else components)
// ============================================================================

/**
 * Props for the If component
 */
export interface IfProps {
  /** Shell test expression (e.g., "[ -f config.json ]") */
  test: string;
  /** "then" block content */
  children?: ReactNode;
}

/**
 * Props for the Else component
 */
export interface ElseProps {
  /** "otherwise" block content */
  children?: ReactNode;
}

/**
 * If component - conditional block for prose-based conditionals
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits as **If {test}:** pattern.
 *
 * @example
 * <If test="[ -f config.json ]">
 *   <p>Config found, loading...</p>
 * </If>
 *
 * @example with VariableRef interpolation
 * const phaseDir = useVariable("PHASE_DIR", { bash: `ls -d test` });
 * <If test={`[ -z ${phaseDir.ref} ]`}>
 *   <p>No phase directory found.</p>
 * </If>
 */
export function If(_props: IfProps): null {
  return null;
}

/**
 * Else component - optional sibling to If
 *
 * Must appear immediately after a closing </If> tag.
 * It's never executed at runtime. Emits as **Otherwise:** pattern.
 *
 * @example
 * <If test="[ -f config.json ]">
 *   <p>Config found.</p>
 * </If>
 * <Else>
 *   <p>Config missing.</p>
 * </Else>
 */
export function Else(_props: ElseProps): null {
  return null;
}

// ============================================================================
// Shell Test Builders (type-safe test expressions for conditionals)
// ============================================================================

/**
 * Generate shell test for file existence
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -f $VAR_NAME ]
 *
 * @example
 * const configFile = useVariable("CONFIG", { bash: `echo config.json` });
 * <If test={fileExists(configFile)}>
 */
export function fileExists(varRef: VariableRef): string {
  return `[ -f $${varRef.name} ]`;
}

/**
 * Generate shell test for directory existence
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -d $VAR_NAME ]
 *
 * @example
 * const outputDir = useVariable("OUT_DIR", { bash: `echo dist` });
 * <If test={dirExists(outputDir)}>
 */
export function dirExists(varRef: VariableRef): string {
  return `[ -d $${varRef.name} ]`;
}

/**
 * Generate shell test for empty string
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -z $VAR_NAME ]
 *
 * @example
 * const result = useVariable("RESULT", { bash: `grep pattern file` });
 * <If test={isEmpty(result)}>
 *   <p>No matches found.</p>
 * </If>
 */
export function isEmpty(varRef: VariableRef): string {
  return `[ -z $${varRef.name} ]`;
}

/**
 * Generate shell test for non-empty string
 *
 * @param varRef - Variable reference from useVariable
 * @returns Shell test expression: [ -n $VAR_NAME ]
 *
 * @example
 * const result = useVariable("RESULT", { bash: `grep pattern file` });
 * <If test={notEmpty(result)}>
 *   <p>Found matches!</p>
 * </If>
 */
export function notEmpty(varRef: VariableRef): string {
  return `[ -n $${varRef.name} ]`;
}

/**
 * Generate shell test for string equality
 *
 * @param varRef - Variable reference from useVariable
 * @param value - Value to compare against (string literal)
 * @returns Shell test expression: [ $VAR_NAME = value ]
 *
 * @example
 * const status = useVariable("STATUS", { bash: `echo $?` });
 * <If test={equals(status, "0")}>
 *   <p>Success!</p>
 * </If>
 */
export function equals(varRef: VariableRef, value: string): string {
  return `[ $${varRef.name} = ${value} ]`;
}

/**
 * Compose multiple tests with AND (&&)
 *
 * @param tests - Test expressions to combine
 * @returns Combined test: test1 && test2 && ...
 *
 * @example
 * <If test={and(fileExists(config), notEmpty(result))}>
 *   <p>Config exists AND result is not empty.</p>
 * </If>
 */
export function and(...tests: string[]): string {
  return tests.join(' && ');
}

/**
 * Compose multiple tests with OR (||)
 *
 * @param tests - Test expressions to combine
 * @returns Combined test: test1 || test2 || ...
 *
 * @example
 * <If test={or(fileExists(jsonConfig), fileExists(yamlConfig))}>
 *   <p>Found either JSON or YAML config.</p>
 * </If>
 */
export function or(...tests: string[]): string {
  return tests.join(' || ');
}
