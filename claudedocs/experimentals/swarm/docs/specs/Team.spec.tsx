/**
 * @component Team
 * @description Defines a team container for coordinated multi-agent work
 */

import {
  AgentType,
  PluginAgentType,
  Model,
  WorkerRef,
  TeamRef,
  defineWorker,
  defineTeam,
  addToTeam,
  createReviewWorkflow,
  batchWorkers
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { TeamRef, defineTeam, addToTeam };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface TeamProps {
  /**
   * Team reference - use defineTeam() for type-safe refs
   * If provided, name is extracted from ref
   * @optional
   */
  team?: TeamRef;

  /**
   * Unique team identifier (legacy - prefer team prop with TeamRef)
   * Used in file paths: ~/.claude/teams/{name}/
   * @optional if team is provided
   */
  name?: string;

  /**
   * Brief description of the team's purpose
   * @optional
   */
  description?: string;

  /**
   * Team members - should contain <Teammate> components
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Team({ name, description, children }: TeamProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using TeamRef and WorkerRef (RECOMMENDED)
// -----------------------------------------------------------------------------

// Define workers first
const Security = defineWorker('security', PluginAgentType.SecuritySentinel, Model.Sonnet);
const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle, Model.Sonnet);
const Arch = defineWorker('arch', PluginAgentType.ArchitectureStrategist, Model.Opus);

// Define team with members
const ReviewTeam = defineTeam('pr-review', [Security, Perf, Arch]);

const TeamRefExample = () => (
  <Team team={ReviewTeam} description="Comprehensive PR review">
    <Teammate worker={Security} description="Security audit">
      <Prompt>Review for security vulnerabilities</Prompt>
    </Teammate>
    <Teammate worker={Perf} description="Performance analysis">
      <Prompt>Review for performance issues</Prompt>
    </Teammate>
    <Teammate worker={Arch} description="Architecture review">
      <Prompt>Review architectural decisions</Prompt>
    </Teammate>
  </Team>
);

// -----------------------------------------------------------------------------
// Pattern 2: Using createReviewWorkflow factory
// -----------------------------------------------------------------------------

const workflow = createReviewWorkflow({
  files: ['user.rb', 'payment.rb'],
  reviewers: [PluginAgentType.SecuritySentinel, PluginAgentType.PerformanceOracle],
  teamName: 'file-review'
});

const WorkflowTeamExample = () => (
  <Team team={workflow.team}>
    {workflow.workers.map((worker) => (
      <Teammate key={worker.__id} worker={worker} description={`Review by ${worker.name}`}>
        <Prompt>Review assigned files</Prompt>
      </Teammate>
    ))}
  </Team>
);

// -----------------------------------------------------------------------------
// Pattern 3: Using batchWorkers for multiple similar workers
// -----------------------------------------------------------------------------

const { workers: reviewers, refs } = batchWorkers('reviewer', [
  { suffix: 'security', type: PluginAgentType.SecuritySentinel },
  { suffix: 'perf', type: PluginAgentType.PerformanceOracle },
  { suffix: 'arch', type: PluginAgentType.ArchitectureStrategist }
]);

const BatchTeam = defineTeam('batch-review', reviewers);

const BatchTeamExample = () => (
  <Team team={BatchTeam}>
    <Teammate worker={refs.security} description="Security audit">
      <Prompt>Security review</Prompt>
    </Teammate>
    <Teammate worker={refs.perf} description="Performance check">
      <Prompt>Performance review</Prompt>
    </Teammate>
    <Teammate worker={refs.arch} description="Architecture review">
      <Prompt>Architecture review</Prompt>
    </Teammate>
  </Team>
);

// -----------------------------------------------------------------------------
// Pattern 4: Simple inline (legacy, still supported)
// -----------------------------------------------------------------------------

// Example 1: Simple team
const SimpleTeam = () => (
  <Team name="code-review">
    <Teammate name="reviewer-1" type="general-purpose" description="Code quality review">
      <Prompt>Review code for quality issues</Prompt>
    </Teammate>
  </Team>
);

// Example 2: Team with description and multiple members
const FullTeam = () => (
  <Team name="pr-review-456" description="Reviewing PR #456 - Add user authentication">
    <Teammate name="security" type="security-sentinel" description="Security audit">
      <Prompt>Review for security vulnerabilities</Prompt>
    </Teammate>

    <Teammate name="performance" type="performance-oracle" description="Performance analysis">
      <Prompt>Review for performance issues</Prompt>
    </Teammate>

    <Teammate name="architecture" type="architecture-strategist" description="Architecture review">
      <Prompt>Review for architectural concerns</Prompt>
    </Teammate>
  </Team>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ## Team: code-review
 *
 * ```javascript
 * Teammate({
 *   operation: "spawnTeam",
 *   team_name: "code-review"
 * })
 * ```
 *
 * ### Members
 *
 * #### reviewer-1
 *
 * ```javascript
 * Task({
 *   team_name: "code-review",
 *   name: "reviewer-1",
 *   subagent_type: "general-purpose",
 *   description: "Code quality review",
 *   prompt: `Review code for quality issues`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ## Team: pr-review-456
 *
 * > Reviewing PR #456 - Add user authentication
 *
 * ```javascript
 * Teammate({
 *   operation: "spawnTeam",
 *   team_name: "pr-review-456",
 *   description: "Reviewing PR #456 - Add user authentication"
 * })
 * ```
 *
 * ### Members
 *
 * #### security
 *
 * ```javascript
 * Task({
 *   team_name: "pr-review-456",
 *   name: "security",
 *   subagent_type: "compound-engineering:review:security-sentinel",
 *   description: "Security audit",
 *   prompt: `Review for security vulnerabilities`,
 *   run_in_background: true
 * })
 * ```
 *
 * #### performance
 *
 * ```javascript
 * Task({
 *   team_name: "pr-review-456",
 *   name: "performance",
 *   subagent_type: "compound-engineering:review:performance-oracle",
 *   description: "Performance analysis",
 *   prompt: `Review for performance issues`,
 *   run_in_background: true
 * })
 * ```
 *
 * #### architecture
 *
 * ```javascript
 * Task({
 *   team_name: "pr-review-456",
 *   name: "architecture",
 *   subagent_type: "compound-engineering:review:architecture-strategist",
 *   description: "Architecture review",
 *   prompt: `Review for architectural concerns`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */
