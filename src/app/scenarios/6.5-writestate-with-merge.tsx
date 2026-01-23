/**
 * Scenario 6.5: WriteState with Merge
 *
 * Tests that `<WriteState merge={{...}}>` performs partial updates:
 * - WriteState with merge updates multiple fields
 * - Unspecified fields are preserved
 * - Variable references work in merge object
 * - Claude executes the merge operation correctly
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

// Define a comprehensive state schema for testing merge behavior
interface MergeTestState {
  name: string;
  version: string;
  buildCount: number;
  author: string;
  status: string;
  lastUpdated: string;
}

export default function WriteStateWithMerge() {
  // Create state reference
  const testState = useStateRef<MergeTestState>('merge-test-state');

  // Variables for dynamic merge values
  const dynamicStatus = useVariable('DYNAMIC_STATUS');
  const currentTimestamp = useVariable('CURRENT_TIMESTAMP');

  // Variables for reading state after operations
  const stateAfterInit = useVariable('STATE_AFTER_INIT');
  const stateAfterMerge = useVariable('STATE_AFTER_MERGE');
  const stateAfterVarMerge = useVariable('STATE_AFTER_VAR_MERGE');

  return (
    <Command
      name="6.5-writestate-with-merge"
      description="Test WriteState with merge for partial state updates"
    >
      <h1>WriteState with Merge Test</h1>

      <p>
        This command validates that <code>&lt;WriteState merge=&#123;&#123;...&#125;&#125;&gt;</code> correctly performs partial updates.
      </p>

      <h2>Test Criteria</h2>

      <ol>
        <li><strong>Merge updates multiple fields</strong>: A single WriteState with merge updates several fields at once</li>
        <li><strong>Unspecified fields are preserved</strong>: Fields not in the merge object remain unchanged</li>
        <li><strong>Variable references work in merge object</strong>: Dynamic values from variables can be merged</li>
        <li><strong>Claude executes merge correctly</strong>: The state-write skill performs the merge operation</li>
      </ol>

      <h2>Setup Phase</h2>

      <p>First, establish initial state with individual field writes.</p>

      {/* Step 1: Write initial state with merge to establish baseline */}
      <WriteState
        state={testState}
        merge={{
          name: 'merge-test-project',
          version: '1.0.0',
          buildCount: 0,
          author: 'test-user',
          status: 'initial',
          lastUpdated: '2026-01-01'
        }}
      />

      <h3>Read Initial State</h3>

      <p>Reading the state after initial setup:</p>

      <ReadState state={testState} into={stateAfterInit} />

      <h2>Test 1: Merge Multiple Static Fields</h2>

      <p>
        Now perform a merge that updates ONLY some fields (version, buildCount, status).
        The fields <code>name</code>, <code>author</code>, and <code>lastUpdated</code> should be PRESERVED.
      </p>

      {/* Test 1: Merge with static values - only update some fields */}
      <WriteState
        state={testState}
        merge={{
          version: '2.0.0',
          buildCount: 42,
          status: 'updated'
        }}
      />

      <h3>Verify After Static Merge</h3>

      <p>Reading state to verify only specified fields changed:</p>

      <ReadState state={testState} into={stateAfterMerge} />

      <p><strong>Expected State After Test 1:</strong></p>
      <ul>
        <li><code>name</code>: "merge-test-project" (PRESERVED - not in merge)</li>
        <li><code>version</code>: "2.0.0" (UPDATED)</li>
        <li><code>buildCount</code>: 42 (UPDATED)</li>
        <li><code>author</code>: "test-user" (PRESERVED - not in merge)</li>
        <li><code>status</code>: "updated" (UPDATED)</li>
        <li><code>lastUpdated</code>: "2026-01-01" (PRESERVED - not in merge)</li>
      </ul>

      <h2>Test 2: Merge with Variable References</h2>

      <p>Assign dynamic values to variables, then merge them into state.</p>

      {/* Assign dynamic values to variables */}
      <Assign var={dynamicStatus} value="completed-dynamically" />
      <Assign var={currentTimestamp} bash="date -u +%Y-%m-%dT%H:%M:%SZ" />

      {/* Test 2: Merge with variable references */}
      <WriteState
        state={testState}
        merge={{
          status: dynamicStatus,
          lastUpdated: currentTimestamp
        }}
      />

      <h3>Verify After Variable Merge</h3>

      <p>Reading state to verify variable values were merged:</p>

      <ReadState state={testState} into={stateAfterVarMerge} />

      <p><strong>Expected State After Test 2:</strong></p>
      <ul>
        <li><code>name</code>: "merge-test-project" (STILL PRESERVED)</li>
        <li><code>version</code>: "2.0.0" (STILL from Test 1)</li>
        <li><code>buildCount</code>: 42 (STILL from Test 1)</li>
        <li><code>author</code>: "test-user" (STILL PRESERVED)</li>
        <li><code>status</code>: "completed-dynamically" (UPDATED from variable)</li>
        <li><code>lastUpdated</code>: (current timestamp) (UPDATED from variable)</li>
      </ul>

      <h2>Validation Instructions</h2>

      <p>After executing this command, Claude should:</p>

      <ol>
        <li>
          <strong>Verify Test 1 - Static Merge</strong>:
          <ul>
            <li>Confirm <code>version</code>, <code>buildCount</code>, <code>status</code> were updated</li>
            <li>Confirm <code>name</code>, <code>author</code>, <code>lastUpdated</code> were PRESERVED (same as initial)</li>
          </ul>
        </li>
        <li>
          <strong>Verify Test 2 - Variable Merge</strong>:
          <ul>
            <li>Confirm <code>status</code> now equals "completed-dynamically" (from DYNAMIC_STATUS)</li>
            <li>Confirm <code>lastUpdated</code> contains a timestamp (from CURRENT_TIMESTAMP)</li>
            <li>Confirm <code>name</code>, <code>version</code>, <code>buildCount</code>, <code>author</code> are UNCHANGED</li>
          </ul>
        </li>
      </ol>

      <h2>Expected Output Format</h2>

      <p>Report findings in this YAML format:</p>

      <XmlBlock name="expected-output">
{`status: SUCCESS
test_results:
  merge_updates_multiple_fields: true   # Test 1: 3 fields updated in one merge
  unspecified_fields_preserved: true    # name, author preserved through merges
  variable_references_work: true        # Test 2: DYNAMIC_STATUS and CURRENT_TIMESTAMP merged
  merge_executed_correctly: true        # state-write skill performed merge
state_snapshots:
  after_init: |
    { ... initial state ... }
  after_static_merge: |
    { ... state with version=2.0.0, buildCount=42, status=updated ... }
  after_variable_merge: |
    { ... state with status=completed-dynamically, lastUpdated=<timestamp> ... }
validation:
  preserved_fields_check:
    name_unchanged: true
    author_unchanged: true
  merged_fields_check:
    version_updated_to_2_0_0: true
    status_has_dynamic_value: true
    lastUpdated_has_timestamp: true
message: "WriteState merge test passed - partial updates work correctly"`}
      </XmlBlock>

      <h2>Runtime Evaluation Required</h2>

      <p>
        Claude must execute the state-read and state-write skill calls to complete this test.
        The state is stored in <code>.state/merge-test-state.json</code>.
      </p>
    </Command>
  );
}
