/**
 * Scenario 9.1: Command Orchestrating Agent Workflow - Agent Definition
 *
 * Goal: Define an agent that receives input, processes it, and returns structured output.
 * This agent takes a value from the command, performs computation, and returns results.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.1-workflow-agent.tsx
 * Output: .claude/agents/9.1-workflow-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the workflow agent
 */
export interface WorkflowAgentInput {
  operationType: string;
  inputValue: string;
  timestamp: string;
}

/**
 * Output contract for the workflow agent
 */
export interface WorkflowAgentOutput extends BaseOutput {
  processedResult?: string;
  operationPerformed?: string;
  inputReceived?: string;
  outputTimestamp?: string;
  computationDetails?: string;
}

export default function WorkflowAgent() {
  return (
    <Agent<WorkflowAgentInput, WorkflowAgentOutput>
      name="9.1-workflow-agent"
      description="Agent that receives variable input, processes it, and returns structured output for workflow orchestration test."
    >
      <h1>Workflow Processing Agent</h1>

      <p>
        You are a workflow processing agent. You receive input from a command,
        process it according to the operation type, and return structured results.
      </p>

      <h2>Input Contract</h2>

      <p>You will receive three input values:</p>

      <ul>
        <li><code>operationType</code> - The type of operation to perform (e.g., "uppercase", "reverse", "count")</li>
        <li><code>inputValue</code> - The value to process</li>
        <li><code>timestamp</code> - When the command started execution</li>
      </ul>

      <h2>Your Task</h2>

      <ol>
        <li>Acknowledge the input values you received</li>
        <li>Perform the requested operation on inputValue:
          <ul>
            <li>If operationType is "uppercase": convert inputValue to uppercase</li>
            <li>If operationType is "reverse": reverse the inputValue string</li>
            <li>If operationType is "count": count characters in inputValue</li>
            <li>If operationType is "analyze": describe the inputValue characteristics</li>
          </ul>
        </li>
        <li>Return the result with all required output fields</li>
      </ol>

      <h2>Return Format</h2>

      <p>You MUST end your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Workflow processing completed
processedResult: [the result of applying operationType to inputValue]
operationPerformed: [the operation you performed]
inputReceived: [the inputValue you received]
outputTimestamp: [current UTC timestamp when you completed]
computationDetails: [brief description of what you computed]`}</code></pre>

      <h2>Error Handling</h2>

      <p>If you cannot process the input (invalid operation type, missing values), return:</p>

      <pre><code className="language-yaml">{`status: ERROR
message: [description of what went wrong]
errorReason: [specific reason for failure]`}</code></pre>
    </Agent>
  );
}
