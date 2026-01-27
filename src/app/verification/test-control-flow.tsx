/**
 * Verification Test: Loop and OnStatus Components
 *
 * Purpose: Verify control flow components emit correct markdown patterns
 *
 * Run: node dist/cli/index.js build src/app/verification/test-control-flow.tsx
 * Output: .claude/commands/test-control-flow.md
 */

import { Command, Loop, OnStatus, SpawnAgent, useVariable, useOutput } from '../../jsx.js';

// Declare variables at module level
const files = useVariable<string[]>("FILES");

export default function TestControlFlow() {
  const output = useOutput("spawn-result");

  return (
    <Command name="test-control-flow" description="Verify Loop and OnStatus components">
      <h1>Control Flow Component Tests</h1>

      <p>
        This test validates that Loop and OnStatus components emit the correct
        markdown patterns for iteration and conditional agent status handling.
      </p>

      <h2>Test 1: Basic Loop with String Array</h2>

      <p>Loop through a literal array of strings:</p>

      <Loop items={["item1", "item2", "item3"]} as="item">
        <p>Processing: {item}</p>
      </Loop>

      <h2>Test 2: Loop with Custom Parameter Name</h2>

      <p>Loop through files with custom iteration variable:</p>

      <Loop items={["a.ts", "b.ts", "c.ts"]} as="file">
        <p>Building: {file}</p>
        <p>Output: {file}.js</p>
      </Loop>

      <h2>Test 3: Loop with Variable Reference</h2>

      <p>Loop through a variable-referenced array:</p>

      <Loop items={files} as="f">
        <p>Processing file: {f}</p>
      </Loop>

      <h2>Test 4: OnStatus SUCCESS Handler</h2>

      <p>Spawn an agent and handle successful completion:</p>

      <SpawnAgent
        agent="test-agent"
        model="claude-sonnet-4-5"
        description="Test agent for OnStatus verification"
        input={{ data: "test" }}
        output={output}
      />

      <OnStatus output={output} status="SUCCESS">
        <p>Agent completed successfully</p>
        <p>Result available in: {output}</p>
      </OnStatus>

      <h2>Test 5: OnStatus ERROR Handler</h2>

      <p>Handle agent errors:</p>

      <OnStatus output={output} status="ERROR">
        <p>Agent encountered an error</p>
        <p>Review error details in: {output}</p>
      </OnStatus>

      <h2>Test 6: Multiple OnStatus Handlers</h2>

      <p>Multiple status handlers for the same spawn:</p>

      <OnStatus output={output} status="SUCCESS">
        <p>Success path: proceed with next step</p>
      </OnStatus>

      <OnStatus output={output} status="ERROR">
        <p>Error path: rollback changes</p>
      </OnStatus>

      <h2>Expected Output Patterns</h2>

      <ul>
        <li>Loop should emit: <strong>For each [as] in [items]:</strong></li>
        <li>OnStatus should emit: <strong>On SUCCESS:</strong> or <strong>On ERROR:</strong></li>
        <li>Children should be indented under their parent control flow</li>
      </ul>

      <h2>Validation</h2>

      <p>Check the generated markdown for:</p>

      <ol>
        <li>Loop iteration patterns with correct variable names</li>
        <li>OnStatus conditional blocks with correct status keywords</li>
        <li>Proper nesting and indentation of child content</li>
        <li>Variable interpolation in loop bodies</li>
      </ol>
    </Command>
  );
}
