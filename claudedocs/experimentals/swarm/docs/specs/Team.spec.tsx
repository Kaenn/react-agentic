/**
 * @component Team
 * @description Defines a team container for coordinated multi-agent work
 */

import {
  AgentType,
  PluginAgentType,
  Model,
  AgentRef,
  TeamRef,
  defineAgent,
  defineTeam,
  addToTeam,
  createReviewWorkflow,
  batchAgents
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
  ref?: TeamRef;

  /**
   * Unique team identifier
   * Used in file paths: ~/.claude/teams/{name}/
   * @optional if ref is provided
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
// Pattern 1: Using TeamRef and AgentRef (RECOMMENDED)
// -----------------------------------------------------------------------------

// Define agents first
const SecurityAgent = defineAgent('security', PluginAgentType.SecuritySentinel, Model.Sonnet);
const PerfAgent = defineAgent('perf', PluginAgentType.PerformanceOracle, Model.Sonnet);
const ArchAgent = defineAgent('arch', PluginAgentType.ArchitectureStrategist, Model.Opus);

// Define team with members
const ReviewTeam = defineTeam('pr-review', [SecurityAgent, PerfAgent, ArchAgent]);

const TeamRefExample = () => (
  <Team ref={ReviewTeam} description="Comprehensive PR review">
    <Teammate ref={SecurityAgent}>
      <Prompt>Review for security vulnerabilities</Prompt>
    </Teammate>
    <Teammate ref={PerfAgent}>
      <Prompt>Review for performance issues</Prompt>
    </Teammate>
    <Teammate ref={ArchAgent}>
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
  <Team ref={workflow.team}>
    {workflow.agents.map((agent) => (
      <Teammate key={agent.id} ref={agent}>
        <Prompt>Review assigned files</Prompt>
      </Teammate>
    ))}
  </Team>
);

// -----------------------------------------------------------------------------
// Pattern 3: Using batchAgents for multiple similar agents
// -----------------------------------------------------------------------------

const { agents: reviewers, refs } = batchAgents('reviewer', [
  { suffix: 'security', type: PluginAgentType.SecuritySentinel },
  { suffix: 'perf', type: PluginAgentType.PerformanceOracle },
  { suffix: 'arch', type: PluginAgentType.ArchitectureStrategist }
]);

const BatchTeam = defineTeam('batch-review', reviewers);

const BatchTeamExample = () => (
  <Team ref={BatchTeam}>
    <Teammate ref={refs.security}>
      <Prompt>Security review</Prompt>
    </Teammate>
    <Teammate ref={refs.perf}>
      <Prompt>Performance review</Prompt>
    </Teammate>
    <Teammate ref={refs.arch}>
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
    <Teammate name="reviewer-1" type="general-purpose">
      <Prompt>Review code for quality issues</Prompt>
    </Teammate>
  </Team>
);

// Example 2: Team with description and multiple members
const FullTeam = () => (
  <Team name="pr-review-456" description="Reviewing PR #456 - Add user authentication">
    <Teammate name="security" type="security-sentinel">
      <Prompt>Review for security vulnerabilities</Prompt>
    </Teammate>

    <Teammate name="performance" type="performance-oracle">
      <Prompt>Review for performance issues</Prompt>
    </Teammate>

    <Teammate name="architecture" type="architecture-strategist">
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
 *   subagent_type: "security-sentinel",
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
 *   subagent_type: "performance-oracle",
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
 *   subagent_type: "architecture-strategist",
 *   prompt: `Review for architectural concerns`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */
