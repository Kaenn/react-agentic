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
 * Declare a shell variable reference
 *
 * This is a compile-time hook that creates a reference to a shell variable.
 * The actual assignment is specified on <Assign> where you emit it.
 *
 * @param name - Shell variable name (e.g., "PHASE_DIR")
 * @returns VariableRef for use in Assign and string interpolation
 *
 * @example
 * const phaseDir = useVariable("PHASE_DIR");
 *
 * // In JSX - assignment specified at emission point:
 * <Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1`} />
 *
 * // For interpolation:
 * <If test={`[ -z ${phaseDir.ref} ]`}>
 */
export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}

/**
 * Props for the Assign component
 * Specify exactly one of: bash, value, or env
 */
export interface AssignProps {
  /** Variable reference from useVariable */
  var: VariableRef;
  /** Bash command to capture output: VAR=$(command) */
  bash?: string;
  /** Static value: VAR=value (quoted if contains spaces) */
  value?: string;
  /** Environment variable to read: VAR=$ENV_VAR */
  env?: string;
}

/**
 * Assign component - emits shell variable assignment
 *
 * This is a compile-time component. It's never executed at runtime.
 * It emits a bash code block with the variable assignment.
 *
 * @example bash command
 * const phaseDir = useVariable("PHASE_DIR");
 * <Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* | head -1`} />
 * // Outputs: PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* | head -1)
 *
 * @example static value
 * const outputFile = useVariable("OUTPUT_FILE");
 * <Assign var={outputFile} value="/tmp/output.md" />
 * // Outputs: OUTPUT_FILE=/tmp/output.md
 *
 * @example environment variable
 * const phase = useVariable("PHASE");
 * <Assign var={phase} env="PHASE_NUMBER" />
 * // Outputs: PHASE=$PHASE_NUMBER
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
 * const phaseDir = useVariable("PHASE_DIR");
 * <Assign var={phaseDir} bash={`ls -d test`} />
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
 * const configFile = useVariable("CONFIG");
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
 * const outputDir = useVariable("OUT_DIR");
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
 * const result = useVariable("RESULT");
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
 * const result = useVariable("RESULT");
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
 * const status = useVariable("STATUS");
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

// ============================================================================
// Skill Components (Claude Code Skills)
// ============================================================================

/**
 * Props for the Skill component
 */
export interface SkillProps {
  /** Skill name (directory name, lowercase-hyphenated) */
  name: string;
  /** What the skill does and when to use it */
  description: string;
  /** Prevent Claude from auto-invoking (default: false) */
  disableModelInvocation?: boolean;
  /** Hide from slash-command menu (default: true) */
  userInvocable?: boolean;
  /** Tools allowed without permission prompt */
  allowedTools?: string[];
  /** Argument placeholder hint (e.g., "[filename]") */
  argumentHint?: string;
  /** Model override for skill execution */
  model?: string;
  /** Run in subagent context */
  context?: 'fork';
  /** Subagent type when context='fork' */
  agent?: string;
  /** Skill body content */
  children?: ReactNode;
}

/**
 * Props for the SkillFile component
 */
export interface SkillFileProps {
  /** Output filename (e.g., "reference.md", "examples/basic.md") */
  name: string;
  /** File content */
  children?: ReactNode;
}

/**
 * Props for the SkillStatic component
 */
export interface SkillStaticProps {
  /** Source path relative to TSX file */
  src: string;
  /** Destination path relative to skill directory (defaults to src) */
  dest?: string;
}

/**
 * Skill component - creates a Claude Code skill with SKILL.md and supporting files
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Produces a skill directory at .claude/skills/{name}/.
 *
 * @example
 * <Skill
 *   name="deploy"
 *   description="Deploy the application to production. Use when deploying or releasing code."
 *   disableModelInvocation={true}
 *   allowedTools={['Read', 'Bash(git:*)']}
 *   argumentHint="[environment]"
 * >
 *   <h1>Deploy</h1>
 *   <p>Deploy $ARGUMENTS to the target environment.</p>
 *
 *   <SkillFile name="reference.md">
 *     <p>API reference documentation...</p>
 *   </SkillFile>
 *
 *   <SkillStatic src="scripts/deploy.sh" />
 * </Skill>
 */
