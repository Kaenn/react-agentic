/**
 * Swarm IR Node Types
 *
 * IR nodes for TaskDef and TaskPipeline components.
 * These emit Claude Code's TaskCreate/TaskUpdate syntax.
 */

/**
 * TaskDef IR node - represents a single task definition
 *
 * Emits as TaskCreate({...}) call with optional TaskUpdate for dependencies.
 */
export interface TaskDefNode {
  kind: 'taskDef';
  /** TaskRef.__id for identity resolution across files */
  taskId: string;
  /** TaskRef.subject - human-readable title for TaskCreate.subject */
  subject: string;
  /** TaskRef.name - short label for mermaid diagrams */
  name: string;
  /** Full description for TaskCreate.description */
  description: string;
  /** Present continuous form for spinner display */
  activeForm?: string;
  /** TaskRef.__id values of tasks that must complete first */
  blockedByIds?: string[];
}

/**
 * TaskPipeline IR node - container for sequential/parallel task definitions
 *
 * Emits as:
 * 1. Mermaid flowchart showing task dependencies
 * 2. Batched TaskCreate calls
 * 3. TaskUpdate calls for blockedBy dependencies
 * 4. Summary table of tasks
 */
export interface TaskPipelineNode {
  kind: 'taskPipeline';
  /** Optional title for the pipeline section */
  title?: string;
  /** When true, each task is blocked by the previous task */
  autoChain: boolean;
  /** TaskDef children */
  children: TaskDefNode[];
}

// =============================================================================
// Team Orchestration Nodes
// =============================================================================

/**
 * TeammateNode IR node - represents a single team member spawn
 *
 * Emits as Task({...}) call within a team context.
 */
export interface TeammateNode {
  kind: 'teammate';
  /** WorkerRef.__id for identity resolution */
  workerId: string;
  /** WorkerRef.name - worker identifier */
  workerName: string;
  /** WorkerRef.type - Claude Code subagent_type */
  workerType: string;
  /** WorkerRef.model - default model */
  workerModel?: string;
  /** Short description for Task.description */
  description: string;
  /** Full prompt content (from prop or <Prompt> child) */
  prompt: string;
  /** Override model from prop (takes precedence over workerModel) */
  model?: string;
  /** Run in background (default true) */
  background: boolean;
}

/**
 * TeamNode IR node - represents a team spawn with members
 *
 * Emits as:
 * 1. Teammate({ operation: "spawnTeam", ... }) call
 * 2. Task() calls for each member
 */
export interface TeamNode {
  kind: 'team';
  /** TeamRef.__id for identity resolution */
  teamId: string;
  /** TeamRef.name - team identifier */
  teamName: string;
  /** Team description (optional) */
  description?: string;
  /** Nested teammate definitions */
  children: TeammateNode[];
}

/**
 * ShutdownSequenceNode IR node - represents graceful shutdown
 *
 * Emits as:
 * 1. Teammate({ operation: "requestShutdown", ... }) for each worker
 * 2. Comments about waiting for shutdown_approved
 * 3. Teammate({ operation: "cleanup" }) if includeCleanup is true
 */
export interface ShutdownSequenceNode {
  kind: 'shutdownSequence';
  /** Workers to shutdown (WorkerRef data) */
  workers: Array<{
    workerId: string;    // WorkerRef.__id
    workerName: string;  // WorkerRef.name (used as target_agent_id)
  }>;
  /** Reason for shutdown */
  reason: string;
  /** Whether to include cleanup call */
  includeCleanup: boolean;
  /** Team name for output comments (optional, uses placeholder if not provided) */
  teamName?: string;
  /** Section title */
  title: string;
}
