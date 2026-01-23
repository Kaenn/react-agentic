/**
 * Scenario 9.5: Error Recovery Workflow - Failing Agent
 *
 * An agent that returns ERROR status to trigger the error recovery workflow.
 * Used to test that OnStatus ERROR handlers can implement retry/recovery logic.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.5-failing-agent.tsx
 * Output: .claude/agents/9.5-failing-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the failing agent
 */
export interface FailingAgentInput {
  /** Task description */
  task: string;
  /** Attempt number */
  attempt: number;
}

/**
 * Output contract for the failing agent
 */
export interface FailingAgentOutput extends BaseOutput {
  /** The task that was attempted */
  attemptedTask: string;
  /** Which attempt this was */
  attemptNumber: number;
  /** Error details when status is ERROR */
  errorDetails?: string;
  /** Error code for recovery routing */
  errorCode?: string;
}

export default function FailingAgent() {
  return (
    <Agent<FailingAgentInput, FailingAgentOutput>
      name="9.5-failing-agent"
      description="Test agent that returns ERROR status to trigger error recovery workflow."
    >
      <h1>Failing Test Agent</h1>

      <p>
        You are the 9.5-failing-agent. Your purpose is to simulate a failure
        scenario to test error recovery workflows. You will ALWAYS return ERROR
        status so that the calling command's ERROR handler can be tested.
      </p>

      <h2>Your Task</h2>

      <ol>
        <li>Acknowledge the task and attempt number from your input</li>
        <li>Explain that you are simulating a failure for testing purposes</li>
        <li>Return ERROR status with detailed error context</li>
      </ol>

      <h2>Return Format</h2>

      <p>You MUST end your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: ERROR
message: Simulated failure for error recovery testing
attemptedTask: [task from input]
attemptNumber: [attempt from input]
errorDetails: The primary agent encountered a simulated error. Recovery should be attempted.
errorCode: SIMULATED_FAILURE`}</code></pre>

      <h2>Important</h2>

      <p>
        <strong>ALWAYS return ERROR status.</strong> This agent exists solely to
        test error recovery workflows. Do not return SUCCESS or any other status.
        The calling command will use your ERROR response to trigger recovery logic.
      </p>
    </Agent>
  );
}
