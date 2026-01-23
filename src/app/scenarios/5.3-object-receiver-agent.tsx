/**
 * Scenario 5.3: SpawnAgent with Object Input - Agent Definition
 *
 * Goal: Define an agent that receives and processes object input
 * with multiple properties from a command.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.3-object-receiver-agent.tsx
 * Output: .claude/agents/5.3-object-receiver-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the object receiver agent
 */
export interface ObjectReceiverInput {
  file: string;
  mode: string;
  user: string;
  options: string;
}

/**
 * Output contract for the object receiver agent
 */
export interface ObjectReceiverOutput extends BaseOutput {
  propertiesReceived: number;
  file?: string;
  mode?: string;
  user?: string;
  options?: string;
}

export default function ObjectReceiverAgent() {
  return (
    <Agent<ObjectReceiverInput, ObjectReceiverOutput>
      name="5.3-object-receiver-agent"
      description="Test agent that receives object input with multiple properties and reports what it received."
    >
      <h1>Object Receiver Agent</h1>

      <p>
        You have been spawned to verify that object inputs with multiple
        properties are correctly passed from a command to an agent.
      </p>

      <h2>Your Input</h2>

      <p>
        You should have received structured input with the following properties:
      </p>
      <ul>
        <li>file - a file path (should be a variable value)</li>
        <li>mode - a mode string (should be "strict")</li>
        <li>user - a username (should be a variable value from $USER)</li>
        <li>options - option string (should be "verbose logging enabled")</li>
      </ul>

      <h2>Your Task</h2>

      <ol>
        <li>Examine your input to find all four properties</li>
        <li>Report each property name and its value</li>
        <li>Count the total number of properties received</li>
        <li>Verify if each property has a non-empty value</li>
      </ol>

      <h2>Return Format</h2>

      <p>Return your findings in this exact YAML format:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Object input received and validated
propertiesReceived: [count]
properties:
  file: [value received]
  mode: [value received]
  user: [value received]
  options: [value received]
validation:
  file_present: [true/false]
  mode_is_strict: [true/false]
  user_present: [true/false]
  options_correct: [true/false]
  all_valid: [true/false]`}</code></pre>
    </Agent>
  );
}