export function Skill(_props: SkillProps): null {
  return null;
}

/**
 * SkillFile component - defines a generated file within a skill
 *
 * This is a compile-time component. Must be a child of Skill.
 * Generates a file at .claude/skills/{skill-name}/{name}.
 *
 * @example
 * <SkillFile name="reference.md">
 *   <h1>API Reference</h1>
 *   <p>Detailed documentation...</p>
 * </SkillFile>
 *
 * @example nested path
 * <SkillFile name="examples/basic.md">
 *   <h1>Basic Example</h1>
 * </SkillFile>
 */
export function SkillFile(_props: SkillFileProps): null {
  return null;
}

/**
 * SkillStatic component - copies a static file into a skill
 *
 * This is a compile-time component. Must be a child of Skill.
 * Copies file from src (relative to TSX) to skill directory.
 *
 * @example
 * <SkillStatic src="scripts/deploy.sh" />
 * // Copies to .claude/skills/{skill-name}/scripts/deploy.sh
 *
 * @example with destination override
 * <SkillStatic src="../shared/validate.sh" dest="scripts/validate.sh" />
 * // Copies to .claude/skills/{skill-name}/scripts/validate.sh
 */
export function SkillStatic(_props: SkillStaticProps): null {
  return null;
}

// ============================================================================
// State Management (useStateRef hook + ReadState/WriteState components)
// ============================================================================

/**
 * Reference to a state key created by useStateRef
 * @typeParam TSchema - Type of the state schema (compile-time only)
 */
export interface StateRef<TSchema = unknown> {
  /** State key identifier */
  key: string;
  /** Phantom type marker (compile-time only) */
  _schema?: TSchema;
}

/**
 * Declare a state reference for reading/writing typed state
 *
 * This is a compile-time hook that creates a reference to a state key.
 * The actual state operations happen at runtime via ReadState/WriteState.
 *
 * @typeParam TSchema - TypeScript interface for state shape
 * @param key - State key identifier (e.g., "projectContext")
 * @returns StateRef for use in ReadState/WriteState
 *
 * @example
 * interface ProjectState { name: string; phase: number; }
 * const projectState = useStateRef<ProjectState>("projectContext");
 *
 * // In JSX:
 * <ReadState state={projectState} into={nameVar} field="name" />
 */
export function useStateRef<TSchema = unknown>(key: string): StateRef<TSchema> {
  return { key };
}

/**
 * Props for the ReadState component
 * @typeParam TSchema - State schema type for field path validation
 */
export interface ReadStateProps<TSchema = unknown> {
  /** State reference from useStateRef */
  state: StateRef<TSchema>;
  /** Variable to store the result */
  into: VariableRef;
  /** Optional: nested field path (e.g., "user.preferences.theme") */
  field?: string;
}

/**
 * Props for the WriteState component
 * Specify exactly one of: field+value OR merge
 * @typeParam TSchema - State schema type for field path validation
 */
export interface WriteStateProps<TSchema = unknown> {
  /** State reference from useStateRef */
  state: StateRef<TSchema>;
  /** Field path for single-field write (e.g., "user.name") */
  field?: string;
  /** Value to write - string literal or VariableRef */
  value?: string | VariableRef;
  /** Partial object for merge write */
  merge?: Partial<TSchema>;
}

