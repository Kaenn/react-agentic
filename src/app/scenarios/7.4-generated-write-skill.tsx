/**
 * Scenario 7.4: Generated Write Skill
 *
 * Tests that the generated write skill from <State> component:
 * - Write skill is invocable as `/test-state.write`
 * - Field and value are correctly applied
 * - Existing data is preserved for unwritten fields
 * - Updates are persisted to the database
 *
 * Prerequisites: Run /test-state.init first to create the table
 */
import { Command, XmlBlock } from '../../jsx.js';

export default function GeneratedWriteSkillTest() {
  return (
    <Command name="7.4-generated-write-skill" description="Test the generated write skill from State component">
      <XmlBlock name="objective">
        <p>
          Test that the generated `/test-state.write` skill correctly updates state fields
          while preserving existing data.
        </p>
      </XmlBlock>

      <XmlBlock name="prerequisites">
        <p>Before running this test, ensure the state is initialized:</p>
        <ol>
          <li>Run `/test-state.init` to create the SQLite table</li>
          <li>Verify the table exists in `.state/test.db`</li>
        </ol>
      </XmlBlock>

      <XmlBlock name="test-sequence">
        <h2>Test 1: Read Initial State</h2>
        <p>First, read the current state to establish baseline values:</p>
        <p>Run: <code>/test-state.read</code></p>
        <p>Record the initial values:</p>
        <ul>
          <li>counter: (should be a number)</li>
          <li>lastUpdated: (should be a timestamp)</li>
          <li>status: (should be 'active', 'inactive', or 'pending')</li>
          <li>description: (should be a string)</li>
        </ul>

        <h2>Test 2: Write Single Field</h2>
        <p>Update the description field using the write skill:</p>
        <p>Run: <code>/test-state.write --field description --value "Updated via 7.4 test"</code></p>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>Command executes successfully</li>
          <li>Returns JSON with updated state</li>
          <li>description field shows "Updated via 7.4 test"</li>
        </ul>

        <h2>Test 3: Verify Field Was Applied</h2>
        <p>Read the state again to confirm the update:</p>
        <p>Run: <code>/test-state.read --field description</code></p>
        <p><strong>Expected result:</strong></p>
        <ul>
          <li>Returns "Updated via 7.4 test"</li>
        </ul>

        <h2>Test 4: Verify Other Fields Preserved</h2>
        <p>Confirm that unwritten fields still have their original values:</p>
        <p>Run: <code>/test-state.read</code></p>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>counter: unchanged from Test 1</li>
          <li>status: unchanged from Test 1</li>
          <li>lastUpdated: unchanged from Test 1</li>
          <li>description: "Updated via 7.4 test" (the only changed field)</li>
        </ul>

        <h2>Test 5: Write Different Field</h2>
        <p>Update the status field to verify write works for enum fields:</p>
        <p>Run: <code>/test-state.write --field status --value "active"</code></p>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>Command executes successfully</li>
          <li>status field updated to "active"</li>
          <li>Other fields (counter, lastUpdated, description) preserved</li>
        </ul>

        <h2>Test 6: Persistence Check</h2>
        <p>Verify updates persist by reading directly from SQLite:</p>
        <p>Run this bash command:</p>
        <pre><code className="language-bash">sqlite3 .state/test.db "SELECT * FROM \"test-state\" WHERE rowid = 1"</code></pre>
        <p><strong>Expected behavior:</strong></p>
        <ul>
          <li>Shows the row with all current values</li>
          <li>description = "Updated via 7.4 test"</li>
          <li>status = "active"</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="validation-output">
        <p>After completing all tests, provide a summary in this format:</p>
        <pre><code className="language-yaml">{`scenario: 7.4-generated-write-skill
status: PASSED | FAILED

test_results:
  test_1_initial_read: PASSED | FAILED
  test_2_write_single_field: PASSED | FAILED
  test_3_verify_field_applied: PASSED | FAILED
  test_4_other_fields_preserved: PASSED | FAILED
  test_5_write_different_field: PASSED | FAILED
  test_6_persistence_check: PASSED | FAILED

validation:
  write_skill_invocable: true | false
  field_value_applied: true | false
  existing_data_preserved: true | false
  updates_persisted: true | false

notes: |
  Any observations or issues encountered`}</code></pre>
      </XmlBlock>
    </Command>
  );
}
