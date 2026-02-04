/**
 * @component Message
 * @description Defines a message between agents (text or structured)
 */

import {
  MessageType,
  AgentRef,
  defineAgent,
  AgentType,
  PluginAgentType,
  Model
} from './enums';

// =============================================================================
// ENUMS (re-export for convenience)
// =============================================================================

export { MessageType, AgentRef, defineAgent };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface MessageProps {
  /**
   * Type of message - use MessageType enum
   * @required
   */
  type: MessageType;

  /**
   * Sender agent - accepts AgentRef or string name
   * @required
   */
  from: AgentRef | string;

  /**
   * Recipient agent - accepts AgentRef or string name
   * (required for 'text' type)
   * @optional
   */
  to?: AgentRef | string;

  /**
   * Request ID for structured messages
   * @optional
   */
  requestId?: string;

  /**
   * Additional metadata for structured messages
   * @optional
   */
  metadata?: Record<string, unknown>;

  /**
   * Message content - use children for text messages
   * @optional
   */
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Message({ type, from, to, requestId, metadata, children }: MessageProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using AgentRef for type-safe messaging (RECOMMENDED)
// -----------------------------------------------------------------------------

const TeamLead = defineAgent('team-lead', AgentType.GeneralPurpose, Model.Opus);
const SecurityWorker = defineAgent('security', PluginAgentType.SecuritySentinel);
const PerfWorker = defineAgent('perf', PluginAgentType.PerformanceOracle);

const TypeSafeMessage = () => (
  <Message type={MessageType.Text} from={TeamLead} to={SecurityWorker}>
    Please prioritize the auth module. The deadline is tomorrow.
  </Message>
);

// Multiple messages between agents
const AgentConversation = () => (
  <>
    <Message type={MessageType.Text} from={TeamLead} to={SecurityWorker}>
      Start the security review
    </Message>
    <Message type={MessageType.TaskCompleted} from={SecurityWorker} metadata={{ taskId: '1' }} />
    <Message type={MessageType.Text} from={TeamLead} to={PerfWorker}>
      Security review done, start performance analysis
    </Message>
  </>
);

// -----------------------------------------------------------------------------
// Pattern 2: String names (legacy, still supported)
// -----------------------------------------------------------------------------

// Example 1: Simple text message (using enum)
const TextMessage = () => (
  <Message type={MessageType.Text} from="team-lead" to="worker-1">
    Please prioritize the auth module. The deadline is tomorrow.
  </Message>
);

// Example 2: Shutdown request (using enum)
const ShutdownRequestExample = () => (
  <Message type={MessageType.ShutdownRequest} from="team-lead" requestId="shutdown-abc123" metadata={{ reason: 'All tasks complete' }} />
);

// Example 3: Task completed notification (using enum)
const TaskCompletedExample = () => (
  <Message
    type={MessageType.TaskCompleted}
    from="worker-1"
    metadata={{
      taskId: '2',
      taskSubject: 'Review authentication module'
    }}
  />
);

// Example 4: Plan approval request (using enum)
const PlanApprovalExample = () => (
  <Message type={MessageType.PlanApprovalRequest} from="architect" requestId="plan-xyz789">
    {`# Implementation Plan

## Phase 1: Setup
- Initialize OAuth client
- Configure providers

## Phase 2: Implementation
- Build auth endpoints
- Add session management

## Phase 3: Testing
- Unit tests
- Integration tests`}
  </Message>
);

// Example 5: Idle notification (using enum)
const IdleNotificationExample = () => (
  <Message
    type={MessageType.IdleNotification}
    from="worker-2"
    metadata={{
      completedTaskId: '3',
      completedStatus: 'completed'
    }}
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 (text) renders to:
 *
 * ```markdown
 * **Message** from `team-lead` to `worker-1`:
 *
 * ```javascript
 * Teammate({
 *   operation: "write",
 *   target_agent_id: "worker-1",
 *   value: "Please prioritize the auth module. The deadline is tomorrow."
 * })
 * ```
 * ```
 */

/**
 * Example 2 (shutdown_request) renders to:
 *
 * ```markdown
 * **shutdown_request** from `team-lead`:
 *
 * ```json
 * {
 *   "type": "shutdown_request",
 *   "requestId": "shutdown-abc123",
 *   "from": "team-lead",
 *   "reason": "All tasks complete",
 *   "timestamp": "2026-02-03T10:30:00.000Z"
 * }
 * ```
 * ```
 */

/**
 * Example 3 (task_completed) renders to:
 *
 * ```markdown
 * **task_completed** from `worker-1`:
 *
 * ```json
 * {
 *   "type": "task_completed",
 *   "from": "worker-1",
 *   "taskId": "2",
 *   "taskSubject": "Review authentication module",
 *   "timestamp": "2026-02-03T10:30:00.000Z"
 * }
 * ```
 * ```
 */

/**
 * Example 4 (plan_approval_request) renders to:
 *
 * ```markdown
 * **plan_approval_request** from `architect`:
 *
 * ```json
 * {
 *   "type": "plan_approval_request",
 *   "from": "architect",
 *   "requestId": "plan-xyz789",
 *   "planContent": "# Implementation Plan\n\n## Phase 1: Setup\n...",
 *   "timestamp": "2026-02-03T10:30:00.000Z"
 * }
 * ```
 * ```
 */

/**
 * Example 5 (idle_notification) renders to:
 *
 * ```markdown
 * **idle_notification** from `worker-2`:
 *
 * ```json
 * {
 *   "type": "idle_notification",
 *   "from": "worker-2",
 *   "completedTaskId": "3",
 *   "completedStatus": "completed",
 *   "timestamp": "2026-02-03T10:30:00.000Z"
 * }
 * ```
 * ```
 */

// =============================================================================
// MESSAGE TYPE REFERENCE
// =============================================================================

/**
 * | Type | Direction | Purpose | Required Fields |
 * |------|-----------|---------|-----------------|
 * | text | Any → Any | General communication | from, to, children |
 * | shutdown_request | Leader → Teammate | Request graceful shutdown | from, requestId |
 * | shutdown_approved | Teammate → Leader | Confirm shutdown | from, requestId |
 * | idle_notification | Teammate → Leader | Report idle state | from |
 * | task_completed | Teammate → Leader | Report task done | from, taskId |
 * | plan_approval_request | Teammate → Leader | Request plan approval | from, requestId |
 * | join_request | Agent → Leader | Request to join team | from, requestId |
 * | permission_request | Teammate → Leader | Request tool permission | from, requestId, toolName |
 */
