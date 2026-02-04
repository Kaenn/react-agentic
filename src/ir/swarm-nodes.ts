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
