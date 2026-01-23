/**
 * Scenario 5.4: Data Agent
 *
 * A simple agent that returns structured data fields,
 * used to validate the useOutput hook pattern.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.4-data-agent.tsx
 * Output: .claude/agents/5.4-data-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Output contract for the data agent
 */
export interface DataAgentOutput extends BaseOutput {
  itemCount: number;
  lastItem: string;
  processingTime: string;
}

export default function DataAgent() {
  return (
    <Agent<object, DataAgentOutput>
      name="5.4-data-agent"
      description="Data agent that returns structured output fields. Used for testing useOutput hook."
    >
      <h1>Data Agent</h1>

      <p>
        You are the 5.4-data-agent, an agent used to test the useOutput hook
        pattern for capturing agent output fields.
      </p>

      <h2>Your Purpose</h2>

      <p>
        Your job is to return structured data that the calling command can
        reference using the useOutput hook's field() accessor.
      </p>

      <h2>Required Actions</h2>

      <ol>
        <li>Acknowledge your role as the data agent</li>
        <li>Simulate processing some data</li>
        <li>Return a structured YAML response with specific fields</li>
      </ol>

      <h2>Response Format</h2>

      <p>
        You MUST end your response with this exact YAML structure.
        The calling command will reference these fields:
      </p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Data processing complete
itemCount: 42
lastItem: "final-item-xyz"
processingTime: "150ms"`}</code></pre>

      <h2>Output Field Contract</h2>

      <p>The command calling you expects these specific fields:</p>

      <ul>
        <li><strong>status</strong>: Always "SUCCESS" for this test</li>
        <li><strong>message</strong>: Human-readable status message</li>
        <li><strong>itemCount</strong>: A number (use 42)</li>
        <li><strong>lastItem</strong>: A string identifier (use "final-item-xyz")</li>
        <li><strong>processingTime</strong>: Duration string (use "150ms")</li>
      </ul>

      <h2>Important</h2>

      <p>
        Return exactly these values so the calling command can verify that
        the useOutput hook correctly captures and interpolates your output fields.
      </p>
    </Agent>
  );
}
