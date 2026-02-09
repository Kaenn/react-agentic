/**
 * Teammate Component
 *
 * Defines a single worker within a Team.
 * Emits as Claude Code's Task({ team_name, ... }) syntax.
 */

import type { ReactNode } from 'react';
import type { WorkerRef } from './refs.js';
import type { Model, TaskMode } from './enums.js';

/**
 * Props for Teammate component
 */
export interface TeammateProps {
  /** Worker reference created with defineWorker() */
  worker: WorkerRef;
  /** Short description for Task.description */
  description: string;
  /** Full prompt instructions (alternative to <Prompt> child) */
  prompt?: string;
  /** Override model (takes precedence over WorkerRef.model) */
  model?: Model | string;
  /** Task execution mode (e.g., 'plan' for plan approval) */
  mode?: TaskMode | string;
  /** Run in background (default true) */
  background?: boolean;
  /** Optional children - can contain <Prompt> for multi-line prompts */
  children?: ReactNode;
}

/**
 * Teammate component stub
 *
 * Transformed at compile time to TeammateNode IR.
 * Returns null as it's only used for type checking.
 */
export function Teammate(_props: TeammateProps): null {
  return null;
}
