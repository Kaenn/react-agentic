/**
 * Scenario 6.3: ReadState Specific Field
 *
 * Tests that `<ReadState field="...">` reads a specific field from the state:
 * - ReadState with field reads only that field
 * - Claude executes the field-specific read
 * - The result is the field's value (not entire state)
 * - Nested field paths work (e.g., "config.timeout")
 */
import {
  Command,
  useVariable,
  useStateRef,
  WriteState,
  ReadState,
  XmlBlock,
} from '../../jsx.js';

// Define typed schema with nested structure for testing
interface TestState {
  name: string;
  version: string;
  count: number;
  config: {
    timeout: number;
    retries: number;
    mode: string;
  };
  metadata: {
    author: string;
    tags: string[];
  };
}

export default function ReadStateSpecificField() {
  // Create state reference with typed schema
  const testState = useStateRef<TestState>('scenario-6-3-test');

  // Variables to store read results
  const nameResult = useVariable('NAME_RESULT');
  const countResult = useVariable('COUNT_RESULT');
  const timeoutResult = useVariable('TIMEOUT_RESULT');
  const modeResult = useVariable('MODE_RESULT');
  const authorResult = useVariable('AUTHOR_RESULT');
  const fullStateResult = useVariable('FULL_STATE_RESULT');

  return (
    <Command
      name="6.3-readstate-specific-field"
      description="Test ReadState with field parameter for specific field reading"
    >
      <h1>ReadState Specific Field Test</h1>

      <p>
        This command validates that <code>&lt;ReadState field="..."&gt;</code> correctly reads specific fields from state.
      </p>

      <h2>Test Setup</h2>

      <p>First, we'll initialize the state with known values, then read specific fields.</p>

      <h3>Step 1: Initialize Test State</h3>

      <p>Create the state file with test data by running:</p>

      {/* Initialize state with known nested structure */}
      <WriteState
        state={testState}
        merge={{
          name: "test-project",
          version: "1.0.0",
          count: 42,
          config: {
            timeout: 5000,
            retries: 3,
            mode: "production"
          },
          metadata: {
            author: "test-user",
            tags: ["scenario", "test", "6.3"]
          }
        }}
      />

      <h3>Step 2: Read Top-Level Fields</h3>

      <p><strong>Test 1: Read 'name' field (string)</strong></p>

      <ReadState state={testState} into={nameResult} field="name" />

      <p><strong>Test 2: Read 'count' field (number)</strong></p>

      <ReadState state={testState} into={countResult} field="count" />

      <h3>Step 3: Read Nested Fields</h3>

      <p><strong>Test 3: Read 'config.timeout' (nested number)</strong></p>

      <ReadState state={testState} into={timeoutResult} field="config.timeout" />

      <p><strong>Test 4: Read 'config.mode' (nested string)</strong></p>

      <ReadState state={testState} into={modeResult} field="config.mode" />

      <p><strong>Test 5: Read 'metadata.author' (nested string)</strong></p>

      <ReadState state={testState} into={authorResult} field="metadata.author" />

      <h3>Step 4: Compare with Full State Read</h3>

      <p><strong>Test 6: Read entire state (no field parameter)</strong></p>

      <ReadState state={testState} into={fullStateResult} />

      <h2>Expected Results</h2>

      <XmlBlock name="expected-results-table">
        | Test | Field Path | Expected Value | Variable |
        |------|------------|----------------|----------|
        | 1 | name | "test-project" | NAME_RESULT |
        | 2 | count | 42 | COUNT_RESULT |
        | 3 | config.timeout | 5000 | TIMEOUT_RESULT |
        | 4 | config.mode | "production" | MODE_RESULT |
        | 5 | metadata.author | "test-user" | AUTHOR_RESULT |
        | 6 | (full state) | &#123;entire object&#125; | FULL_STATE_RESULT |
      </XmlBlock>

      <h2>Validation Instructions</h2>

      <p>After running this command, verify:</p>

      <ol>
        <li><strong>Field reads return only that field's value</strong>, not the entire state object</li>
        <li><strong>Nested field paths</strong> (like config.timeout) correctly navigate the object structure</li>
        <li><strong>Full state read</strong> (Test 6) returns the complete object for comparison</li>
        <li><strong>Different types</strong> work: strings (name, mode), numbers (count, timeout)</li>
      </ol>

      <p>Report findings in this YAML format:</p>

      <XmlBlock name="expected-output">
{`status: SUCCESS
test_results:
  test_1_name:
    field_path: "name"
    expected: "test-project"
    actual: "[VALUE_FROM_NAME_RESULT]"
    passed: true
  test_2_count:
    field_path: "count"
    expected: 42
    actual: "[VALUE_FROM_COUNT_RESULT]"
    passed: true
  test_3_nested_timeout:
    field_path: "config.timeout"
    expected: 5000
    actual: "[VALUE_FROM_TIMEOUT_RESULT]"
    passed: true
  test_4_nested_mode:
    field_path: "config.mode"
    expected: "production"
    actual: "[VALUE_FROM_MODE_RESULT]"
    passed: true
  test_5_nested_author:
    field_path: "metadata.author"
    expected: "test-user"
    actual: "[VALUE_FROM_AUTHOR_RESULT]"
    passed: true
  test_6_full_state:
    is_complete_object: true
    contains_all_fields: ["name", "version", "count", "config", "metadata"]
criteria_validation:
  field_reads_specific_value: true  # ReadState with field returns only that field
  nested_paths_work: true           # config.timeout, metadata.author work
  result_is_value_not_object: true  # Field read returns value, not entire state
message: "All ReadState field access tests passed"`}
      </XmlBlock>

      <p>
        <strong>IMPORTANT</strong>: Execute each state-read skill call and capture the results. The state file should exist after the WriteState merge operation.
      </p>
    </Command>
  );
}
