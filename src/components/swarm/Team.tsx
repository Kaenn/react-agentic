/**
 * Team Component
 *
 * Spawns a team of workers for parallel execution.
 * Emits as Claude Code's Teammate({ operation: "spawnTeam", ... }) syntax.
 */

import type { ReactNode } from 'react';
import type { TeamRef } from './refs.js';

/**
 * Props for Team component
 */
export interface TeamProps {
  /** Team reference created with defineTeam() */
  team: TeamRef;
  /** Team description (optional) */
  description?: string;
  /** Teammate children */
  children: ReactNode;
}

/**
 * Team component stub
 *
 * Transformed at compile time to TeamNode IR.
 * Returns null as it's only used for type checking.
 */
export function Team(_props: TeamProps): null {
  return null;
}