/**
 * ReadState component - reads typed state values from registry
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits bash JSON read operation.
 *
 * @typeParam TSchema - State schema type for field path validation
 * @example Read entire state
 * const projectState = useStateRef<ProjectState>("projectContext");
 * const stateVar = useVariable("STATE_JSON");
 * <ReadState state={projectState} into={stateVar} />
 *
 * @example Read specific field
 * const nameVar = useVariable("PROJECT_NAME");
 * <ReadState state={projectState} into={nameVar} field="name" />
 *
 * @example Read nested field
 * const themeVar = useVariable("USER_THEME");
 * <ReadState state={projectState} into={themeVar} field="user.preferences.theme" />
 */
export function ReadState<TSchema = unknown>(_props: ReadStateProps<TSchema>): null {
  return null;
}

/**
 * WriteState component - writes typed state values to registry
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits bash JSON write operation.
 *
 * Specify exactly one of: field+value OR merge
 *
 * @typeParam TSchema - State schema type for field path validation
 * @example Write single field (literal value)
 * <WriteState state={projectState} field="name" value="my-project" />
 *
 * @example Write single field (variable reference)
 * const userInput = useVariable("USER_INPUT");
 * <WriteState state={projectState} field="name" value={userInput} />
 *
 * @example Merge partial update
 * <WriteState state={projectState} merge={{ phase: 2, status: "active" }} />
 */
export function WriteState<TSchema = unknown>(_props: WriteStateProps<TSchema>): null {
  return null;
}

// ============================================================================
// MCP Server Configuration
// ============================================================================

/**
 * Props for the MCPServer component
 * Generic MCP server definition supporting all transport types
 */
export interface MCPServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Transport type */
  type: 'stdio' | 'http' | 'sse';
  /** Stdio: executable command (required when type="stdio") */
  command?: string;
  /** Stdio: command arguments */
  args?: string[];
  /** HTTP/SSE: remote URL (required when type="http" or type="sse") */
  url?: string;
  /** HTTP/SSE: request headers */
  headers?: Record<string, string>;
  /** Environment variables passed to server process */
  env?: Record<string, string>;
}

/**
 * Props for MCPStdioServer convenience component
 * Type-safe stdio server definition
 */
export interface MCPStdioServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Executable command */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Props for MCPHTTPServer convenience component
 * Type-safe HTTP/SSE server definition
 */
export interface MCPHTTPServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Remote URL */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
}

/**
 * MCPServer component - defines an MCP server in settings.json
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits to .claude/settings.json mcpServers section.
 *
 * @example Stdio server
 * <MCPServer
 *   name="sqlite"
 *   type="stdio"
 *   command="npx"
 *   args={["-y", "mcp-server-sqlite", "--db-path", "./data/state.db"]}
 *   env={{ DEBUG: "true" }}
 * />
 *
 * @example HTTP server
 * <MCPServer
 *   name="remote-api"
 *   type="http"
 *   url="https://api.example.com/mcp"
 *   headers={{ "Authorization": "Bearer ${API_KEY}" }}
 * />
 */
export function MCPServer(_props: MCPServerProps): null {
  return null;
}

/**
 * MCPStdioServer component - type-safe stdio MCP server definition
 *
 * Convenience wrapper for MCPServer with type="stdio".
 * Provides better TypeScript inference by requiring command prop.
 *
 * @example
 * <MCPStdioServer
 *   name="sqlite"
 *   command="npx"
 *   args={["-y", "mcp-server-sqlite", "--db-path", "./data/state.db"]}
 * />
 */
export function MCPStdioServer(_props: MCPStdioServerProps): null {
  return null;
}

/**
 * MCPHTTPServer component - type-safe HTTP MCP server definition
 *
 * Convenience wrapper for MCPServer with type="http".
 * Provides better TypeScript inference by requiring url prop.
 *
 * @example
 * <MCPHTTPServer
 *   name="remote-api"
 *   url="https://api.example.com/mcp"
 *   headers={{ "Authorization": "Bearer ${API_KEY}" }}
 * />
 */
export function MCPHTTPServer(_props: MCPHTTPServerProps): null {
  return null;
}
