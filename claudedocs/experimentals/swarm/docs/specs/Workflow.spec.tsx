/**
 * @component Workflow
 * @description Top-level container for documenting a complete workflow
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface WorkflowProps {
  /**
   * Workflow name (used as H1 heading)
   * @required
   */
  name: string;

  /**
   * Brief description of what the workflow does
   * @required
   */
  description: string;

  /**
   * Team name used in this workflow
   * @required
   */
  team: string;

  /**
   * Optional tags for categorization
   * @optional
   */
  tags?: string[];

  /**
   * Workflow content - Team, Tasks, Patterns, Lifecycle, etc.
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Workflow({ name, description, team, tags, children }: WorkflowProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple workflow
const SimpleWorkflow = () => (
  <Workflow name="Code Review" description="Parallel specialist review of code changes" team="code-review">
    <Team name="code-review">
      <Teammate name="reviewer" type="general-purpose">
        <Prompt>Review the code</Prompt>
      </Teammate>
    </Team>
  </Workflow>
);

// Example 2: Full workflow with all sections
const FullWorkflow = () => (
  <Workflow
    name="PR Review Pipeline"
    description="Comprehensive PR review with parallel specialists and synthesized report"
    team="pr-review-123"
    tags={['review', 'parallel', 'security']}
  >
    <Note type="info">This workflow spawns multiple specialist reviewers in parallel.</Note>

    <Team name="pr-review-123" description="Reviewing PR #123 - Add OAuth authentication">
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

    <ParallelWorkers
      teamName="pr-review-123"
      workers={[
        { name: 'security', type: 'security-sentinel' },
        { name: 'performance', type: 'performance-oracle' },
        { name: 'architecture', type: 'architecture-strategist' }
      ]}
    >
      <Prompt name="security">Review for security vulnerabilities</Prompt>
      <Prompt name="performance">Review for performance issues</Prompt>
      <Prompt name="architecture">Review for architectural concerns</Prompt>
    </ParallelWorkers>

    <Lifecycle
      steps={[
        { name: 'Setup', code: 'Teammate({ operation: "spawnTeam", ... })' },
        { name: 'Spawn', code: '// Spawn specialists in parallel' },
        { name: 'Review', code: '// Monitor inbox for results' },
        { name: 'Synthesize', code: '// Combine findings' },
        { name: 'Cleanup', code: 'Teammate({ operation: "cleanup" })' }
      ]}
    />

    <ShutdownSequence teammates={['security', 'performance', 'architecture']} />
  </Workflow>
);

// Example 3: Pipeline workflow
const PipelineWorkflow = () => (
  <Workflow
    name="Feature Implementation"
    description="Research → Plan → Implement → Test → Review pipeline"
    team="feature-oauth"
    tags={['pipeline', 'feature', 'implementation']}
  >
    <TaskPipeline title="Implementation Stages">
      <TaskDef id="1" subject="Research" description="Research OAuth best practices" blockedBy={[]} />

      <TaskDef id="2" subject="Plan" description="Create implementation plan" blockedBy={['1']} />

      <TaskDef id="3" subject="Implement" description="Build OAuth endpoints" blockedBy={['2']} />

      <TaskDef id="4" subject="Test" description="Write and run tests" blockedBy={['3']} />

      <TaskDef id="5" subject="Review" description="Final security review" blockedBy={['4']} />
    </TaskPipeline>

    <Team name="feature-oauth">
      <Teammate name="researcher" type="best-practices-researcher">
        <Prompt>Research OAuth2 best practices for Rails</Prompt>
      </Teammate>

      <Teammate name="planner" type="Plan">
        <Prompt>Create detailed implementation plan</Prompt>
      </Teammate>

      <Teammate name="implementer" type="general-purpose">
        <Prompt>Implement OAuth according to plan</Prompt>
      </Teammate>
    </Team>
  </Workflow>
);

// Example 4: Swarm workflow
const SwarmWorkflow = () => (
  <Workflow
    name="Codebase Security Audit"
    description="Self-organizing swarm reviews all critical files"
    team="security-audit"
    tags={['swarm', 'security', 'audit']}
  >
    <TaskPool
      title="Files to Audit"
      tasks={[
        { subject: 'Audit user.rb', description: 'Check user model security' },
        { subject: 'Audit payment.rb', description: 'Check payment model security' },
        { subject: 'Audit auth_controller.rb', description: 'Check auth controller' },
        { subject: 'Audit api_controller.rb', description: 'Check API controller' }
      ]}
    />

    <Swarm teamName="security-audit" workerCount={3} workerType="security-sentinel">
      <Prompt>
        {`Claim files from the task pool and audit for security issues.

Focus on:
- Input validation
- SQL injection
- Authentication/authorization
- Sensitive data handling

Report findings to team-lead.`}
      </Prompt>
    </Swarm>
  </Workflow>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * # Workflow: Code Review
 *
 * > Parallel specialist review of code changes
 *
 * **Team:** `code-review`
 *
 * ---
 *
 * ## Team: code-review
 *
 * [... Team content ...]
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * # Workflow: PR Review Pipeline
 *
 * > Comprehensive PR review with parallel specialists and synthesized report
 *
 * **Team:** `pr-review-123`
 * **Tags:** review, parallel, security
 *
 * ---
 *
 * > ℹ️ **Info:** This workflow spawns multiple specialist reviewers in parallel.
 *
 * ## Team: pr-review-123
 *
 * > Reviewing PR #123 - Add OAuth authentication
 *
 * [... Team members ...]
 *
 * ### Parallel Workers
 *
 * [... ParallelWorkers diagram and code ...]
 *
 * ### Lifecycle
 *
 * [... Lifecycle diagram and steps ...]
 *
 * ### Graceful Shutdown
 *
 * [... Shutdown code ...]
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * # Workflow: Feature Implementation
 *
 * > Research → Plan → Implement → Test → Review pipeline
 *
 * **Team:** `feature-oauth`
 * **Tags:** pipeline, feature, implementation
 *
 * ---
 *
 * ### Implementation Stages
 *
 * ```mermaid
 * flowchart LR
 *     T1[#1 Research] --> T2[#2 Plan] --> T3[#3 Implement]
 *     T3 --> T4[#4 Test] --> T5[#5 Review]
 * ```
 *
 * [... TaskDef outputs ...]
 *
 * ## Team: feature-oauth
 *
 * [... Team members ...]
 * ```
 */
