/**
 * Scenario 5.2: SpawnAgent with Variable Input - Agent Definition
 *
 * Goal: Define an agent that receives variable input via the input prop
 * and confirms it received the correct value.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.2-input-receiver-agent.tsx
 * Output: .claude/agents/5.2-input-receiver-agent.md
 */

import { Agent, XmlBlock, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the input-receiver agent
 *
 * This interface defines what the command passes via SpawnAgent input prop.
 * The emitter generates XML blocks like <message>{value}</message> for each property.
 */
export interface InputReceiverInput {
  /** The message passed from the command */
  message: string;
  /** A timestamp value to verify variable interpolation */
  timestamp: string;
  /** A test mode flag */
  testMode: string;
}

/**
 * Output contract for the input-receiver agent
 */
export interface InputReceiverOutput extends BaseOutput {
  /** Echo of the received message */
  receivedMessage?: string;
  /** Echo of the received timestamp */
  receivedTimestamp?: string;
  /** Echo of the received test mode */
  receivedTestMode?: string;
  /** Verification of input completeness */
  inputComplete?: boolean;
}

export default function InputReceiverAgent() {
  return (
    <Agent<InputReceiverInput, InputReceiverOutput>
      name="5.2-input-receiver-agent"
      description="Test agent that receives variable input and confirms the values. Used for testing SpawnAgent input passing."
    >
      <h1>Input Receiver Agent</h1>

      <p>
        You are a test agent that receives input values from a command
        via the SpawnAgent input prop. Your job is to confirm you received
        the correct values.
      </p>

      <XmlBlock name="expected_input">
        <p>You should receive these input fields:</p>
        <ul>
          <li><code>message</code> — A text message from the command</li>
          <li><code>timestamp</code> — A timestamp value (from bash command)</li>
          <li><code>testMode</code> — A test mode flag (static value)</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="task">
        <h2>Your Task</h2>
        <ol>
          <li>Read the input values provided to you</li>
          <li>Echo each value back to confirm receipt</li>
          <li>Verify all required fields are present and non-empty</li>
          <li>Return a structured response with the received values</li>
        </ol>
      </XmlBlock>

      <XmlBlock name="return_format">
        <h2>Return Format</h2>
        <p>Respond with this YAML structure:</p>
        <pre><code className="language-yaml">{`status: SUCCESS | ERROR
message: Input received and verified
receivedMessage: <the message value you received>
receivedTimestamp: <the timestamp value you received>
receivedTestMode: <the testMode value you received>
inputComplete: true | false
validation:
  message_received: PASSED | FAILED
  timestamp_received: PASSED | FAILED
  testMode_received: PASSED | FAILED
  all_values_non_empty: PASSED | FAILED`}</code></pre>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <p>Return SUCCESS when:</p>
        <ul>
          <li>All three input fields are present</li>
          <li>All values are non-empty strings</li>
          <li>Values can be echoed back correctly</li>
        </ul>
        <p>Return ERROR when:</p>
        <ul>
          <li>Any input field is missing</li>
          <li>Any value is empty or undefined</li>
        </ul>
      </XmlBlock>
    </Agent>
  );
}
