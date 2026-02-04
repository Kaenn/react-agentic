/**
 * @component ShutdownSequence
 * @description Documents the graceful shutdown sequence for teammates
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface ShutdownSequenceProps {
  /**
   * List of teammate names to shut down
   * @required
   */
  teammates: string[];

  /**
   * Whether to include cleanup step
   * @default true
   */
  includeCleanup?: boolean;

  /**
   * Reason for shutdown (included in requests)
   * @optional
   */
  reason?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ShutdownSequence({ teammates, includeCleanup = true, reason }: ShutdownSequenceProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple shutdown
const SimpleShutdown = () => <ShutdownSequence teammates={['worker-1', 'worker-2']} />;

// Example 2: Shutdown with reason
const ShutdownWithReason = () => (
  <ShutdownSequence teammates={['security', 'performance', 'architecture']} reason="All review tasks complete" />
);

// Example 3: Shutdown without cleanup
const ShutdownNoCleanup = () => (
  <ShutdownSequence teammates={['researcher', 'implementer']} includeCleanup={false} reason="Moving to next phase" />
);

// Example 4: Large team shutdown
const LargeTeamShutdown = () => (
  <ShutdownSequence
    teammates={['worker-1', 'worker-2', 'worker-3', 'worker-4', 'worker-5']}
    reason="Swarm work complete"
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Graceful Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all teammates
 * Teammate({ operation: "requestShutdown", target_agent_id: "worker-1" })
 * Teammate({ operation: "requestShutdown", target_agent_id: "worker-2" })
 *
 * // 2. Wait for shutdown approvals
 * // Check for {"type": "shutdown_approved", ...} messages
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ### Graceful Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all teammates
 * Teammate({
 *   operation: "requestShutdown",
 *   target_agent_id: "security",
 *   reason: "All review tasks complete"
 * })
 * Teammate({
 *   operation: "requestShutdown",
 *   target_agent_id: "performance",
 *   reason: "All review tasks complete"
 * })
 * Teammate({
 *   operation: "requestShutdown",
 *   target_agent_id: "architecture",
 *   reason: "All review tasks complete"
 * })
 *
 * // 2. Wait for shutdown approvals
 * // Check for {"type": "shutdown_approved", ...} messages
 *
 * // 3. Cleanup team resources
 * Teammate({ operation: "cleanup" })
 * ```
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * ### Graceful Shutdown
 *
 * ```javascript
 * // 1. Request shutdown for all teammates
 * Teammate({
 *   operation: "requestShutdown",
 *   target_agent_id: "researcher",
 *   reason: "Moving to next phase"
 * })
 * Teammate({
 *   operation: "requestShutdown",
 *   target_agent_id: "implementer",
 *   reason: "Moving to next phase"
 * })
 *
 * // 2. Wait for shutdown approvals
 * // Check for {"type": "shutdown_approved", ...} messages
 *
 * // Note: Cleanup skipped - team resources preserved for next phase
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
 *    - Send requestShutdown to each teammate
 *    - Include reason if provided
 *    - Can be done in parallel
 *
 * 2. **Wait for Approvals**
 *    - Each teammate receives shutdown_request message
 *    - Teammate finishes current work
 *    - Teammate calls approveShutdown
 *    - Leader receives shutdown_approved message
 *
 * 3. **Handle Rejections**
 *    - Teammate may call rejectShutdown with reason
 *    - Leader should wait or retry later
 *    - Common reasons: "Still working on task", "Need more time"
 *
 * 4. **Cleanup**
 *    - Only after ALL teammates have approved
 *    - Removes team directory and task files
 *    - Will fail if any teammates still active
 *
 * ## Timeout Handling
 *
 * - Teammates have 5-minute heartbeat timeout
 * - Crashed teammates auto-marked inactive after timeout
 * - Cleanup works after timeout expires
 *
 * ## Common Errors
 *
 * | Error | Cause | Solution |
 * |-------|-------|----------|
 * | "Cannot cleanup with active members" | Teammates still running | Wait for all approvals |
 * | "Agent not found" | Wrong teammate name | Check config.json for names |
 * | "Timeout waiting for approval" | Teammate crashed | Wait for heartbeat timeout |
 */
