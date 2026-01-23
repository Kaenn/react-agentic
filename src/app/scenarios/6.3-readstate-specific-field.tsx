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
  Markdown,
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
      <Markdown>
{`# ReadState Specific Field Test

This command validates that \`<ReadState field="...">\` correctly reads specific fields from state.

## Test Setup

First, we'll initialize the state with known values, then read specific fields.

### Step 1: Initialize Test State

Create the state file with test data by running:
`}
      </Markdown>

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

      <Markdown>
{`
### Step 2: Read Top-Level Fields

**Test 1: Read 'name' field (string)**
`}
      </Markdown>

      <ReadState state={testState} into={nameResult} field="name" />

      <Markdown>
{`
**Test 2: Read 'count' field (number)**
`}
      </Markdown>

      <ReadState state={testState} into={countResult} field="count" />

      <Markdown>
{`
### Step 3: Read Nested Fields

**Test 3: Read 'config.timeout' (nested number)**
`}
      </Markdown>

      <ReadState state={testState} into={timeoutResult} field="config.timeout" />

      <Markdown>
{`
**Test 4: Read 'config.mode' (nested string)**
`}
      </Markdown>

      <ReadState state={testState} into={modeResult} field="config.mode" />

      <Markdown>
{`
**Test 5: Read 'metadata.author' (nested string)**
`}
      </Markdown>

      <ReadState state={testState} into={authorResult} field="metadata.author" />

      <Markdown>
{`
### Step 4: Compare with Full State Read

**Test 6: Read entire state (no field parameter)**
`}
      </Markdown>

      <ReadState state={testState} into={fullStateResult} />

      <Markdown>
{`
## Expected Results

| Test | Field Path | Expected Value | Variable |
|------|------------|----------------|----------|
| 1 | name | "test-project" | NAME_RESULT |
| 2 | count | 42 | COUNT_RESULT |
| 3 | config.timeout | 5000 | TIMEOUT_RESULT |
| 4 | config.mode | "production" | MODE_RESULT |
| 5 | metadata.author | "test-user" | AUTHOR_RESULT |
| 6 | (full state) | {entire object} | FULL_STATE_RESULT |

## Validation Instructions

After running this command, verify:

1. **Field reads return only that field's value**, not the entire state object
2. **Nested field paths** (like config.timeout) correctly navigate the object structure
3. **Full state read** (Test 6) returns the complete object for comparison
4. **Different types** work: strings (name, mode), numbers (count, timeout)

Report findings in this YAML format:

\`\`\`yaml
status: SUCCESS
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
message: "All ReadState field access tests passed"
\`\`\`

**IMPORTANT**: Execute each state-read skill call and capture the results. The state file should exist after the WriteState merge operation.
`}
      </Markdown>
    </Command>
  );
}
