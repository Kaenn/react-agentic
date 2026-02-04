/**
 * ShutdownSequence - Graceful shutdown for Claude Code teams
 *
 * Emits:
 * 1. Teammate({ operation: "requestShutdown", ... }) for each worker
 * 2. Instructions to wait for shutdown_approved messages
 * 3. Teammate({ operation: "cleanup" }) if cleanup prop is true
 */

import type { WorkerRef, TeamRef } from './refs.js';

export interface ShutdownSequenceProps {
  /**
   * Workers to request shutdown for.
   * Maps to Teammate({ operation: "requestShutdown", target_agent_id: worker.name })
   */
  workers: WorkerRef[];

  /**
   * Reason for shutdown.
   * @default "Shutdown requested"
   */
  reason?: string;

  /**
   * Whether to include cleanup call after shutdown approvals.
   * @default true
   */
  cleanup?: boolean;

  /**
   * Team reference for output comments.
   * If not provided, uses {team} placeholder.
   */
  team?: TeamRef;

  /**
   * Section title.
   * @default "Shutdown"
   */
  title?: string;
}

/**
 * Generates graceful shutdown sequence for Claude Code teams.
 *
 * @example
 * <ShutdownSequence
 *   workers={[Security, Perf]}
 *   reason="All reviews complete"
 * />
 */
export function ShutdownSequence(_props: ShutdownSequenceProps): null {
  return null;
}
