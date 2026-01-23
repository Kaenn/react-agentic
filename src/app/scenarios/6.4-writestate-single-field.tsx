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
  XmlBlock,
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
      <h1>WriteState Single Field Test</h1>

      <p>
        This command validates that <code>&lt;WriteState field="..." value="..."&gt;</code> correctly writes a single field while preserving others.
      </p>

      <h2>Test Criteria</h2>

      <ol>
        <li><strong>Single Field Update</strong>: WriteState with field prop updates only that field</li>
        <li><strong>Field Preservation</strong>: Other fields in state are preserved after write</li>
        <li><strong>Variable References</strong>: Variable references work as values</li>
        <li><strong>Execution</strong>: Claude executes the write operation correctly</li>
      </ol>

      <h2>Setup Phase</h2>

      <p>First, we need to establish initial state with multiple fields to verify preservation.</p>

      <h3>Step 1: Initialize State</h3>

      <p>Use the state-write skill to create initial state with all three fields:</p>

      {/* Write initial state with all fields */}
      <WriteState
        state={testState}
        merge={{ fieldA: "initial-A", fieldB: "initial-B", fieldC: 42 }}
      />

      <h3>Step 2: Read Initial State</h3>

      <p>Verify the initial state was written correctly:</p>

      <ReadState state={testState} into={fullState} />

      <p>The <code>$FULL_STATE</code> variable should now contain all three fields: fieldA, fieldB, fieldC.</p>

      <h2>Test 1: Single Field Update with Literal Value</h2>

      <p>Now update ONLY fieldA with a new value:</p>

      {/* Criterion 1: WriteState with field updates only that field */}
      <WriteState
        state={testState}
        field="fieldA"
        value="updated-A"
      />

      <h3>Verify Test 1</h3>

      <p>Read the state again and verify:</p>
      <ul>
        <li>fieldA is now "updated-A"</li>
        <li>fieldB is still "initial-B" (preserved)</li>
        <li>fieldC is still 42 (preserved)</li>
      </ul>

      <ReadState state={testState} into={fullState} />

      <h2>Test 2: Single Field Update with Variable Reference</h2>

      <p>First, capture a dynamic value:</p>

      {/* Criterion 3: Variable references work as values */}
      <Assign var={dynamicValue} bash={`date +%Y-%m-%d`} />

      <p>Now write fieldB using the variable reference:</p>

      <WriteState
        state={testState}
        field="fieldB"
        value={dynamicValue}
      />

      <h3>Verify Test 2</h3>

      <p>Read the state again and verify:</p>
      <ul>
        <li>fieldA is still "updated-A" (preserved from Test 1)</li>
        <li>fieldB is now the date value from <code>$DYNAMIC_VALUE</code></li>
        <li>fieldC is still 42 (preserved)</li>
      </ul>

      <ReadState state={testState} into={fullState} />

      <h2>Test 3: Read Individual Fields</h2>

      <p>Verify we can read individual fields after partial updates:</p>

      <ReadState state={testState} into={fieldAValue} field="fieldA" />
      <ReadState state={testState} into={fieldBValue} field="fieldB" />

      <h2>Expected Output Format</h2>

      <p>After running all tests, report your findings in this YAML format:</p>

      <XmlBlock name="expected-output">
{`status: SUCCESS
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
message: "All WriteState single field criteria validated successfully"`}
      </XmlBlock>

      <h2>Cleanup</h2>

      <p>After validation, you may delete the test state file:</p>

      <pre><code className="language-bash">rm -f .state/test-6-4-state.json</code></pre>
    </Command>
  );
}
