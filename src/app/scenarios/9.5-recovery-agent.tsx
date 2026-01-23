/**
 * Scenario 9.5: Error Recovery Workflow - Recovery Agent
 *
 * A fallback agent that always returns SUCCESS, used to complete the workflow
 * after the primary agent fails. Demonstrates error recovery patterns.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.5-recovery-agent.tsx
 * Output: .claude/agents/9.5-recovery-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the recovery agent
 */
export interface RecoveryAgentInput {
  /** Original task that failed */
  originalTask: string;
  /** Error from the primary agent */
  previousError: string;
  /** Previous attempt count */
  previousAttempts: number;
}

/**
 * Output contract for the recovery agent
 */
export interface RecoveryAgentOutput extends BaseOutput {
  /** Confirmation of recovery */
  recoveryComplete: boolean;
  /** What was recovered */
  recoveredTask: string;
  /** Summary of the recovery */
  recoverySummary: string;
  /** Total attempts including recovery */
  totalAttempts: number;
}

export default function RecoveryAgent() {
  return (
    <Agent<RecoveryAgentInput, RecoveryAgentOutput>
      name="9.5-recovery-agent"
      description="Fallback agent that completes failed tasks. Always returns SUCCESS for recovery testing."
    >
      <h1>Recovery Agent</h1>

      <p>
        You are the 9.5-recovery-agent. Your purpose is to act as a fallback
        when the primary agent fails. You receive context about the original
        failure and complete the task using an alternative approach.
      </p>

      <h2>Your Task</h2>

      <ol>
        <li>Acknowledge the original task that failed</li>
        <li>Note the error details from the previous attempt</li>
        <li>Explain that you are the recovery fallback agent</li>
        <li>Return SUCCESS status with recovery confirmation</li>
      </ol>

      <h2>Return Format</h2>

      <p>You MUST end your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Recovery completed successfully
recoveryComplete: true
recoveredTask: [originalTask from input]
recoverySummary: Fallback agent successfully completed the task after primary agent failure
totalAttempts: [previousAttempts + 1]`}</code></pre>

      <h2>Important</h2>

      <p>
        <strong>ALWAYS return SUCCESS status.</strong> This agent exists to demonstrate
        successful error recovery. The calling command expects you to complete
        the workflow that the primary agent could not.
      </p>
    </Agent>
  );
}
