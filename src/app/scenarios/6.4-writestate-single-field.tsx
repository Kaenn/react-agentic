/**
 * Scenario 6.4: WriteState Single Field
 *
 * Tests that `<WriteState field="..." value="...">` writes a single field to the state:
 * - WriteState with field updates only that field
 * - Other fields in state are preserved
 * - Variable references work as values
 * - Claude executes the write operation correctly
 */
import {
  Command,
  useVariable,
  useStateRef,
  Assign,
  ReadState,
  WriteState,
  Markdown,
} from '../../jsx.js';

// Define typed schema for the test state
interface TestState {
  fieldA: string;
  fieldB: string;
  fieldC: number;
}

export default function WriteStateSingleField() {
  // State reference for our test state
  const testState = useStateRef<TestState>('test-6-4-state');

  // Variables for capturing values
  const fieldAValue = useVariable('FIELD_A_VALUE');
  const fieldBValue = useVariable('FIELD_B_VALUE');
  const fullState = useVariable('FULL_STATE');

  // Variable for dynamic value test
  const dynamicValue = useVariable('DYNAMIC_VALUE');

  return (
    <Command
      name="6.4-writestate-single-field"
      description="Test WriteState component for single field updates"
    >
      <Markdown>
{`# WriteState Single Field Test

This command validates that \`<WriteState field="..." value="...">\` correctly writes a single field while preserving others.

## Test Criteria

1. **Single Field Update**: WriteState with field prop updates only that field
2. **Field Preservation**: Other fields in state are preserved after write
3. **Variable References**: Variable references work as values
4. **Execution**: Claude executes the write operation correctly

## Setup Phase

First, we need to establish initial state with multiple fields to verify preservation.

### Step 1: Initialize State

Use the state-write skill to create initial state with all three fields:
`}
      </Markdown>

      {/* Write initial state with all fields */}
      <WriteState
        state={testState}
        merge={{ fieldA: "initial-A", fieldB: "initial-B", fieldC: 42 }}
      />

      <Markdown>
{`
### Step 2: Read Initial State

Verify the initial state was written correctly:
`}
      </Markdown>

      <ReadState state={testState} into={fullState} />

      <Markdown>
{`
The \`$FULL_STATE\` variable should now contain all three fields: fieldA, fieldB, fieldC.

## Test 1: Single Field Update with Literal Value

Now update ONLY fieldA with a new value:
`}
      </Markdown>

      {/* Criterion 1: WriteState with field updates only that field */}
      <WriteState
        state={testState}
        field="fieldA"
        value="updated-A"
      />

      <Markdown>
{`
### Verify Test 1

Read the state again and verify:
- fieldA is now "updated-A"
- fieldB is still "initial-B" (preserved)
- fieldC is still 42 (preserved)
`}
      </Markdown>

      <ReadState state={testState} into={fullState} />

      <Markdown>
{`
## Test 2: Single Field Update with Variable Reference

First, capture a dynamic value:
`}
      </Markdown>

      {/* Criterion 3: Variable references work as values */}
      <Assign var={dynamicValue} bash={`date +%Y-%m-%d`} />

      <Markdown>
{`
Now write fieldB using the variable reference:
`}
      </Markdown>

      <WriteState
        state={testState}
        field="fieldB"
        value={dynamicValue}
      />

      <Markdown>
{`
### Verify Test 2

Read the state again and verify:
- fieldA is still "updated-A" (preserved from Test 1)
- fieldB is now the date value from \`$DYNAMIC_VALUE\`
- fieldC is still 42 (preserved)
`}
      </Markdown>

      <ReadState state={testState} into={fullState} />

      <Markdown>
{`
## Test 3: Read Individual Fields

Verify we can read individual fields after partial updates:
`}
      </Markdown>

      <ReadState state={testState} into={fieldAValue} field="fieldA" />
      <ReadState state={testState} into={fieldBValue} field="fieldB" />

      <Markdown>
{`
## Expected Output Format

After running all tests, report your findings in this YAML format:

\`\`\`yaml
status: SUCCESS
test_results:
  single_field_update: true    # fieldA was updated to "updated-A"
  field_preservation: true     # fieldB and fieldC unchanged after first update
  variable_reference: true     # fieldB updated with dynamic date value
  execution_correct: true      # All state-write skill calls succeeded
values_observed:
  initial_state:
    fieldA: "initial-A"
    fieldB: "initial-B"
    fieldC: 42
  after_test_1:
    fieldA: "updated-A"
    fieldB: "initial-B"       # preserved
    fieldC: 42                 # preserved
  after_test_2:
    fieldA: "updated-A"       # preserved
    fieldB: "<date value>"    # from variable
    fieldC: 42                # preserved
  individual_reads:
    fieldA_value: "updated-A"
    fieldB_value: "<date value>"
message: "All WriteState single field criteria validated successfully"
\`\`\`

## Cleanup

After validation, you may delete the test state file:
\`\`\`bash
rm -f .state/test-6-4-state.json
\`\`\`
`}
      </Markdown>
    </Command>
  );
}
