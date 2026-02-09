/**
 * @component Broadcast
 * @description Sends a message to ALL teammates in the team
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface BroadcastProps {
  /**
   * Sender agent name (your name in the team)
   * @required
   */
  from: string;

  /**
   * Message content to broadcast
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Broadcast({ from, children }: BroadcastProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple status check
const StatusCheck = () => <Broadcast from="team-lead">Status check: Please report your progress</Broadcast>;

// Example 2: Critical announcement
const CriticalAnnouncement = () => (
  <Broadcast from="team-lead">
    ⚠️ CRITICAL: Security vulnerability found in auth module. Stop current work and prioritize reviewing your assigned
    files for this issue.
  </Broadcast>
);

// Example 3: Coordination message
const CoordinationMessage = () => (
  <Broadcast from="team-lead">
    {`Phase 1 complete. Moving to Phase 2.

New priorities:
1. Complete implementation tasks
2. Begin writing tests
3. Document any blockers

Reply with your status.`}
  </Broadcast>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * **Broadcast** from `team-lead`:
 *
 * > ⚠️ Broadcasting sends N separate messages for N teammates. Prefer `write` for targeted communication.
 *
 * ```javascript
 * Teammate({
 *   operation: "broadcast",
 *   name: "team-lead",
 *   value: "Status check: Please report your progress"
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * **Broadcast** from `team-lead`:
 *
 * > ⚠️ Broadcasting sends N separate messages for N teammates. Prefer `write` for targeted communication.
 *
 * ```javascript
 * Teammate({
 *   operation: "broadcast",
 *   name: "team-lead",
 *   value: "⚠️ CRITICAL: Security vulnerability found in auth module. Stop current work and prioritize reviewing your assigned files for this issue."
 * })
 * ```
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * **Broadcast** from `team-lead`:
 *
 * > ⚠️ Broadcasting sends N separate messages for N teammates. Prefer `write` for targeted communication.
 *
 * ```javascript
 * Teammate({
 *   operation: "broadcast",
 *   name: "team-lead",
 *   value: `Phase 1 complete. Moving to Phase 2.
 *
 * New priorities:
 * 1. Complete implementation tasks
 * 2. Begin writing tests
 * 3. Document any blockers
 *
 * Reply with your status.`
 * })
 * ```
 * ```
 */

// =============================================================================
// WHEN TO USE BROADCAST
// =============================================================================

/**
 * ✅ WHEN TO BROADCAST:
 * - Critical issues requiring immediate attention from everyone
 * - Major announcements affecting all teammates
 * - Phase transitions requiring coordination
 * - Emergency stop/pause commands
 *
 * ❌ WHEN NOT TO BROADCAST:
 * - Responding to one teammate (use <Message type="text">)
 * - Normal back-and-forth communication
 * - Information relevant to only some teammates
 * - Status updates to/from specific workers
 *
 * 💡 COST WARNING:
 * Broadcasting sends N separate messages for N teammates.
 * A team with 5 teammates will generate 5 messages.
 * Prefer targeted <Message> for most communication.
 */
