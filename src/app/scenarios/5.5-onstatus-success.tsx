/**
 * Scenario 5.5: OnStatus SUCCESS Handler
 *
 * Goal: Confirm that <OnStatus status="SUCCESS"> creates conditional handling
 * for successful agent completion.
 *
 * Success Criteria:
 * - OnStatus renders as "**On SUCCESS:**" pattern
 * - Claude checks the agent's return status
 * - SUCCESS content is executed only when agent succeeds
 * - Other statuses do not trigger SUCCESS handler
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.5-onstatus-success.tsx
 * Output: .claude/commands/5.5-onstatus-success.md
 */

import { Command, SpawnAgent, useOutput, OnStatus } from '../../jsx.js';
import type { OnStatusSuccessAgentOutput } from './5.5-onstatus-success-agent.js';

export default function OnStatusSuccessCommand() {
  const output = useOutput<OnStatusSuccessAgentOutput>('5.5-onstatus-success-agent');

  return (
    <Command
      name="5.5-onstatus-success"
      description="Test command for OnStatus SUCCESS handler. Verifies status-based conditional execution."
    >
      <h1>OnStatus SUCCESS Handler Test</h1>

      <p>
        This command tests that the OnStatus component correctly creates
        conditional blocks that Claude evaluates based on agent return status.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify OnStatus renders as "**On SUCCESS:**" pattern in markdown</li>
        <li>Verify Claude checks the spawned agent's return status</li>
        <li>Verify SUCCESS content is executed only when agent returns SUCCESS</li>
        <li>Verify Claude does NOT execute SUCCESS content for other statuses</li>
      </ol>

      <h2>Step 1: Spawn Test Agent</h2>

      <p>
        Execute the following Task() call to spawn the test agent.
        The agent is designed to always return SUCCESS status:
      </p>

      <SpawnAgent<object, OnStatusSuccessAgentOutput>
        agent="5.5-onstatus-success-agent"
        model="haiku"
        description="Spawn agent to test OnStatus SUCCESS handling"
        prompt={`You are being spawned to test the OnStatus SUCCESS handler.

Your task:
1. Acknowledge the spawn request
2. Confirm you are the 5.5-onstatus-success-agent
3. Return SUCCESS status with confirmation message

Follow the return format specified in your agent definition exactly.`}
      />

      <h2>Step 2: Handle Agent Status</h2>

      <p>
        After the agent returns, evaluate its status and execute the
        appropriate handler block below:
      </p>

      <OnStatus output={output} status="SUCCESS">
        <h3>SUCCESS Handler Triggered</h3>

        <p>
          <strong>This block should ONLY execute if the agent returned SUCCESS status.</strong>
        </p>

        <p>
          The agent returned SUCCESS! Record the following:
        </p>

        <ul>
          <li>Agent confirmation: {output.field('confirmation')}</li>
          <li>Agent timestamp: {output.field('timestamp')}</li>
          <li>Agent message: {output.field('message')}</li>
        </ul>

        <p>
          Say: "SUCCESS handler executed correctly! The OnStatus SUCCESS block was triggered."
        </p>
      </OnStatus>

      <h2>Step 3: Validation Report</h2>

      <p>After completing the status handling, report the results in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 5.5
test_name: OnStatus SUCCESS Handler
onstatus_rendered: [YES/NO - did "**On SUCCESS:**" appear in markdown?]
agent_spawned: [YES/NO - was the agent successfully spawned?]
agent_returned_success: [YES/NO - did the agent return SUCCESS status?]
success_handler_executed: [YES/NO - was the SUCCESS handler block executed?]
field_interpolation_worked: [YES/NO - were output fields like confirmation visible?]
overall_result: [PASSED/FAILED]
notes: [any observations about OnStatus behavior]`}</code></pre>
    </Command>
  );
}
