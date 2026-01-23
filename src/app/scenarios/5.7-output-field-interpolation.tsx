/**
 * Scenario 5.7: Output Field Interpolation
 *
 * Goal: Confirm that output field references are correctly interpolated
 * in content after an agent returns.
 *
 * Success Criteria:
 * - Field interpolation syntax appears in markdown
 * - Claude substitutes the actual field value from agent output
 * - Multiple field references work in the same content
 * - Field access works within OnStatus handlers
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.7-output-field-interpolation.tsx
 * Output: .claude/commands/5.7-output-field-interpolation.md
 */

import { Command, SpawnAgent, useOutput, OnStatus } from '../../jsx.js';
import type { OutputAgentOutput } from './5.7-output-agent.js';

export default function OutputFieldInterpolationCommand() {
  const output = useOutput<OutputAgentOutput>('5.7-output-agent');

  return (
    <Command
      name="5.7-output-field-interpolation"
      description="Test command for output field interpolation. Verifies output.field() syntax works correctly."
    >
      <h1>Output Field Interpolation Test</h1>

      <p>
        This command tests that the useOutput hook and output.field() method
        correctly produce interpolation syntax that Claude can substitute
        with actual values from agent output.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify output.field() produces interpolation syntax in markdown</li>
        <li>Verify Claude substitutes actual field values after agent returns</li>
        <li>Verify multiple field references work in the same content</li>
        <li>Verify field access works within OnStatus handlers</li>
      </ol>

      <h2>Step 1: Spawn the Output Agent</h2>

      <p>
        Execute the following Task() call to spawn the output agent.
        The agent will return structured output with multiple fields:
      </p>

      <SpawnAgent<object, OutputAgentOutput>
        agent="5.7-output-agent"
        model="haiku"
        description="Generate structured output for interpolation testing"
        prompt={`You are being spawned to test output field interpolation.

Your task:
1. Return a structured YAML response with all required fields
2. Include: status, message, count, timestamp, data, confidence
3. Use realistic values that can be verified

This validates that:
- The agent returns typed output
- The calling command can interpolate field values
- Multiple fields can be accessed from the same output`}
      />

      <h2>Step 2: Handle Agent Output</h2>

      <p>
        After the agent returns, use the output fields to verify interpolation.
        The following sections test different OnStatus scenarios:
      </p>

      <h3>Test A: SUCCESS Handler with Single Field</h3>

      <OnStatus output={output} status="SUCCESS">
        <p>
          Agent returned SUCCESS. The message field contains: {output.field('message')}
        </p>
      </OnStatus>

      <h3>Test B: SUCCESS Handler with Multiple Fields</h3>

      <OnStatus output={output} status="SUCCESS">
        <p>
          Multiple field interpolation test:
        </p>
        <ul>
          <li>Count: {output.field('count')}</li>
          <li>Timestamp: {output.field('timestamp')}</li>
          <li>Data: {output.field('data')}</li>
          <li>Confidence: {output.field('confidence')}</li>
        </ul>
      </OnStatus>

      <h3>Test C: SUCCESS Handler with Fields in Prose</h3>

      <OnStatus output={output} status="SUCCESS">
        <p>
          The agent completed with {output.field('confidence')} confidence,
          processing {output.field('count')} items at {output.field('timestamp')}.
          The payload was: {output.field('data')}.
        </p>
      </OnStatus>

      <h3>Test D: BLOCKED Handler</h3>

      <OnStatus output={output} status="BLOCKED">
        <p>
          Agent was blocked. Status message: {output.field('message')}
        </p>
      </OnStatus>

      <h3>Test E: ERROR Handler</h3>

      <OnStatus output={output} status="ERROR">
        <p>
          Agent encountered an error: {output.field('message')}
        </p>
      </OnStatus>

      <h2>Validation</h2>

      <p>After completing the above steps, report the following in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: "5.7"
test_name: Output Field Interpolation
results:
  field_syntax_in_markdown: [YES/NO - did you see {output.field} syntax in the command?]
  agent_spawned: [YES/NO - did the agent spawn successfully?]
  agent_returned_fields: [YES/NO - did agent return all expected fields?]
  single_field_interpolated: [YES/NO - was message field value substituted?]
  multiple_fields_interpolated: [YES/NO - were count, timestamp, data, confidence substituted?]
  prose_interpolation_worked: [YES/NO - did inline field refs in sentences work?]
  onstatus_handlers_worked: [YES/NO - did OnStatus SUCCESS handler execute?]
actual_values:
  message: [the actual message value you saw]
  count: [the actual count value you saw]
  timestamp: [the actual timestamp value you saw]
  data: [the actual data value you saw]
  confidence: [the actual confidence value you saw]
overall_result: [PASSED/FAILED]
notes: [any observations about the output field interpolation behavior]`}</code></pre>
    </Command>
  );
}
