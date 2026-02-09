/**
 * @component ShutdownSequence
 * @description Documents the graceful shutdown sequence for workers
 */

import type { WorkerRef, TeamRef } from '../../refs.js';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface ShutdownSequenceProps {
  /**
   * Workers to request shutdown for.
   * Maps to Teammate({ operation: "requestShutdown", target_agent_id: worker.name })
   * @required
   */
  workers: WorkerRef[];

  /**
   * Reason for shutdown (optional).
   * Maps to Teammate({ ..., reason: "..." })
   * @default "Shutdown requested"
   */
  reason?: string;

  /**
   * Whether to include cleanup call after shutdown approvals.
   * @default true
   */
  cleanup?: boolean;

  /**
   * Team reference for output comments (optional).
   * If not provided, uses {team} placeholder.
   */
  team?: TeamRef;

  /**
   * Section title (optional).
   * @default "Shutdown"
   */
  title?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShutdownSequence({
  workers,
  reason = 'Shutdown requested',
  cleanup = true,
  team,
  title = 'Shutdown',
}: ShutdownSequenceProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Note: These examples assume WorkerRef objects from defineWorker()
// const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
// const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);
// const ReviewTeam = defineTeam('pr-review', [Security, Perf]);

// Example 1: Simple shutdown (uses defaults)
// <ShutdownSequence workers={[Security, Perf]} />

// Example 2: Shutdown with reason
// <ShutdownSequence workers={[Security, Perf]} reason="All review tasks complete" />

// Example 3: Shutdown without cleanup (partial shutdown)
// <ShutdownSequence workers={[Security]} reason="Phase 1 done" cleanup={false} />

// Example 4: With explicit team
// <ShutdownSequence workers={[Security, Perf]} team={ReviewTeam} reason="Done" />

// Example 5: Custom title
// <ShutdownSequence workers={[Security, Perf]} title="Cleanup Reviewers" reason="Done" />

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 (simple shutdown) renders to:
 *
 * ```markdown
 * ## Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "Shutdown requested" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "Shutdown requested" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * // {"type": "shutdown_approved", "from": "perf", ...}
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 2 (with reason) renders to:
 *
 * ```markdown
 * ## Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "All review tasks complete" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "All review tasks complete" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * // {"type": "shutdown_approved", "from": "perf", ...}
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 3 (cleanup={false}) renders to:
 *
 * ```markdown
 * ## Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "Phase 1 done" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * ```
 * ```
 */

/**
 * Example 4 (with explicit team) renders to:
 *
 * ```markdown
 * ## Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "Done" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "Done" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/pr-review/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * // {"type": "shutdown_approved", "from": "perf", ...}
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 5 (custom title) renders to:
 *
 * ```markdown
 * ## Cleanup Reviewers
 *
 * ```javascript
 * // 1. Request shutdown for all workers
 * Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "Done" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "Done" })
 *
 * // 2. Wait for shutdown_approved messages
 * // Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
 * // {"type": "shutdown_approved", "from": "security", ...}
 * // {"type": "shutdown_approved", "from": "perf", ...}
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

// =============================================================================
// SHUTDOWN PROTOCOL
// =============================================================================

/**
 * ## Graceful Shutdown Protocol
 *
 * 1. **Request Shutdown**
 *    - Send requestShutdown to each worker
 *    - Include reason (defaults to "Shutdown requested")
 *    - Can be done in parallel
 *
 * 2. **Wait for Approvals**
 *    - Each worker receives shutdown_request message
 *    - Worker finishes current work
 *    - Worker calls approveShutdown
 *    - Leader receives shutdown_approved message
 *
 * 3. **Handle Rejections**
 *    - Worker may call rejectShutdown with reason
 *    - Leader should wait or retry later
 *    - Common reasons: "Still working on task", "Need more time"
 *
 * 4. **Cleanup** (if cleanup={true}, which is the default)
 *    - Only after ALL workers have approved
 *    - Removes team directory and task files
 *    - Will fail if any workers still active
 *
 * ## Timeout Handling
 *
 * - Workers have 5-minute heartbeat timeout
 * - Crashed workers auto-marked inactive after timeout
 * - Cleanup works after timeout expires
 *
 * ## Common Errors
 *
 * | Error | Cause | Solution |
 * |-------|-------|----------|
 * | "Cannot cleanup with active members" | Workers still running | Wait for all approvals |
 * | "Agent not found" | Wrong worker name | Check config.json for names |
 * | "Timeout waiting for approval" | Worker crashed | Wait for heartbeat timeout |
 * | "ShutdownSequence requires at least one worker" | Empty workers array | Provide at least one WorkerRef |
 */
