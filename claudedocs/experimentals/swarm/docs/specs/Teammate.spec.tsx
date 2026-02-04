/**
 * @component Teammate
 * @description Defines a team member worker that joins a team
 */

import {
  AgentType,
  PluginAgentType,
  Model,
  WorkerRef,
  defineWorker,
  createReviewDefaults,
  createImplementDefaults
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { WorkerRef, defineWorker };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface TeammateProps {
  /**
   * Worker reference - use defineWorker() for type-safe refs
   * If provided, name/type/model are extracted from ref
   * @optional
   */
  worker?: WorkerRef;

  /**
   * Unique name for this teammate within the team
   * @optional if worker is provided
   */
  name?: string;

  /**
   * Agent type - determines behavior and available tools
   * Use AgentType enum for built-in types or PluginAgentType for plugins
   * @optional if worker is provided
   */
  type?: AgentType | PluginAgentType | string;

  /**
   * Short description shown in task list/logs
   * Maps to Task.description
   * @required
   */
  description: string;

  /**
   * Model to use for this teammate
   * @default inherits from worker or parent
   */
  model?: Model;

  /**
   * Whether to run in background
   * @default true
   */
  background?: boolean;

  /**
   * Full instructions - alternative to <Prompt> child
   * Use <Prompt> child for multi-line prompts with full JSX support
   * @optional if <Prompt> child is provided
   */
  prompt?: string;

  /**
   * Children - can be <Prompt> for multi-line instructions
   * <Prompt> supports full BlockContent elements (h1, XmlBlock, Table, etc.)
   * Takes precedence over prompt prop
   * @optional if prompt prop is provided
   */
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Teammate({ name, type, model, background = true, children }: TeammateProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using WorkerRef for type-safe references (RECOMMENDED)
// -----------------------------------------------------------------------------

// Define workers with auto-IDs
const SecurityAuditor = defineWorker('security', PluginAgentType.SecuritySentinel, Model.Sonnet);
const PerformanceAnalyst = defineWorker('perf', PluginAgentType.PerformanceOracle, Model.Sonnet);
const ArchitectReviewer = defineWorker('arch', PluginAgentType.ArchitectureStrategist, Model.Opus);

// Use refs in components
const WorkerRefExample = () => (
  <>
    <Teammate worker={SecurityAuditor} description="Security vulnerability scan">
      <Prompt>Review code for security vulnerabilities</Prompt>
    </Teammate>

    <Teammate worker={PerformanceAnalyst} description="Performance analysis">
      <Prompt>Analyze performance bottlenecks</Prompt>
    </Teammate>

    <Teammate worker={ArchitectReviewer} description="Architecture review">
      <Prompt>Review architectural decisions</Prompt>
    </Teammate>
  </>
);

// -----------------------------------------------------------------------------
// Pattern 2: Using spread defaults for common configurations
// -----------------------------------------------------------------------------

const reviewDefaults = createReviewDefaults(Model.Sonnet);

const SpreadDefaultsExample = () => (
  <>
    <Teammate name="security" type={PluginAgentType.SecuritySentinel} {...reviewDefaults}>
      <Prompt>Security review</Prompt>
    </Teammate>
    <Teammate name="perf" type={PluginAgentType.PerformanceOracle} {...reviewDefaults}>
      <Prompt>Performance review</Prompt>
    </Teammate>
  </>
);

// -----------------------------------------------------------------------------
// Pattern 3: Simple inline (legacy, still supported)
// -----------------------------------------------------------------------------

// Example 1: Simple teammate (using enum)
const SimpleTeammate = () => (
  <Teammate name="worker" type={AgentType.GeneralPurpose} description="Task worker">
    <Prompt>Complete assigned tasks</Prompt>
  </Teammate>
);

// Example 2: Teammate with model override (using enum)
const TeammateWithModel = () => (
  <Teammate name="researcher" type={AgentType.Explore} model={Model.Haiku} description="Find auth files">
    <Prompt>Find all authentication-related files in the codebase</Prompt>
  </Teammate>
);

// Example 3: Synchronous teammate (foreground, using enum)
const SyncTeammate = () => (
  <Teammate name="quick-check" type={AgentType.Bash} background={false} description="Git status check">
    <Prompt>Run git status and return results</Prompt>
  </Teammate>
);

// Example 4: Complex prompt with detailed instructions (using enum)
const DetailedTeammate = () => (
  <Teammate name="security-auditor" type={PluginAgentType.SecuritySentinel} model={Model.Sonnet} description="Security audit">
    <Prompt>
      {`You are a security auditor for this codebase.

Your responsibilities:
1. Review all authentication code in app/services/auth/
2. Check for SQL injection vulnerabilities
3. Verify proper input sanitization
4. Ensure secrets are not hardcoded

When done:
- Send findings to team-lead via Teammate write
- Mark your task as completed
- Include severity ratings for each issue found`}
    </Prompt>
  </Teammate>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * #### worker
 *
 * ```javascript
 * Task({
 *   team_name: "{team}",
 *   name: "worker",
 *   subagent_type: "general-purpose",
 *   description: "Task worker",
 *   prompt: `Complete assigned tasks`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * #### researcher
 *
 * ```javascript
 * Task({
 *   team_name: "{team}",
 *   name: "researcher",
 *   subagent_type: "Explore",
 *   description: "Find auth files",
 *   prompt: `Find all authentication-related files in the codebase`,
 *   model: "haiku",
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * #### quick-check
 *
 * ```javascript
 * Task({
 *   team_name: "{team}",
 *   name: "quick-check",
 *   subagent_type: "Bash",
 *   prompt: `Run git status and return results`,
 *   run_in_background: false
 * })
 * ```
 * ```
 */

/**
 * Example 4 renders to:
 *
 * ```markdown
 * #### security-auditor
 *
 * ```javascript
 * Task({
 *   team_name: "{team}",
 *   name: "security-auditor",
 *   subagent_type: "security-sentinel",
 *   prompt: `You are a security auditor for this codebase.
 *
 * Your responsibilities:
 * 1. Review all authentication code in app/services/auth/
 * 2. Check for SQL injection vulnerabilities
 * 3. Verify proper input sanitization
 * 4. Ensure secrets are not hardcoded
 *
 * When done:
 * - Send findings to team-lead via Teammate write
 * - Mark your task as completed
 * - Include severity ratings for each issue found`,
 *   model: "sonnet",
 *   run_in_background: true
 * })
 * ```
 * ```
 */
