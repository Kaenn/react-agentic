/**
 * @component Swarm
 * @description Defines a self-organizing swarm of workers that claim tasks from a pool
 */

import { AgentType, PluginAgentType, Model } from './enums';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface SwarmProps {
  /**
   * Team name for the swarm
   * @required
   */
  teamName: string;

  /**
   * Number of workers to spawn
   * @required
   */
  workerCount: number;

  /**
   * Agent type for all workers
   * Use AgentType enum for built-in types or PluginAgentType for plugins
   * @default AgentType.GeneralPurpose
   */
  workerType?: AgentType | PluginAgentType | string;

  /**
   * Model to use for workers
   * @optional
   */
  model?: Model;

  /**
   * Worker prompt - use <Prompt> child for complex prompts
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Swarm({ teamName, workerCount, workerType = 'general-purpose', model, children }: SwarmProps) {
  // Implementation renders to markdown with mermaid diagram
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple swarm
const SimpleSwarm = () => (
  <Swarm teamName="file-review" workerCount={3}>
    <Prompt>Claim available tasks, review the file, mark complete, repeat.</Prompt>
  </Swarm>
);

// Example 2: Swarm with custom type and model (using enums)
const CustomSwarm = () => (
  <Swarm teamName="security-scan" workerCount={5} workerType={PluginAgentType.SecuritySentinel} model={Model.Sonnet}>
    <Prompt>
      {`You are a security scanner in a swarm.

LOOP:
1. Call TaskList() to find pending tasks
2. Claim an unclaimed task
3. Scan the file for security issues
4. Report findings to team-lead
5. Mark task complete
6. Repeat until no tasks remain`}
    </Prompt>
  </Swarm>
);

// Example 3: Full swarm with detailed prompt (using enums)
const DetailedSwarm = () => (
  <Swarm teamName="codebase-review" workerCount={4} workerType={AgentType.GeneralPurpose} model={Model.Haiku}>
    <Prompt>
      {`You are a swarm worker. Your job is to continuously process available tasks.

## Task Claiming Protocol
1. Call TaskList() to see all tasks
2. Find a task that is:
   - status: 'pending'
   - no owner assigned
   - not blocked by other tasks
3. Race condition handling: If claim fails, try another task

## Work Protocol
1. Claim task: TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME" })
2. Start work: TaskUpdate({ taskId: "X", status: "in_progress" })
3. Perform the review/work
4. Complete: TaskUpdate({ taskId: "X", status: "completed" })
5. Report: Teammate({ operation: "write", target_agent_id: "team-lead", value: findings })

## Exit Protocol
1. Check TaskList() for more tasks
2. If no pending tasks available:
   - Send idle notification to team-lead
   - Wait 30 seconds, check again (up to 3 times)
   - If still no tasks, exit gracefully

## Quality Standards
- Be thorough but efficient
- Document all findings clearly
- Include file:line references
- Categorize issues by severity`}
    </Prompt>
  </Swarm>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Self-Organizing Swarm
 *
 * ```mermaid
 * flowchart TB
 *     subgraph TaskPool[Task Pool]
 *         T1[Task 1]
 *         T2[Task 2]
 *         T3[Task 3]
 *         T4[Task 4]
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
 * **Swarm Prompt:**
 * ```
 * Claim available tasks, review the file, mark complete, repeat.
 * ```
 *
 * ```javascript
 * // Spawn 3 workers with identical prompts
 * Task({
 *   team_name: "file-review",
 *   name: "worker-1",
 *   subagent_type: "general-purpose",
 *   prompt: swarmPrompt,
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "file-review",
 *   name: "worker-2",
 *   subagent_type: "general-purpose",
 *   prompt: swarmPrompt,
 *   run_in_background: true
 * })
 *
 * Task({
 *   team_name: "file-review",
 *   name: "worker-3",
 *   subagent_type: "general-purpose",
 *   prompt: swarmPrompt,
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ### Self-Organizing Swarm
 *
 * ```mermaid
 * flowchart TB
 *     subgraph TaskPool[Task Pool]
 *         T1[Task 1]
 *         T2[Task 2]
 *         T3[Task 3]
 *         T4[Task 4]
 *     end
 *
 *     subgraph Workers[Worker Swarm]
 *         W1[Worker 1]
 *         W2[Worker 2]
 *         W3[Worker 3]
 *         W4[Worker 4]
 *         W5[Worker 5]
 *     end
 *
 *     TaskPool <-.->|claim & complete| Workers
 * ```
 *
 * **Swarm Prompt:**
 * ```
 * You are a security scanner in a swarm.
 *
 * LOOP:
 * 1. Call TaskList() to find pending tasks
 * 2. Claim an unclaimed task
 * 3. Scan the file for security issues
 * 4. Report findings to team-lead
 * 5. Mark task complete
 * 6. Repeat until no tasks remain
 * ```
 *
 * ```javascript
 * // Spawn 5 workers with identical prompts
 * Task({
 *   team_name: "security-scan",
 *   name: "worker-1",
 *   subagent_type: "security-sentinel",
 *   prompt: swarmPrompt,
 *   model: "sonnet",
 *   run_in_background: true
 * })
 *
 * // ... (4 more workers)
 * ```
 * ```
 */

// =============================================================================
// SWARM BEST PRACTICES
// =============================================================================

/**
 * 1. Use TaskPool to create independent tasks before spawning swarm
 *
 * 2. Include clear protocols in the prompt:
 *    - Task claiming (how to find and claim tasks)
 *    - Work execution (how to do the actual work)
 *    - Completion (how to mark done and report)
 *    - Exit (when and how to stop)
 *
 * 3. Handle race conditions:
 *    - Multiple workers may try to claim the same task
 *    - If claim fails, try another task
 *
 * 4. Choose appropriate worker count:
 *    - More workers = faster completion
 *    - But diminishing returns with many small tasks
 *    - Consider API rate limits
 *
 * 5. Use haiku model for simple tasks:
 *    - File scanning, simple reviews
 *    - Faster and cheaper
 *
 * 6. Use sonnet/opus for complex tasks:
 *    - Deep analysis, security audits
 *    - Better quality findings
 */
