/**
 * Scenario 9.1: Command Orchestrating Agent Workflow
 *
 * Goal: Confirm that a command can spawn an agent, receive its output,
 * and make decisions based on the result.
 *
 * Success Criteria:
 * - Variable is assigned before agent spawn
 * - Agent receives the variable value
 * - OnStatus handler receives agent output
 * - Field interpolation works in handlers
 * - Complete workflow produces expected result
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.1-orchestrating-workflow.tsx
 * Output: .claude/commands/9.1-orchestrating-workflow.md
 */

import { Command, SpawnAgent, Assign, useVariable, useOutput, OnStatus } from '../../jsx.js';
import type { WorkflowAgentInput, WorkflowAgentOutput } from './9.1-workflow-agent.js';

// Declare variables at module level for input collection
const operationType = useVariable<string>("OPERATION_TYPE");
const inputValue = useVariable<string>("INPUT_VALUE");
const startTimestamp = useVariable<string>("START_TIMESTAMP");

// Bind to agent output for result handling
const workflowOutput = useOutput<WorkflowAgentOutput>("9.1-workflow-agent");

export default function OrchestratingWorkflowCommand() {
  return (
    <Command
      name="9.1-orchestrating-workflow"
      description="Test command orchestrating a complete workflow: variable collection, agent spawning, status handling, and result output."
    >
      <h1>Command Orchestrating Agent Workflow Test</h1>

      <p>
        This integration test validates the complete workflow of a command that:
        collects input via variables, spawns an agent with that input,
        handles the agent's status, and outputs the result.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Variable is assigned BEFORE agent spawn</li>
        <li>Agent receives the variable values (not just references)</li>
        <li>OnStatus handler receives agent output fields</li>
        <li>Field interpolation works correctly in handlers</li>
        <li>Complete workflow produces coherent end result</li>
      </ol>

      <h2>Step 1: Collect Input via Variables</h2>

      <p>First, we collect and assign input values that will be passed to the agent:</p>

      <h3>Operation Type</h3>
      <Assign var={operationType} value="uppercase" />
      <p>Set operation to "uppercase" - the agent will convert input to uppercase.</p>

      <h3>Input Value</h3>
      <Assign var={inputValue} value="hello workflow orchestration" />
      <p>This is the value the agent will process.</p>

      <h3>Timestamp</h3>
      <Assign var={startTimestamp} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />
      <p>Record when the workflow started for timing analysis.</p>

      <p>Verify the variables are set:</p>
      <pre><code className="language-bash">{`echo "Operation: $OPERATION_TYPE"
echo "Input: $INPUT_VALUE"
echo "Started: $START_TIMESTAMP"`}</code></pre>

      <h2>Step 2: Spawn Agent with Variable Input</h2>

      <p>
        Now spawn the workflow agent, passing the collected variables as input.
        The agent should receive actual values, not shell variable references.
      </p>

      <SpawnAgent<WorkflowAgentInput, WorkflowAgentOutput>
        agent="9.1-workflow-agent"
        model="haiku"
        description="Process workflow with variable input"
        input={{
          operationType: operationType,
          inputValue: inputValue,
          timestamp: startTimestamp,
        }}
      >
        You are receiving input from the orchestrating command.
        Process the input according to the operationType and return structured results.
      </SpawnAgent>

      <h2>Step 3: Handle Agent Status</h2>

      <p>
        After the agent returns, evaluate its status and handle accordingly.
        Only ONE handler should execute based on the agent's actual status.
      </p>

      <OnStatus output={workflowOutput} status="SUCCESS">
        <h3>Workflow Completed Successfully</h3>

        <p>The agent processed the input and returned SUCCESS. Results:</p>

        <ul>
          <li><strong>Processed Result:</strong> {workflowOutput.field('processedResult')}</li>
          <li><strong>Operation Performed:</strong> {workflowOutput.field('operationPerformed')}</li>
          <li><strong>Input Received:</strong> {workflowOutput.field('inputReceived')}</li>
          <li><strong>Completion Time:</strong> {workflowOutput.field('outputTimestamp')}</li>
          <li><strong>Details:</strong> {workflowOutput.field('computationDetails')}</li>
        </ul>

        <p>
          <strong>Workflow validation:</strong> If the processed result is
          "HELLO WORKFLOW ORCHESTRATION" (uppercase of input), the complete
          workflow executed correctly.
        </p>
      </OnStatus>

      <OnStatus output={workflowOutput} status="ERROR">
        <h3>Workflow Failed</h3>

        <p>The agent encountered an error processing the input:</p>

        <ul>
          <li><strong>Error Message:</strong> {workflowOutput.field('message')}</li>
        </ul>

        <p>
          <strong>Recovery suggestion:</strong> Check that all input variables
          were correctly assigned and the operation type is valid.
        </p>
      </OnStatus>

      <h2>Step 4: Output Final Result</h2>

      <p>
        After handling the status, report the complete workflow results in YAML format.
        This validates that all integration points worked correctly.
      </p>

      <pre><code className="language-yaml">{`test_id: 9.1
test_name: Command Orchestrating Agent Workflow
workflow_steps:
  step_1_variable_assignment:
    operation_type_assigned: [YES/NO - was OPERATION_TYPE set before spawn?]
    input_value_assigned: [YES/NO - was INPUT_VALUE set before spawn?]
    timestamp_assigned: [YES/NO - was START_TIMESTAMP captured?]
  step_2_agent_spawn:
    agent_spawned: [YES/NO - was 9.1-workflow-agent spawned?]
    agent_received_values: [YES/NO - did agent receive actual values, not $VAR refs?]
    input_operationType: [what operationType the agent reported receiving]
    input_inputValue: [what inputValue the agent reported receiving]
    input_timestamp: [what timestamp the agent reported receiving]
  step_3_status_handling:
    agent_status: [SUCCESS/ERROR - what status did the agent return?]
    correct_handler_executed: [YES/NO - was the matching OnStatus handler executed?]
    field_interpolation_worked: [YES/NO - were output fields substituted in handler?]
  step_4_result_output:
    processed_result: [the final processed result from agent]
    workflow_duration: [approximate time from START_TIMESTAMP to completion]
overall_result: [PASSED/FAILED]
notes: [observations about the workflow orchestration]`}</code></pre>
    </Command>
  );
}
