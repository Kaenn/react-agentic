/**
 * Claude Code Swarm TSX Examples
 *
 * Demonstrates how to use TSX components to generate markdown documentation
 * for Claude Code swarm orchestrations.
 */

import {
  // Primitives
  Agent,
  Team,
  Teammate,

  // Task Management
  TaskDef,
  TaskPipeline,
  TaskPool,

  // Messages
  Message,
  Broadcast,

  // Patterns
  Pattern,
  ParallelWorkers,
  Swarm,

  // Lifecycle
  ShutdownSequence,
  Lifecycle,
  Workflow,

  // Helpers
  CodeBlock,
  Note,
  Table,
  AgentTypeDef,
  Backend
} from './swarm-tsx-components';

// =============================================================================
// EXAMPLE 1: Parallel Code Review Workflow
// =============================================================================

export const ParallelCodeReviewWorkflow = () => (
  <Workflow
    name="Parallel Code Review"
    description="Multiple specialists review code simultaneously"
    team="pr-review-123"
  >
    <Team name="pr-review-123" description="Reviewing PR #123">
      <Teammate
        name="security"
        type="compound-engineering:review:security-sentinel"
        prompt={`Review PR #123 for security vulnerabilities.

Focus on:
- SQL injection
- XSS vulnerabilities
- Authentication/authorization bypass
- Sensitive data exposure

Send findings to team-lead when done.`}
      />

      <Teammate
        name="performance"
        type="compound-engineering:review:performance-oracle"
        prompt={`Review PR #123 for performance issues.

Focus on:
- N+1 queries
- Missing indexes
- Memory leaks
- Inefficient algorithms

Send findings to team-lead when done.`}
      />

      <Teammate
        name="architecture"
        type="compound-engineering:review:architecture-strategist"
        prompt={`Review PR #123 for architectural concerns.

Focus on:
- Design pattern adherence
- SOLID principles
- Separation of concerns
- Testability

Send findings to team-lead when done.`}
      />
    </Team>

    <ParallelWorkers
      teamName="pr-review-123"
      workers={[
        { name: 'security', type: 'security-sentinel', prompt: 'Review for security...' },
        { name: 'performance', type: 'performance-oracle', prompt: 'Review for performance...' },
        { name: 'architecture', type: 'architecture-strategist', prompt: 'Review for architecture...' }
      ]}
    />

    <ShutdownSequence teammates={['security', 'performance', 'architecture']} />
  </Workflow>
);

// =============================================================================
// EXAMPLE 2: Pipeline Workflow (Research → Plan → Implement → Test)
// =============================================================================

export const PipelineWorkflow = () => (
  <Workflow
    name="Feature Pipeline"
    description="Sequential stages with dependencies"
    team="feature-oauth"
  >
    <TaskPipeline>
      <TaskDef
        id="1"
        subject="Research OAuth providers"
        description="Research OAuth2 best practices and compare providers"
        activeForm="Researching OAuth..."
      />

      <TaskDef
        id="2"
        subject="Create implementation plan"
        description="Design OAuth implementation based on research findings"
        activeForm="Planning..."
        blockedBy={['1']}
      />

      <TaskDef
        id="3"
        subject="Implement OAuth"
        description="Implement OAuth2 authentication according to plan"
        activeForm="Implementing OAuth..."
        blockedBy={['2']}
      />

      <TaskDef
        id="4"
        subject="Write tests"
        description="Write comprehensive tests for OAuth implementation"
        activeForm="Writing tests..."
        blockedBy={['3']}
      />

      <TaskDef
        id="5"
        subject="Final review"
        description="Review complete implementation for security and quality"
        activeForm="Final review..."
        blockedBy={['4']}
      />
    </TaskPipeline>

    <Lifecycle
      steps={[
        {
          name: 'Setup',
          code: `Teammate({ operation: "spawnTeam", team_name: "feature-oauth" })`,
          description: 'Create team and task pipeline'
        },
        {
          name: 'Spawn Workers',
          code: `// Spawn specialized workers for each stage
Task({ team_name: "feature-oauth", name: "researcher", subagent_type: "best-practices-researcher", ... })
Task({ team_name: "feature-oauth", name: "planner", subagent_type: "Plan", ... })
Task({ team_name: "feature-oauth", name: "implementer", subagent_type: "general-purpose", ... })`,
          description: 'Workers wait for their tasks to unblock'
        },
        {
          name: 'Monitor',
          code: `// Tasks auto-unblock as dependencies complete
// Check inbox for progress updates`,
          description: 'Pipeline auto-progresses'
        },
        {
          name: 'Cleanup',
          code: `Teammate({ operation: "cleanup" })`,
          description: 'Clean up team resources'
        }
      ]}
    />
  </Workflow>
);

