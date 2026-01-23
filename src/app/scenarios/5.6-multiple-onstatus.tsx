/**
 * Scenario 5.6: Multiple OnStatus Handlers
 *
 * Goal: Confirm that multiple <OnStatus> blocks for different statuses work correctly together.
 *
 * Success Criteria:
 * - Each status has its own handler section
 * - Claude evaluates the agent's actual status
 * - Exactly one handler is executed per spawn
 * - ERROR and BLOCKED handlers receive error context
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.6-multiple-onstatus.tsx
 * Output: .claude/commands/5.6-multiple-onstatus.md
 */

import { Command, SpawnAgent, useOutput, OnStatus } from '../../jsx.js';
import type { MultiStatusAgentInput, MultiStatusAgentOutput } from './5.6-multi-status-agent.js';

export default function MultipleOnStatusCommand() {
  const agentOutput = useOutput<MultiStatusAgentOutput>('5.6-multi-status-agent');

  return (
    <Command
      name="5.6-multiple-onstatus"
      description="Test command for multiple OnStatus handlers. Verifies exactly one handler is invoked per status."
    >
      <h1>Multiple OnStatus Handlers Test</h1>

      <p>
        This command tests that multiple OnStatus blocks correctly route to
        exactly one handler based on the agent's return status.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify each status (SUCCESS, ERROR, BLOCKED) has its own OnStatus block</li>
        <li>Verify Claude evaluates the agent's actual return status</li>
        <li>Verify exactly one handler is executed per agent spawn</li>
        <li>Verify ERROR/BLOCKED handlers can access error context fields</li>
      </ol>

      <h2>Test Instructions</h2>

      <p>
        This test will spawn an agent that returns SUCCESS status. Observe which
        OnStatus handler Claude executes. Only the SUCCESS handler should be triggered.
      </p>

      <h2>Spawn Agent with SUCCESS Request</h2>

      <p>Execute this Task() call to spawn the multi-status agent requesting SUCCESS:</p>

      <SpawnAgent<MultiStatusAgentInput, MultiStatusAgentOutput>
        agent="5.6-multi-status-agent"
        model="haiku"
        description="Test OnStatus routing with SUCCESS status"
        prompt={`You are being spawned to test OnStatus handler routing.

Your task:
1. Return status: SUCCESS
2. Include the confirmation field

This tests that the SUCCESS OnStatus handler is correctly triggered.

Input:
requestedStatus: SUCCESS
context: Testing multiple OnStatus handlers`}
      />

      <h2>Status Handlers</h2>

      <p>
        After the agent returns, Claude should evaluate the status and execute
        EXACTLY ONE of the following handlers:
      </p>

      <OnStatus output={agentOutput} status="SUCCESS">
        <h3>SUCCESS Handler Triggered</h3>

        <p>
          The agent returned SUCCESS status. This handler should be executed.
        </p>

        <p>Agent confirmation: {agentOutput.field('confirmation')}</p>

        <p>
          <strong>Record this for validation:</strong> SUCCESS_HANDLER_EXECUTED=true
        </p>
      </OnStatus>

      <OnStatus output={agentOutput} status="ERROR">
        <h3>ERROR Handler Triggered</h3>

        <p>
          The agent returned ERROR status. This handler receives error context.
        </p>

        <p>Error details: {agentOutput.field('errorDetails')}</p>

        <p>
          <strong>Record this for validation:</strong> ERROR_HANDLER_EXECUTED=true
        </p>
      </OnStatus>

      <OnStatus output={agentOutput} status="BLOCKED">
        <h3>BLOCKED Handler Triggered</h3>

        <p>
          The agent returned BLOCKED status. This handler receives blocker context.
        </p>

        <p>Blocked by: {agentOutput.field('blockedBy')}</p>

        <p>
          <strong>Record this for validation:</strong> BLOCKED_HANDLER_EXECUTED=true
        </p>
      </OnStatus>

      <h2>Validation</h2>

      <p>After completing the test, report the following in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 5.6
test_name: Multiple OnStatus Handlers
agent_status_returned: [SUCCESS/ERROR/BLOCKED - what status did agent return?]
success_handler_visible: [YES/NO - was SUCCESS handler section visible in markdown?]
error_handler_visible: [YES/NO - was ERROR handler section visible in markdown?]
blocked_handler_visible: [YES/NO - was BLOCKED handler section visible in markdown?]
handler_executed: [SUCCESS/ERROR/BLOCKED/NONE - which ONE handler did you execute?]
multiple_handlers_executed: [YES/NO - were multiple handlers incorrectly executed?]
error_context_accessible: [YES/NO - does ERROR handler have access to errorDetails field?]
blocked_context_accessible: [YES/NO - does BLOCKED handler have access to blockedBy field?]
overall_result: [PASSED/FAILED]
notes: [any observations about OnStatus routing behavior]`}</code></pre>
    </Command>
  );
}
