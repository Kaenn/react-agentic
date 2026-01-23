/**
 * Scenario 9.2: Command with State and Agent Integration
 *
 * Goal: Confirm that a command can read state, pass it to an agent, and
 * update state based on agent output.
 *
 * Success Criteria:
 * - State is read before agent spawn
 * - Agent receives state data in its input
 * - Agent output is captured correctly
 * - State is updated based on agent output
 * - State changes persist across invocations
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.2-state-agent-integration.tsx
 * Output: .claude/commands/9.2-state-agent-integration.md
 */

import {
  Command,
  SpawnAgent,
  useVariable,
  useOutput,
  useStateRef,
  ReadState,
  WriteState,
  OnStatus,
  Assign,
  XmlBlock,
} from '../../jsx.js';
import type { StateProcessorInput, StateProcessorOutput } from './9.2-state-agent-integration-agent.js';

// State schema for the integration test
interface IntegrationTestState {
  taskCount: number;
  currentStatus: string;
  lastUpdated: string;
  processingHistory: string;
}

export default function StateAgentIntegration() {
  // State reference
  const testState = useStateRef<IntegrationTestState>('integration-9-2-state');

  // Variables to hold state values for passing to agent
  const taskCountVar = useVariable<string>('TASK_COUNT');
  const currentStatusVar = useVariable<string>('CURRENT_STATUS');
  const lastUpdatedVar = useVariable<string>('LAST_UPDATED');
  const processingModeVar = useVariable<string>('PROCESSING_MODE');

  // Variables for capturing final state
  const finalStateVar = useVariable<string>('FINAL_STATE');

  // Bind to agent output
  const agentOutput = useOutput<StateProcessorOutput>('9.2-state-agent-integration-agent');

  return (
    <Command
      name="9.2-state-agent-integration"
      description="Test command that reads state, passes it to an agent, and updates state based on agent output."
    >
      <h1>State and Agent Integration Test</h1>

      <p>This command validates the complete workflow of:</p>
      <ol>
        <li>Reading state before agent spawn</li>
        <li>Passing state data to an agent via input</li>
        <li>Receiving agent output</li>
        <li>Updating state based on agent output</li>
        <li>Persisting state changes</li>
      </ol>

      <XmlBlock name="test_criteria">
        <ul>
          <li>State is read before agent spawn</li>
          <li>Agent receives state data in its input</li>
          <li>Agent output is captured correctly</li>
          <li>State is updated based on agent output</li>
          <li>State changes persist across invocations</li>
        </ul>
      </XmlBlock>

      <h2>Phase 1: Initialize State</h2>
      <p>First, ensure we have initial state to work with:</p>

      {/* Initialize state with known values */}
      <WriteState
        state={testState}
        merge={{
          taskCount: 5,
          currentStatus: 'pending',
          lastUpdated: '2026-01-01T00:00:00Z',
          processingHistory: 'initialized',
        }}
      />

      <p>State initialized with:</p>
      <ul>
        <li><code>taskCount</code>: 5</li>
        <li><code>currentStatus</code>: "pending"</li>
        <li><code>lastUpdated</code>: "2026-01-01T00:00:00Z"</li>
        <li><code>processingHistory</code>: "initialized"</li>
      </ul>

      <h2>Phase 2: Read Current State</h2>
      <p>Now read the state values into variables for passing to the agent:</p>

      {/* Read state fields into variables */}
      <ReadState state={testState} into={taskCountVar} field="taskCount" />
      <ReadState state={testState} into={currentStatusVar} field="currentStatus" />
      <ReadState state={testState} into={lastUpdatedVar} field="lastUpdated" />

      {/* Set the processing mode */}
      <Assign var={processingModeVar} value="increment" />

      <p>State values captured:</p>
      <ul>
        <li>TASK_COUNT = $TASK_COUNT</li>
        <li>CURRENT_STATUS = $CURRENT_STATUS</li>
        <li>LAST_UPDATED = $LAST_UPDATED</li>
        <li>PROCESSING_MODE = "increment"</li>
      </ul>

      <h2>Phase 3: Spawn Agent with State Data</h2>
      <p>Now spawn the state processor agent with the current state values as input:</p>

      {/* Spawn agent with state data as input */}
      <SpawnAgent<StateProcessorInput>
        agent="9.2-state-agent-integration-agent"
        model="haiku"
        description="Process current state and return updated values"
        input={{
          taskCount: taskCountVar,
          currentStatus: currentStatusVar,
          lastUpdated: lastUpdatedVar,
          processingMode: processingModeVar,
        }}
      >
        Process the provided state data according to the processing mode.
        Return the new values to be written back to state.
      </SpawnAgent>

      <h2>Phase 4: Handle Agent Response and Update State</h2>
      <p>Process the agent's response and update state accordingly:</p>

      {/* Handle SUCCESS - update state with agent output */}
      <OnStatus output={agentOutput} status="SUCCESS">
        <h3>Agent Returned SUCCESS</h3>
        <p>The agent processed the state. Now update state with the returned values:</p>
        <ul>
          <li>New task count: {'{output.newTaskCount}'}</li>
          <li>New status: {'{output.newStatus}'}</li>
          <li>New timestamp: {'{output.newTimestamp}'}</li>
          <li>Processing summary: {'{output.processingSummary}'}</li>
        </ul>
        <p><strong>Write the new values back to state:</strong></p>

        {/* Update state with agent output values */}
        <WriteState
          state={testState}
          field="taskCount"
          value={agentOutput.field('newTaskCount')}
        />
        <WriteState
          state={testState}
          field="currentStatus"
          value={agentOutput.field('newStatus')}
        />
        <WriteState
          state={testState}
          field="lastUpdated"
          value={agentOutput.field('newTimestamp')}
        />
        <WriteState
          state={testState}
          field="processingHistory"
          value="processed-by-agent"
        />
      </OnStatus>

      {/* Handle ERROR */}
      <OnStatus output={agentOutput} status="ERROR">
        <h3>Agent Returned ERROR</h3>
        <p>The agent encountered an error processing the state.</p>
        <p>Error details: {'{output.message}'}</p>
        <p><strong>State will NOT be updated due to error.</strong></p>
      </OnStatus>

      <h2>Phase 5: Verify State Update</h2>
      <p>Read the final state to verify the update was applied:</p>

      {/* Read final state for verification */}
      <ReadState state={testState} into={finalStateVar} />

      <XmlBlock name="validation_instructions">
        <h2>Validation Instructions</h2>
        <p>After executing this command, verify:</p>
        <ol>
          <li><strong>State Read</strong>: State was read before spawning the agent</li>
          <li><strong>Input Passing</strong>: Agent received taskCount, currentStatus, lastUpdated, processingMode</li>
          <li><strong>Output Capture</strong>: Agent output fields (newTaskCount, newStatus, newTimestamp) were received</li>
          <li><strong>State Update</strong>: State was written with agent's returned values</li>
          <li><strong>Persistence</strong>: Reading state again shows the updated values</li>
        </ol>
      </XmlBlock>

      <XmlBlock name="expected_final_state">
        <h2>Expected Final State</h2>
        <p>After successful execution with "increment" mode:</p>
        <ul>
          <li><code>taskCount</code> should be 6 (was 5, incremented by 1)</li>
          <li><code>currentStatus</code> should be "active" (per increment rule)</li>
          <li><code>lastUpdated</code> should be a new timestamp (from agent)</li>
          <li><code>processingHistory</code> should be "processed-by-agent"</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="report_format">
        <h2>Report Format</h2>
        <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
scenario: 9.2 - Command with State and Agent Integration
tests:
  state_read_before_spawn: PASSED | FAILED
  agent_received_state_data: PASSED | FAILED
  agent_output_captured: PASSED | FAILED
  state_updated_from_output: PASSED | FAILED
  changes_persisted: PASSED | FAILED
initial_state:
  taskCount: 5
  currentStatus: "pending"
  lastUpdated: "2026-01-01T00:00:00Z"
agent_input:
  taskCount: <value passed>
  currentStatus: <value passed>
  processingMode: "increment"
agent_output:
  newTaskCount: <returned value>
  newStatus: <returned value>
  newTimestamp: <returned value>
final_state:
  taskCount: <after update>
  currentStatus: <after update>
  lastUpdated: <after update>
  processingHistory: <after update>
notes: <observations about the state-agent integration>`}</code></pre>
      </XmlBlock>

      <XmlBlock name="persistence_test">
        <h2>Persistence Test</h2>
        <p>
          To verify persistence, run this command again. The initial state will be overwritten,
          but you can modify the command to skip initialization and just read existing state.
        </p>
      </XmlBlock>

      <XmlBlock name="cleanup">
        <h2>Cleanup</h2>
        <p>After validation:</p>
        <pre><code className="language-bash">{`rm -f .state/integration-9-2-state.json`}</code></pre>
      </XmlBlock>
    </Command>
  );
}
