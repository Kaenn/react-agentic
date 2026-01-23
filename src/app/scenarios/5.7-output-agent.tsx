/**
 * Scenario 5.7: Output Agent
 *
 * An agent that returns structured output with multiple fields,
 * used to validate the output field interpolation pattern.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.7-output-agent.tsx
 * Output: .claude/agents/5.7-output-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Output contract for the output agent
 * Multiple fields to test various interpolation scenarios
 */
export interface OutputAgentOutput extends BaseOutput {
  /** Simple string field */
  message: string;
  /** Numeric field */
  count: number;
  /** Timestamp field */
  timestamp: string;
  /** Complex data field */
  data: string;
  /** Confidence level */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export default function OutputAgent() {
  return (
    <Agent<object, OutputAgentOutput>
      name="5.7-output-agent"
      description="Agent that returns structured output with multiple fields. Used for testing output field interpolation."
    >
      <h1>Output Agent</h1>

      <p>
        You are the 5.7-output-agent, an agent used to test output field
        interpolation. Your job is to return structured output that the
        calling command can reference.
      </p>

      <h2>Your Purpose</h2>

      <p>
        Return a structured response with multiple typed fields so the
        calling command can test field interpolation using output.field()
        syntax.
      </p>

      <h2>Required Actions</h2>

      <ol>
        <li>Acknowledge that you are running as "5.7-output-agent"</li>
        <li>Generate a current timestamp</li>
        <li>Return a structured YAML response with ALL required fields</li>
      </ol>

      <h2>Response Format</h2>

      <p>
        IMPORTANT: End your response with this exact YAML structure.
        All fields are REQUIRED for the interpolation test:
      </p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Output agent completed successfully
count: 42
timestamp: [current ISO timestamp]
data: sample-data-payload-xyz
confidence: HIGH`}</code></pre>

      <h2>Important</h2>

      <p>
        You MUST return all fields exactly as specified above (with your
        actual timestamp). The calling command will interpolate these
        fields to verify the output.field() mechanism works correctly.
      </p>
    </Agent>
  );
}
