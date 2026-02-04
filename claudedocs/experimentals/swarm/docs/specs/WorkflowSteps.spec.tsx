/**
 * @component WorkflowSteps
 * @description Documents a complete workflow lifecycle with steps and diagrams
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface WorkflowStep {
  /**
   * Step name (shown in diagram)
   * @required
   */
  name: string;

  /**
   * Code to execute in this step
   * @required
   */
  code: string;

  /**
   * Description of what this step does
   * @optional
   */
  description?: string;
}

interface WorkflowStepsProps {
  /**
   * Title for the workflow steps section
   * @default "Workflow Steps"
   */
  title?: string;

  /**
   * Workflow steps in order
   * @required
   */
  steps: WorkflowStep[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function WorkflowSteps({ title = 'Workflow Steps', steps }: WorkflowStepsProps) {
  // Implementation renders to markdown with mermaid diagram
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple workflow steps
const SimpleWorkflowSteps = () => (
  <WorkflowSteps
    steps={[
      { name: 'Setup', code: 'Teammate({ operation: "spawnTeam", team_name: "my-team" })' },
      { name: 'Work', code: 'Task({ team_name: "my-team", name: "worker", ... })' },
      { name: 'Cleanup', code: 'Teammate({ operation: "cleanup" })' }
    ]}
  />
);

// Example 2: Full workflow steps
const FullWorkflowSteps = () => (
  <WorkflowSteps
    title="Code Review Workflow"
    steps={[
      {
        name: 'Create Team',
        description: 'Initialize team and set up coordination infrastructure',
        code: `Teammate({
  operation: "spawnTeam",
  team_name: "pr-review-123",
  description: "Reviewing PR #123"
})`
      },
      {
        name: 'Create Tasks',
        description: 'Define work items for the team',
        code: `TaskCreate({ subject: "Security review", description: "..." })
TaskCreate({ subject: "Performance review", description: "..." })
TaskCreate({ subject: "Architecture review", description: "..." })`
      },
      {
        name: 'Spawn Workers',
        description: 'Launch specialist agents to work on tasks',
        code: `// Spawn in parallel
Task({ team_name: "pr-review-123", name: "security", ... })
Task({ team_name: "pr-review-123", name: "performance", ... })
Task({ team_name: "pr-review-123", name: "architecture", ... })`
      },
      {
        name: 'Monitor',
        description: 'Track progress and collect results',
        code: `// Check inbox for results
// cat ~/.claude/teams/pr-review-123/inboxes/team-lead.json

// Check task status
TaskList()`
      },
      {
        name: 'Synthesize',
        description: 'Combine findings into final report',
        code: `// Read all findings from inbox
// Create unified review summary
// Post final review comment`
      },
      {
        name: 'Shutdown',
        description: 'Gracefully terminate all workers',
        code: `Teammate({ operation: "requestShutdown", target_agent_id: "security" })
Teammate({ operation: "requestShutdown", target_agent_id: "performance" })
Teammate({ operation: "requestShutdown", target_agent_id: "architecture" })
// Wait for approvals...`
      },
      {
        name: 'Cleanup',
        description: 'Remove team resources',
        code: `Teammate({ operation: "cleanup" })`
      }
    ]}
  />
);

// Example 3: Pipeline workflow steps
const PipelineWorkflowSteps = () => (
  <WorkflowSteps
    title="Feature Implementation Pipeline"
    steps={[
      {
        name: 'Setup',
        code: `Teammate({ operation: "spawnTeam", team_name: "feature-x" })`,
        description: 'Create team for the feature'
      },
      {
        name: 'Define Pipeline',
        code: `TaskCreate({ subject: "Research", ... })
TaskCreate({ subject: "Plan", ... })
TaskCreate({ subject: "Implement", ... })
TaskCreate({ subject: "Test", ... })
TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })`,
        description: 'Create tasks with dependencies'
      },
      {
        name: 'Spawn Workers',
        code: `Task({ name: "researcher", ... })
Task({ name: "planner", ... })
Task({ name: "implementer", ... })
Task({ name: "tester", ... })`,
        description: 'Launch workers for each stage'
      },
      {
        name: 'Execute',
        code: `// Workers auto-progress through pipeline
// Tasks unblock as dependencies complete
// Monitor via TaskList() and inbox`,
        description: 'Pipeline auto-executes'
      },
      {
        name: 'Finalize',
        code: `// Collect final results
// Shutdown workers
// Cleanup team`,
        description: 'Complete and clean up'
      }
    ]}
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Workflow Steps
 *
 * ```mermaid
 * flowchart LR
 *     S0[1. Setup] --> S1[2. Work] --> S2[3. Cleanup]
 * ```
 *
 * #### Step 1: Setup
 *
 * ```javascript
 * Teammate({ operation: "spawnTeam", team_name: "my-team" })
 * ```
 *
 * #### Step 2: Work
 *
 * ```javascript
 * Task({ team_name: "my-team", name: "worker", ... })
 * ```
 *
 * #### Step 3: Cleanup
 *
 * ```javascript
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ### Code Review Workflow
 *
 * ```mermaid
 * flowchart LR
 *     S0[1. Create Team] --> S1[2. Create Tasks] --> S2[3. Spawn Workers]
 *     S2 --> S3[4. Monitor] --> S4[5. Synthesize]
 *     S4 --> S5[6. Shutdown] --> S6[7. Cleanup]
 * ```
 *
 * #### Step 1: Create Team
 *
 * > Initialize team and set up coordination infrastructure
 *
 * ```javascript
 * Teammate({
 *   operation: "spawnTeam",
 *   team_name: "pr-review-123",
 *   description: "Reviewing PR #123"
 * })
 * ```
 *
 * #### Step 2: Create Tasks
 *
 * > Define work items for the team
 *
 * ```javascript
 * TaskCreate({ subject: "Security review", description: "..." })
 * TaskCreate({ subject: "Performance review", description: "..." })
 * TaskCreate({ subject: "Architecture review", description: "..." })
 * ```
 *
 * [... remaining steps ...]
 * ```
 */
