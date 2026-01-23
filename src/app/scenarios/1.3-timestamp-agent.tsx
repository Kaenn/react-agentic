/**
 * Scenario 1.3: Spawn a Minimal Agent - Agent Definition
 *
 * Goal: Define a minimal agent that can be spawned by a command.
 * This agent confirms it was spawned and reports the current timestamp.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/1.3-timestamp-agent.tsx
 * Output: .claude/agents/1.3-timestamp-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Output contract for the timestamp agent
 */
export interface TimestampAgentOutput extends BaseOutput {
  timestamp?: string;
  invocationSource?: string;
}

export default function TimestampAgent() {
  return (
    <Agent<object, TimestampAgentOutput>
      name="1.3-timestamp-agent"
      description="A minimal test agent that confirms spawning and reports timestamp. Used for testing agent invocation."
    >
      <h1>Timestamp Agent</h1>

      <p>
        You have been successfully spawned as a sub-agent. This confirms that
        the Task() call correctly launched you with your agent configuration.
      </p>

      <h2>Your Task</h2>

      <p>Please respond with the following confirmation:</p>

      <ul>
        <li>Say "Agent spawn successful!"</li>
        <li>Confirm you are running as the 1.3-timestamp-agent</li>
        <li>State the current timestamp</li>
        <li>Return to your caller with the timestamp value</li>
      </ul>

      <h2>Return Format</h2>

      <p>End your response with:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Agent executed successfully
timestamp: [current timestamp]
invocationSource: spawn-agent-command`}</code></pre>
    </Agent>
  );
}
