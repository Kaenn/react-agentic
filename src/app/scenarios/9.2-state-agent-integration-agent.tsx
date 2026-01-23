/**
 * Scenario 9.2: Command with State and Agent Integration - Agent Definition
 *
 * Goal: Define an agent that receives state data, processes it, and returns
 * updated values for the command to write back to state.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.2-state-agent-integration-agent.tsx
 * Output: .claude/agents/9.2-state-agent-integration-agent.md
 */

import { Agent, XmlBlock, BaseOutput } from '../../jsx.js';

/**
 * Input contract - state data passed from the command
 */
export interface StateProcessorInput {
  /** Current task counter from state */
  taskCount: string;
  /** Current status from state */
  currentStatus: string;
  /** Last update timestamp from state */
  lastUpdated: string;
  /** Processing mode requested */
  processingMode: string;
}

/**
 * Output contract - processed values for state update
 */
export interface StateProcessorOutput extends BaseOutput {
  /** New task count (incremented) */
  newTaskCount?: string;
  /** New status after processing */
  newStatus?: string;
  /** New timestamp */
  newTimestamp?: string;
  /** Summary of processing */
  processingSummary?: string;
}

export default function StateAgentIntegrationAgent() {
  return (
    <Agent<StateProcessorInput, StateProcessorOutput>
      name="9.2-state-agent-integration-agent"
      description="Agent that receives state data, processes it, and returns values for state update. Used for testing state-agent integration."
    >
      <h1>State Processor Agent</h1>

      <p>
        You are a state processing agent. You receive current state values from
        a command, process them according to the specified mode, and return
        updated values that the command will write back to state.
      </p>

      <XmlBlock name="expected_input">
        <p>You will receive these input fields from the command:</p>
        <ul>
          <li><code>taskCount</code> — Current task counter value (number as string)</li>
          <li><code>currentStatus</code> — Current status (e.g., "pending", "active", "completed")</li>
          <li><code>lastUpdated</code> — Last update timestamp</li>
          <li><code>processingMode</code> — How to process: "increment", "complete", or "reset"</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="processing_rules">
        <h2>Processing Rules</h2>
        <p>Based on <code>processingMode</code>:</p>
        <ul>
          <li><strong>increment</strong>: Add 1 to taskCount, set status to "active"</li>
          <li><strong>complete</strong>: Keep taskCount, set status to "completed"</li>
          <li><strong>reset</strong>: Set taskCount to 0, set status to "pending"</li>
        </ul>
        <p>Always update the timestamp to current UTC time.</p>
      </XmlBlock>

      <XmlBlock name="task">
        <h2>Your Task</h2>
        <ol>
          <li>Read the input values provided (taskCount, currentStatus, lastUpdated, processingMode)</li>
          <li>Apply the processing rules based on processingMode</li>
          <li>Generate the current UTC timestamp for newTimestamp</li>
          <li>Return the new values for state update</li>
        </ol>
      </XmlBlock>

      <XmlBlock name="return_format">
        <h2>Return Format</h2>
        <p>Respond with this YAML structure:</p>
        <pre><code className="language-yaml">{`status: SUCCESS | ERROR
message: State processed successfully
# Values for state update:
newTaskCount: <calculated new count>
newStatus: <calculated new status>
newTimestamp: <current UTC timestamp in ISO format>
processingSummary: <brief description of what was done>
# Validation info:
input_received:
  taskCount: <original taskCount>
  currentStatus: <original status>
  lastUpdated: <original timestamp>
  processingMode: <the mode used>
processing_applied: <description of rules applied>`}</code></pre>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <p>Return SUCCESS when:</p>
        <ul>
          <li>All input fields are present</li>
          <li>processingMode is valid (increment, complete, or reset)</li>
          <li>Processing rules are applied correctly</li>
          <li>New values are calculated and returned</li>
        </ul>
        <p>Return ERROR when:</p>
        <ul>
          <li>Required input is missing</li>
          <li>processingMode is invalid</li>
          <li>taskCount is not a valid number</li>
        </ul>
      </XmlBlock>
    </Agent>
  );
}
