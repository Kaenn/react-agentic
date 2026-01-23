/**
 * Scenario 5.2: SpawnAgent with Variable Input - Command Definition
 *
 * Goal: Confirm that SpawnAgent can receive a variable reference as input
 * and pass its value to the agent.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.2-spawn-with-variable-input.tsx
 * Output: .claude/commands/5.2-spawn-with-variable-input.md
 */

import { Command, SpawnAgent, Assign, useVariable, useOutput, OnStatus } from '../../jsx.js';
import type { InputReceiverInput, InputReceiverOutput } from './5.2-input-receiver-agent.js';

// Declare variables at module level
const messageVar = useVariable<string>("MESSAGE");
const timestampVar = useVariable<string>("TIMESTAMP");
const testModeVar = useVariable<string>("TEST_MODE");

// Bind to agent output
const receiverOutput = useOutput<InputReceiverOutput>("5.2-input-receiver-agent");

export default function SpawnWithVariableInput() {
  return (
    <Command
      name="5.2-spawn-with-variable-input"
      description="Test SpawnAgent with variable input passing. Declares variables, assigns values, and passes them to an agent via the input prop."
    >
      <h1>SpawnAgent with Variable Input Test</h1>

      <p>
        This test validates that SpawnAgent correctly passes variable values
        to an agent via the input prop. The agent should receive the variable
        values, not the variable references.
      </p>

      <h2>Step 1: Declare and Assign Variables</h2>

      <p>First, we assign values to shell variables:</p>

      <h3>Static Value Assignment</h3>
      <Assign var={messageVar} value="Hello from the command!" />

      <h3>Dynamic Bash Assignment</h3>
      <Assign var={timestampVar} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />

      <h3>Static Test Mode</h3>
      <Assign var={testModeVar} value="scenario-5.2" />

      <p>After assignment, variables should contain:</p>
      <ul>
        <li><code>MESSAGE</code> = "Hello from the command!"</li>
        <li><code>TIMESTAMP</code> = current UTC timestamp</li>
        <li><code>TEST_MODE</code> = "scenario-5.2"</li>
      </ul>

      <h2>Step 2: Spawn Agent with Variable Input</h2>

      <p>
        Now spawn the input-receiver agent and pass the variables via the input prop.
        The agent should receive the actual values, not "$MESSAGE" etc.
      </p>

      <SpawnAgent<InputReceiverInput>
        agent="5.2-input-receiver-agent"
        model="haiku"
        description="Test variable input passing"
        input={{
          message: messageVar,
          timestamp: timestampVar,
          testMode: testModeVar,
        }}
      >
        You are receiving input values from the command.
        Please verify you received all three values and report them back.
      </SpawnAgent>

      <h2>Step 3: Handle Agent Response</h2>

      <OnStatus output={receiverOutput} status="SUCCESS">
        <p>✅ Agent received the input successfully!</p>
        <p>Verify these values match what was sent:</p>
        <ul>
          <li>Message: {receiverOutput.field('receivedMessage')}</li>
          <li>Timestamp: {receiverOutput.field('receivedTimestamp')}</li>
          <li>TestMode: {receiverOutput.field('receivedTestMode')}</li>
        </ul>
      </OnStatus>

      <OnStatus output={receiverOutput} status="ERROR">
        <p>❌ Agent reported an error receiving input:</p>
        <p>{receiverOutput.field('message')}</p>
      </OnStatus>

      <h2>Step 4: Report Test Results</h2>

      <p>After the agent returns, report the test outcome:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
scenario: 5.2 - SpawnAgent with Variable Input
tests:
  variable_value_passed_to_agent: PASSED | FAILED
  agent_can_access_input_in_prompt: PASSED | FAILED
  input_appears_in_task_call_correctly: PASSED | FAILED
  variable_interpolation_works_in_prompt: PASSED | FAILED
values_sent:
  message: <value of MESSAGE variable>
  timestamp: <value of TIMESTAMP variable>
  testMode: <value of TEST_MODE variable>
values_received:
  message: <what agent reported receiving>
  timestamp: <what agent reported receiving>
  testMode: <what agent reported receiving>
notes: <observations about variable input passing>`}</code></pre>
    </Command>
  );
}
