/**
 * Scenario 5.3: SpawnAgent with Object Input - Command Definition
 *
 * Goal: Confirm that SpawnAgent can receive an object literal as input
 * with multiple properties, including mixed variable and literal values.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.3-spawnagent-object-input.tsx
 * Output: .claude/commands/5.3-spawnagent-object-input.md
 */

import { Command, SpawnAgent, useVariable, Assign } from '../../jsx.js';
import type { ObjectReceiverInput, ObjectReceiverOutput } from './5.3-object-receiver-agent.js';

export default function SpawnAgentObjectInputCommand() {
  // Declare variables for dynamic input
  const targetFile = useVariable('TARGET_FILE');
  const userName = useVariable('USER_NAME');

  return (
    <Command
      name="5.3-spawnagent-object-input"
      description="Test SpawnAgent with object literal input containing multiple properties"
    >
      <h1>SpawnAgent Object Input Test</h1>

      <p>
        This command tests passing an object literal with multiple properties to
        SpawnAgent, including both static string values and variable references.
      </p>

      <h2>Setup Variables</h2>

      <p>First, assign values to test variables:</p>

      <Assign var={targetFile} value="package.json" />
      <Assign var={userName} env="USER" />

      <h2>Process</h2>

      <h3>Step 1: Spawn Agent with Object Input</h3>

      <p>Launch the agent with a structured object containing:</p>
      <ul>
        <li>file: variable reference (TARGET_FILE)</li>
        <li>mode: static string "strict"</li>
        <li>user: variable reference (USER_NAME)</li>
        <li>options: static string with spaces</li>
      </ul>

      <SpawnAgent<ObjectReceiverInput, ObjectReceiverOutput>
        agent="5.3-object-receiver-agent"
        model="haiku"
        description="Test object input with mixed variable and literal properties"
        input={{
          file: targetFile,
          mode: 'strict',
          user: userName,
          options: 'verbose logging enabled',
        }}
      >
        Verify that you received all four properties in your input.
        Report back each property name and value you received.
      </SpawnAgent>

      <h3>Step 2: Validate Results</h3>

      <p>After the agent returns, verify:</p>
      <ul>
        <li>Agent received exactly 4 properties</li>
        <li>file property contains "package.json"</li>
        <li>mode property contains "strict"</li>
        <li>user property contains the current username</li>
        <li>options property contains "verbose logging enabled"</li>
      </ul>

      <h3>Step 3: Report Test Results</h3>

      <p>Summarize the test with:</p>
      <pre><code className="language-yaml">{`test_name: SpawnAgent Object Input
object_literal_serialized: [true/false]
multiple_properties_passed: [true/false]
mixed_variable_literal_works: [true/false]
agent_received_structured_input: [true/false]
all_criteria_passed: [true/false]`}</code></pre>
    </Command>
  );
}
