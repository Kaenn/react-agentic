/**
 * TaskPipeline Component
 *
 * Container for TaskDef children that visualizes task dependencies.
 * Emits Mermaid flowchart, batched TaskCreate calls, and summary table.
 */

import type { ReactNode } from 'react';

/**
 * Props for TaskPipeline component
 */
export interface TaskPipelineProps {
  /** Optional title for the pipeline section */
  title?: string;
  /** When true, each task is blocked by the previous task (default: false) */
  autoChain?: boolean;
  /** TaskDef children */
  children: ReactNode;
}

/**
 * TaskPipeline component stub
 *
 * Transformed at compile time to TaskPipelineNode IR.
 * Returns null as it's only used for type checking.
 */
export function TaskPipeline(_props: TaskPipelineProps): null {
  return null;
}
