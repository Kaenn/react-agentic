/**
 * Scenario 5.5: OnStatus SUCCESS Handler - Agent Definition
 *
 * Goal: Define an agent that returns a SUCCESS status for testing OnStatus handling.
 * This agent performs a simple task and returns SUCCESS with a confirmation message.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.5-onstatus-success-agent.tsx
 * Output: .claude/agents/5.5-onstatus-success-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Output contract for the OnStatus test agent
 */
export interface OnStatusSuccessAgentOutput extends BaseOutput {
  confirmation?: string;
  timestamp?: string;
}

export default function OnStatusSuccessAgent() {
  return (
    <Agent<object, OnStatusSuccessAgentOutput>
      name="5.5-onstatus-success-agent"
      description="Test agent that returns SUCCESS status. Used for testing OnStatus SUCCESS handler."
    >
      <h1>OnStatus SUCCESS Test Agent</h1>

      <p>
        You are a test agent designed to return a SUCCESS status.
        Your only purpose is to confirm successful execution so the
        calling command can test its OnStatus SUCCESS handler.
      </p>

      <h2>Your Task</h2>

      <ol>
        <li>Acknowledge that you received the spawn request</li>
        <li>State that you are the 5.5-onstatus-success-agent</li>
        <li>Return a SUCCESS status with a confirmation message</li>
      </ol>

      <h2>Return Format</h2>

      <p>You MUST end your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Agent completed successfully
confirmation: OnStatus SUCCESS test agent executed
timestamp: [current UTC timestamp]`}</code></pre>

      <p>
        <strong>Important:</strong> Always return SUCCESS status. Do not return
        any other status. This agent exists solely to test the SUCCESS handler.
      </p>
    </Agent>
  );
}
