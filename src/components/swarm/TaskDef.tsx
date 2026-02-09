/**
 * TaskDef Component
 *
 * Defines a single task within a TaskPipeline or standalone.
 * Emits as Claude Code's TaskCreate syntax.
 */

import type { ReactNode } from 'react';
import type { TaskRef } from './refs.js';

/**
 * Props for TaskDef component
 */
export interface TaskDefProps {
  /** Task reference created with defineTask() */
  task: TaskRef;
  /** Full prompt/description of what the task accomplishes (alternative to <Prompt> child) */
  prompt?: string;
  /** Present continuous form for spinner display (e.g., "Researching...") */
  activeForm?: string;
  /** Tasks that must complete before this one can start */
  blockedBy?: TaskRef[];
  /** Children (supports <Prompt> child as alternative to prompt prop) */
  children?: ReactNode;
}

/**
 * TaskDef component stub
 *
 * Transformed at compile time to TaskDefNode IR.
 * Returns null as it's only used for type checking.
 */
export function TaskDef(_props: TaskDefProps): null {
  return null;
}
