/**
 * Scenario 5.4: useOutput Hook Declaration
 *
 * Goal: Confirm that useOutput() creates a reference for capturing agent output fields.
 *
 * Success Criteria:
 * - useOutput creates an output reference
 * - output.field() produces correct interpolation syntax
 * - Field references appear in the markdown
 * - Claude understands to use the agent's return value
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.4-useoutput-test.tsx
 * Output: .claude/commands/5.4-useoutput-test.md
 */

import { Command, SpawnAgent, useOutput, OnStatus, BaseOutput } from '../../jsx.js';

/**
 * Output contract for the data agent
 * Used for type-safe field() access
 */
interface DataAgentOutput extends BaseOutput {
  itemCount: number;
  lastItem: string;
  processingTime: string;
}

export default function UseOutputTestCommand() {
  // Test 1: Create output reference with useOutput
  const dataOutput = useOutput<DataAgentOutput>("5.4-data-agent");

  return (
    <Command
      name="5.4-useoutput-test"
      description="Test useOutput hook for capturing agent output fields."
    >
      <h1>useOutput Hook Declaration Test</h1>

      <p>
        This command tests that the useOutput() hook correctly creates an output
        reference that can be used to access agent return values.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify useOutput creates an output reference bound to an agent name</li>
        <li>Verify output.field() produces correct interpolation syntax in markdown</li>
        <li>Verify field references appear visibly in the generated markdown</li>
        <li>Verify Claude can use the agent's actual return values</li>
      </ol>

      <h2>Test 1: Output Reference Creation</h2>

      <p>
        The useOutput hook was called with agent name "5.4-data-agent".
        This creates an OutputRef bound to that agent.
      </p>

      <h2>Test 2: Field Interpolation Syntax</h2>

      <p>
        When output.field() is called, it should produce {'{output.fieldName}'}{' '}syntax.
        Below are field references that should appear in the markdown:
      </p>

      <ul>
        <li>Item count field: {dataOutput.field('itemCount')}</li>
        <li>Last item field: {dataOutput.field('lastItem')}</li>
        <li>Processing time field: {dataOutput.field('processingTime')}</li>
        <li>Status field: {dataOutput.field('status')}</li>
        <li>Message field: {dataOutput.field('message')}</li>
      </ul>

      <h2>Test 3: Spawn Agent and Capture Output</h2>

      <p>
        Spawn the data agent and use its output fields:
      </p>

      <SpawnAgent<object, DataAgentOutput>
        agent="5.4-data-agent"
        model="haiku"
        description="Generate data with specific output fields"
        prompt={`You are being spawned to test the useOutput hook pattern.

Your task:
1. Process some test data (just simulate it)
2. Return a structured YAML response with specific fields

Return this EXACT format:
\`\`\`yaml
status: SUCCESS
message: Data processing complete
itemCount: 42
lastItem: "final-item-xyz"
processingTime: "150ms"
\`\`\`

This tests that the calling command can reference these fields.`}
      />

      <h2>Test 4: Using Output Fields After Agent Returns</h2>

      <p>
        After the agent completes, Claude should substitute these placeholders
        with the actual values from the agent's response:
      </p>

      <ul>
        <li>The agent processed {dataOutput.field('itemCount')}{' '}items</li>
        <li>The last item was: {dataOutput.field('lastItem')}{' '}</li>
        <li>Total processing time: {dataOutput.field('processingTime')}{' '}</li>
        <li>Agent status: {dataOutput.field('status')}{' '}</li>
      </ul>

      <h2>Validation</h2>

      <p>Report the following in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 5.4
test_name: useOutput Hook Declaration
output_ref_created: [YES/NO - was OutputRef created?]
field_syntax_in_markdown: [YES/NO - do {output.X} placeholders appear?]
field_references_visible:
  - itemCount: [YES/NO]
  - lastItem: [YES/NO]
  - processingTime: [YES/NO]
  - status: [YES/NO]
  - message: [YES/NO]
agent_returned_values: [YES/NO - did agent return the expected fields?]
claude_substituted_values: [YES/NO - were placeholders replaced with actual values?]
overall_result: [PASSED/FAILED]
notes: [any observations about the useOutput behavior]`}</code></pre>
    </Command>
  );
}