// =============================================================================
// EXAMPLE 3: Self-Organizing Swarm
// =============================================================================

export const SwarmWorkflow = () => (
  <Workflow
    name="Codebase Review Swarm"
    description="Self-organizing workers claim tasks from a pool"
    team="codebase-review"
  >
    <TaskPool
      tasks={[
        { subject: 'Review user.rb', description: 'Review for security and quality' },
        { subject: 'Review payment.rb', description: 'Review for security and quality' },
        { subject: 'Review api_controller.rb', description: 'Review for security and quality' },
        { subject: 'Review notification_service.rb', description: 'Review for security and quality' }
      ]}
    />

    <Swarm
      teamName="codebase-review"
      workerCount={3}
      workerType="general-purpose"
      prompt={`You are a swarm worker. Your job is to continuously process available tasks.

LOOP:
1. Call TaskList() to see available tasks
2. Find a task with status 'pending' and no owner
3. If found:
   - Claim it: TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME" })
   - Start it: TaskUpdate({ taskId: "X", status: "in_progress" })
   - Do the review work
   - Complete it: TaskUpdate({ taskId: "X", status: "completed" })
   - Send findings to team-lead
   - Go back to step 1
4. If no tasks available:
   - Send idle notification
   - Exit`}
    />

    <Note type="tip">
      Workers self-organize: they race to claim tasks and naturally load-balance.
    </Note>
  </Workflow>
);

// =============================================================================
// EXAMPLE 4: Agent Type Catalog
// =============================================================================

export const AgentTypeCatalog = () => (
  <>
    <h1>Available Agent Types</h1>

    <AgentTypeDef
      name="Explore"
      tools={['Read', 'Glob', 'Grep', 'LS', 'WebFetch', 'WebSearch']}
      model="haiku"
      bestFor={['Codebase exploration', 'File searches', 'Code understanding']}
      example={`Task({
  subagent_type: "Explore",
  description: "Find API endpoints",
  prompt: "Find all API endpoints in this codebase. Be very thorough.",
  model: "haiku"
})`}
    />

    <AgentTypeDef
      name="Plan"
      tools={['Read', 'Glob', 'Grep', 'WebFetch', 'WebSearch']}
      model="inherits"
      bestFor={['Architecture planning', 'Implementation strategies', 'Design decisions']}
      example={`Task({
  subagent_type: "Plan",
  description: "Design auth system",
  prompt: "Create an implementation plan for adding OAuth2 authentication"
})`}
    />

    <AgentTypeDef
      name="general-purpose"
      tools={['All tools (*)']}
      model="inherits"
      bestFor={['Multi-step tasks', 'Research + action', 'Implementation']}
      example={`Task({
  subagent_type: "general-purpose",
  description: "Research and implement",
  prompt: "Research React Query best practices and implement caching for the user API"
})`}
    />

    <AgentTypeDef
      name="Bash"
      tools={['Bash']}
      model="inherits"
      bestFor={['Git operations', 'Command execution', 'System tasks']}
      example={`Task({
  subagent_type: "Bash",
  description: "Run git commands",
  prompt: "Check git status and show recent commits"
})`}
    />
  </>
);

// =============================================================================
// EXAMPLE 5: Backend Configuration Guide
// =============================================================================

export const BackendGuide = () => (
  <>
    <h1>Spawn Backend Configuration</h1>

    <Backend
      type="in-process"
      description="Teammates run as async tasks within the same Node.js process"
      pros={['Fastest startup', 'Lowest overhead', 'Works everywhere']}
      cons={["Can't see teammate output", 'All die if leader dies', 'Harder to debug']}
    />

    <Backend
      type="tmux"
      description="Teammates run as separate Claude instances in tmux panes"
      pros={['See output in real-time', 'Teammates survive leader exit', 'Works in CI']}
      cons={['Slower startup', 'Requires tmux installed', 'More resource usage']}
    />

    <Backend
      type="iterm2"
      description="Teammates run as split panes within iTerm2 window"
      pros={['Visual debugging', 'Native macOS experience', 'No tmux needed']}
      cons={['macOS + iTerm2 only', 'Requires setup', 'Panes die with window']}
    />

    <CodeBlock language="bash" title="Force a specific backend">
      {`# Force in-process (fastest, no visibility)
export CLAUDE_CODE_SPAWN_BACKEND=in-process

# Force tmux (visible panes, persistent)
export CLAUDE_CODE_SPAWN_BACKEND=tmux

# Auto-detect (default)
unset CLAUDE_CODE_SPAWN_BACKEND`}
    </CodeBlock>
  </>
);

