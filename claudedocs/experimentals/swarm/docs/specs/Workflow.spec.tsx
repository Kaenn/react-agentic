/**
 * @component Workflow
 * @description Top-level container for orchestrating Team, TaskPipeline, and ShutdownSequence
 *
 * Workflow is a BLOCK ELEMENT (not a document type). It can be:
 * - Used inside <Command> for slash commands
 * - Used standalone for markdown documentation
 *
 * For frontmatter (name, description for /command), wrap in <Command>.
 */

import {
  AgentType,
  PluginAgentType,
  Model,
  WorkerRef,
  TeamRef,
  TaskRef,
  defineWorker,
  defineTeam,
  defineTask,
} from './enums';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface WorkflowProps {
  /**
   * Workflow name (used as h2 heading)
   * @required
   */
  name: string;

  /**
   * Team reference - MUST match first <Team> child's team prop
   * Provides context for ShutdownSequence children
   * @required
   */
  team: TeamRef;

  /**
   * Brief description of what the workflow does
   * Rendered as blockquote under heading
   * @optional
   */
  description?: string;

  /**
   * Workflow content - Team, TaskPipeline, ShutdownSequence
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Workflow({ name, team, description, children }: WorkflowProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// VALIDATIONS
// =============================================================================

/**
 * ## Workflow Validations
 *
 * 1. **team prop must match first Team child**
 *    - Error: "Workflow team prop must match Team child"
 *    - Example: <Workflow team={TeamA}><Team team={TeamB}> // ERROR
 *
 * 2. **Only one Team child allowed**
 *    - Error: "Workflow can only contain one Team child"
 *    - For multiple teams, use separate Workflows
 *
 * 3. **team prop is required**
 *    - TeamRef from defineTeam()
 *    - Provides context for ShutdownSequence
 */

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Define refs first
const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
const ReviewTeam = defineTeam('pr-review', [Security, Perf]);

const Research = defineTask('Research approach', 'research');
const Plan = defineTask('Create plan', 'plan');
const Implement = defineTask('Build feature', 'implement');

// -----------------------------------------------------------------------------
// Example 1: Complete Workflow
// -----------------------------------------------------------------------------

const CompleteWorkflow = () => (
  <Workflow name="Feature Review" team={ReviewTeam} description="Code review with parallel specialists">
    <Team team={ReviewTeam} description="Review specialists">
      <Teammate worker={Security} description="Security audit">
        <Prompt>Review for security vulnerabilities. Send findings to team-lead.</Prompt>
      </Teammate>
      <Teammate worker={Perf} description="Performance analysis">
        <Prompt>Review for performance issues. Send findings to team-lead.</Prompt>
      </Teammate>
    </Team>

    <TaskPipeline title="Implementation" autoChain>
      <TaskDef task={Research} description="Research approach" activeForm="Researching..." />
      <TaskDef task={Plan} description="Create plan" activeForm="Planning..." />
      <TaskDef task={Implement} description="Build feature" activeForm="Building..." />
    </TaskPipeline>

    <ShutdownSequence workers={[Security, Perf]} reason="Review complete" />
  </Workflow>
);

// -----------------------------------------------------------------------------
// Example 2: Workflow inside Command
// -----------------------------------------------------------------------------

const WorkflowInCommand = () => (
  <Command name="feature-review" description="Run feature review workflow">
    <h1>Feature Review Pipeline</h1>

    <Workflow name="Phase 1: Review" team={ReviewTeam}>
      <Team team={ReviewTeam}>
        <Teammate worker={Security} description="Security">
          <Prompt>Security review</Prompt>
        </Teammate>
      </Team>
      <ShutdownSequence workers={[Security]} reason="Phase 1 done" />
    </Workflow>
  </Command>
);

// -----------------------------------------------------------------------------
// Example 3: Multiple Workflows (separate teams)
// -----------------------------------------------------------------------------

const BuildTeam = defineTeam('build-team', [
  defineWorker('builder', AgentType.GeneralPurpose),
]);

const MultiPhaseWorkflow = () => (
  <Command name="multi-phase" description="Multi-phase project">
    <h1>Multi-Phase Project</h1>

    <Workflow name="Phase 1: Review" team={ReviewTeam}>
      <Team team={ReviewTeam}>
        <Teammate worker={Security} description="Security">
          <Prompt>Review code</Prompt>
        </Teammate>
      </Team>
      <ShutdownSequence workers={[Security]} cleanup={true} />
    </Workflow>

    <Workflow name="Phase 2: Build" team={BuildTeam}>
      <Team team={BuildTeam}>
        <Teammate worker={BuildTeam.members[0]} description="Builder">
          <Prompt>Build feature</Prompt>
        </Teammate>
      </Team>
      <ShutdownSequence workers={BuildTeam.members} cleanup={true} />
    </Workflow>
  </Command>
);

// -----------------------------------------------------------------------------
// Example 4: Standalone Workflow (no Command)
// -----------------------------------------------------------------------------

const StandaloneWorkflow = () => (
  <Workflow name="Documentation Workflow" team={ReviewTeam} description="For docs only">
    <Team team={ReviewTeam}>
      <Teammate worker={Security} description="Reviewer">
        <Prompt>Review</Prompt>
      </Teammate>
    </Team>
  </Workflow>
);
// Output: Valid markdown without frontmatter

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 (Complete Workflow) renders to:
 *
 * ```markdown
 * ## Workflow: Feature Review
 *
 * > Code review with parallel specialists
 *
 * ---
 *
 * ### Team: pr-review
 *
 * > Review specialists
 *
 * ```javascript
 * Teammate({ operation: "spawnTeam", team_name: "pr-review", description: "Review specialists" })
 * ```
 *
 * #### Members
 *
 * ##### security
 *
 * ```javascript
 * Task({
 *   team_name: "pr-review",
 *   name: "security",
 *   subagent_type: "compound-engineering:review:security-sentinel",
 *   description: "Security audit",
 *   prompt: `Review for security vulnerabilities. Send findings to team-lead.`,
 *   run_in_background: true
 * })
 * ```
 *
 * ##### perf
 *
 * ```javascript
 * Task({
 *   team_name: "pr-review",
 *   name: "perf",
 *   subagent_type: "compound-engineering:review:performance-oracle",
 *   description: "Performance analysis",
 *   prompt: `Review for performance issues. Send findings to team-lead.`,
 *   run_in_background: true
 * })
 * ```
 *
 * ---
 *
 * ### Implementation
 *
 * ```mermaid
 * flowchart LR
 *     T1[research]
 *     T1 --> T2[plan]
 *     T2 --> T3[implement]
 * ```
 *
 * ```javascript
 * // Create all tasks
 * TaskCreate({ subject: "Research approach", description: "Research approach", activeForm: "Researching..." })
 * TaskCreate({ subject: "Create plan", description: "Create plan", activeForm: "Planning..." })
 * TaskCreate({ subject: "Build feature", description: "Build feature", activeForm: "Building..." })
 *
 * // Set up dependencies
 * TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
 * TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
 * ```
 *
 * ---
 *
 * ### Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "Review complete" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "Review complete" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/pr-review/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * // {"type": "shutdown_approved", "from": "perf", ...}
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 2 (Workflow inside Command) renders to:
 *
 * ```markdown
 * ---
 * name: feature-review
 * description: Run feature review workflow
 * ---
 *
 * # Feature Review Pipeline
 *
 * ## Workflow: Phase 1: Review
 *
 * ---
 *
 * ### Team: pr-review
 *
 * [... Team content ...]
 *
 * ---
 *
 * ### Shutdown
 *
 * [... Shutdown content ...]
 * ```
 */

/**
 * Example 4 (Standalone) renders to:
 *
 * ```markdown
 * ## Workflow: Documentation Workflow
 *
 * > For docs only
 *
 * ---
 *
 * ### Team: pr-review
 *
 * [... Team content ...]
 * ```
 *
 * Note: No frontmatter - just valid markdown.
 * Wrap in <Command> if you need frontmatter.
 */

// =============================================================================
// HEADING LEVELS
// =============================================================================

/**
 * ## Heading Hierarchy
 *
 * Workflow uses h2 to allow multiple workflows in one document:
 *
 * ```
 * # User-provided title (optional, in Command)
 *
 * ## Workflow: Phase 1        ← h2
 * ### Team: team-name         ← h3
 * #### Members                ← h4
 * ##### worker-name           ← h5
 * ### TaskPipeline title      ← h3
 * ### Shutdown                ← h3
 *
 * ## Workflow: Phase 2        ← h2
 * ### Team: other-team        ← h3
 * ...
 * ```
 *
 * Children heading levels are adjusted by Workflow emitter.
 */

// =============================================================================
// CONTEXT PROPAGATION
// =============================================================================

/**
 * ## Team Context Propagation
 *
 * ShutdownSequence automatically inherits team from Workflow:
 *
 * ```tsx
 * <Workflow team={MyTeam}>
 *   ...
 *   <ShutdownSequence workers={[Worker1]} />
 *   // ↑ Automatically uses MyTeam for inbox path
 * </Workflow>
 * ```
 *
 * Explicit team prop overrides:
 *
 * ```tsx
 * <Workflow team={MyTeam}>
 *   ...
 *   <ShutdownSequence workers={[Worker1]} team={OtherTeam} />
 *   // ↑ Uses OtherTeam instead of MyTeam
 * </Workflow>
 * ```
 */
