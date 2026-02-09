/**
 * @component OrchestrationPattern
 * @description Documents an orchestration pattern with description and implementation
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface OrchestrationPatternProps {
  /**
   * Pattern name
   * @required
   */
  name: string;

  /**
   * Brief description of what the pattern does
   * @required
   */
  description: string;

  /**
   * When to use this pattern
   * @optional
   */
  useCase?: string[];

  /**
   * Pattern implementation details
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function OrchestrationPattern({ name, description, useCase, children }: OrchestrationPatternProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple pattern
const SimplePattern = () => (
  <OrchestrationPattern name="Parallel Specialists" description="Multiple specialists review code simultaneously">
    <ParallelWorkers
      teamName="code-review"
      workers={[
        { name: 'security', type: 'security-sentinel', prompt: '...' },
        { name: 'performance', type: 'performance-oracle', prompt: '...' }
      ]}
    />
  </OrchestrationPattern>
);

// Example 2: Pattern with use cases
const PatternWithUseCases = () => (
  <OrchestrationPattern
    name="Pipeline"
    description="Sequential stages where each depends on the previous"
    useCase={[
      'Feature implementation with research → plan → implement → test',
      'Data processing with extract → transform → load',
      'Release process with build → test → deploy'
    ]}
  >
    <TaskPipeline>
      <TaskDef id="1" subject="Stage 1" description="First stage" />
      <TaskDef id="2" subject="Stage 2" description="Second stage" blockedBy={['1']} />
      <TaskDef id="3" subject="Stage 3" description="Third stage" blockedBy={['2']} />
    </TaskPipeline>
  </OrchestrationPattern>
);

// Example 3: Complex pattern documentation
const ComplexPattern = () => (
  <OrchestrationPattern
    name="Self-Organizing Swarm"
    description="Workers autonomously claim and complete tasks from a shared pool"
    useCase={['Reviewing many independent files', 'Processing batch items', 'Parallel testing of modules']}
  >
    <Callout type="info">Workers race to claim tasks, naturally load-balancing the work.</Callout>

    <TaskPool
      tasks={[
        { subject: 'Task 1', description: '...' },
        { subject: 'Task 2', description: '...' },
        { subject: 'Task 3', description: '...' }
      ]}
    />

    <Swarm teamName="swarm" workerCount={3}>
      <Prompt>
        {`Claim available tasks, complete them, repeat until no tasks remain.`}
      </Prompt>
    </Swarm>
  </OrchestrationPattern>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ## Orchestration Pattern: Parallel Specialists
 *
 * > Multiple specialists review code simultaneously
 *
 * ### Parallel Workers
 *
 * ```mermaid
 * flowchart TB
 *     Leader[Leader] --> W1[security]
 *     Leader --> W2[performance]
 *     W1 --> Results[Results]
 *     W2 --> Results
 * ```
 *
 * ```javascript
 * // Spawn all workers in parallel
 * Task({
 *   team_name: "code-review",
 *   name: "security",
 *   subagent_type: "security-sentinel",
 *   prompt: `...`,
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "code-review",
 *   name: "performance",
 *   subagent_type: "performance-oracle",
 *   prompt: `...`,
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ## Orchestration Pattern: Pipeline
 *
 * > Sequential stages where each depends on the previous
 *
 * **Use Cases:**
 * - Feature implementation with research → plan → implement → test
 * - Data processing with extract → transform → load
 * - Release process with build → test → deploy
 *
 * ### Task Pipeline
 *
 * ```mermaid
 * flowchart LR
 *     T1[#1 Stage 1] --> T2[#2 Stage 2] --> T3[#3 Stage 3]
 * ```
 *
 * [... TaskDef outputs ...]
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * ## Orchestration Pattern: Self-Organizing Swarm
 *
 * > Workers autonomously claim and complete tasks from a shared pool
 *
 * **Use Cases:**
 * - Reviewing many independent files
 * - Processing batch items
 * - Parallel testing of modules
 *
 * > ℹ️ **Info:** Workers race to claim tasks, naturally load-balancing the work.
 *
 * ### Task Pool (Independent Tasks)
 *
 * | # | Subject | Description |
 * |---|---------|-------------|
 * | 1 | Task 1 | ... |
 * | 2 | Task 2 | ... |
 * | 3 | Task 3 | ... |
 *
 * ### Self-Organizing Swarm
 *
 * ```mermaid
 * flowchart TB
 *     subgraph TaskPool[Task Pool]
 *         T1[Task 1]
 *         T2[Task 2]
 *         T3[Task 3]
 *     end
 *
 *     subgraph Workers[Worker Swarm]
 *         W1[Worker 1]
 *         W2[Worker 2]
 *         W3[Worker 3]
 *     end
 *
 *     TaskPool <-.->|claim & complete| Workers
 * ```
 *
 * [... Swarm code output ...]
 * ```
 */