// =============================================================================
// EXAMPLE 6: Message Flow Documentation
// =============================================================================

export const MessageFlowExample = () => (
  <>
    <h1>Message Flow Examples</h1>

    <Message type="text" from="team-lead" to="worker-1">
      Please prioritize the auth module. The deadline is tomorrow.
    </Message>

    <Broadcast from="team-lead">
      Status check: Please report your progress
    </Broadcast>

    <Note type="warning">
      Broadcasting sends N separate messages for N teammates. Prefer write for targeted communication.
    </Note>

    <h2>Structured Message Types</h2>

    <Table
      headers={['Type', 'Direction', 'Purpose']}
      rows={[
        ['shutdown_request', 'Leader → Teammate', 'Request graceful shutdown'],
        ['shutdown_approved', 'Teammate → Leader', 'Confirm shutdown'],
        ['idle_notification', 'Teammate → Leader', 'Report idle state'],
        ['task_completed', 'Teammate → Leader', 'Report task completion'],
        ['plan_approval_request', 'Teammate → Leader', 'Request plan approval'],
        ['join_request', 'Agent → Leader', 'Request to join team']
      ]}
    />
  </>
);

// =============================================================================
// EXAMPLE 7: Complete Workflow Template
// =============================================================================

export const CompleteWorkflowTemplate = () => (
  <Workflow
    name="Full Feature Implementation"
    description="Research → Plan → Implement → Test → Review pipeline with parallel reviewers"
    team="feature-x"
  >
    <Note type="info">
      This workflow combines pipeline stages with parallel review at the end.
    </Note>

    <Team name="feature-x" description="Implementing Feature X">
      <Teammate
        name="researcher"
        type="compound-engineering:research:best-practices-researcher"
        prompt="Research best practices for Feature X. Send findings to team-lead."
      />

      <Teammate
        name="planner"
        type="Plan"
        prompt="Wait for research. Create implementation plan. Send to team-lead for approval."
      />

      <Teammate
        name="implementer"
        type="general-purpose"
        prompt="Wait for plan approval. Implement Feature X according to plan."
      />

      <Teammate
        name="tester"
        type="general-purpose"
        prompt="Wait for implementation. Write and run comprehensive tests."
      />
    </Team>

    <TaskPipeline>
      <TaskDef id="1" subject="Research" description="Research best practices" activeForm="Researching..." />
      <TaskDef id="2" subject="Plan" description="Create implementation plan" activeForm="Planning..." blockedBy={['1']} />
      <TaskDef id="3" subject="Implement" description="Implement feature" activeForm="Implementing..." blockedBy={['2']} />
      <TaskDef id="4" subject="Test" description="Write and run tests" activeForm="Testing..." blockedBy={['3']} />
      <TaskDef id="5" subject="Review" description="Final code review" activeForm="Reviewing..." blockedBy={['4']} />
    </TaskPipeline>

    <h3>Final Review Phase (Parallel)</h3>

    <ParallelWorkers
      teamName="feature-x"
      workers={[
        { name: 'security-review', type: 'security-sentinel', prompt: 'Security audit of implementation' },
        { name: 'perf-review', type: 'performance-oracle', prompt: 'Performance analysis' },
        { name: 'arch-review', type: 'architecture-strategist', prompt: 'Architecture compliance check' }
      ]}
    />

    <ShutdownSequence
      teammates={['researcher', 'planner', 'implementer', 'tester', 'security-review', 'perf-review', 'arch-review']}
    />
  </Workflow>
);

// =============================================================================
// RENDER FUNCTION - Convert JSX to Markdown
// =============================================================================

/**
 * Renders a TSX component tree to markdown string
 *
 * In a real implementation, this would use a proper JSX runtime
 * For now, components return strings directly
 */
export function renderToMarkdown(component: () => string): string {
  return component();
}

// Example usage:
// const markdown = renderToMarkdown(ParallelCodeReviewWorkflow);
// fs.writeFileSync('workflow.md', markdown);
