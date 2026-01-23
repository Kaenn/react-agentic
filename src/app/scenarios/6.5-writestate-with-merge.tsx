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
  Markdown,
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
      <Markdown>
{`# WriteState with Merge Test

This command validates that \`<WriteState merge={{...}}>\` correctly performs partial updates.

## Test Criteria

1. **Merge updates multiple fields**: A single WriteState with merge updates several fields at once
2. **Unspecified fields are preserved**: Fields not in the merge object remain unchanged
3. **Variable references work in merge object**: Dynamic values from variables can be merged
4. **Claude executes merge correctly**: The state-write skill performs the merge operation

## Setup Phase

First, establish initial state with individual field writes.
`}
      </Markdown>

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

      <Markdown>
{`
### Read Initial State

Reading the state after initial setup:
`}
      </Markdown>

      <ReadState state={testState} into={stateAfterInit} />

      <Markdown>
{`
## Test 1: Merge Multiple Static Fields

Now perform a merge that updates ONLY some fields (version, buildCount, status).
The fields \`name\`, \`author\`, and \`lastUpdated\` should be PRESERVED.
`}
      </Markdown>

      {/* Test 1: Merge with static values - only update some fields */}
      <WriteState
        state={testState}
        merge={{
          version: '2.0.0',
          buildCount: 42,
          status: 'updated'
        }}
      />

      <Markdown>
{`
### Verify After Static Merge

Reading state to verify only specified fields changed:
`}
      </Markdown>

      <ReadState state={testState} into={stateAfterMerge} />

      <Markdown>
{`
**Expected State After Test 1:**
- \`name\`: "merge-test-project" (PRESERVED - not in merge)
- \`version\`: "2.0.0" (UPDATED)
- \`buildCount\`: 42 (UPDATED)
- \`author\`: "test-user" (PRESERVED - not in merge)
- \`status\`: "updated" (UPDATED)
- \`lastUpdated\`: "2026-01-01" (PRESERVED - not in merge)

## Test 2: Merge with Variable References

Assign dynamic values to variables, then merge them into state.
`}
      </Markdown>

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

      <Markdown>
{`
### Verify After Variable Merge

Reading state to verify variable values were merged:
`}
      </Markdown>

      <ReadState state={testState} into={stateAfterVarMerge} />

      <Markdown>
{`
**Expected State After Test 2:**
- \`name\`: "merge-test-project" (STILL PRESERVED)
- \`version\`: "2.0.0" (STILL from Test 1)
- \`buildCount\`: 42 (STILL from Test 1)
- \`author\`: "test-user" (STILL PRESERVED)
- \`status\`: "completed-dynamically" (UPDATED from variable)
- \`lastUpdated\`: (current timestamp) (UPDATED from variable)

## Validation Instructions

After executing this command, Claude should:

1. **Verify Test 1 - Static Merge**:
   - Confirm \`version\`, \`buildCount\`, \`status\` were updated
   - Confirm \`name\`, \`author\`, \`lastUpdated\` were PRESERVED (same as initial)

2. **Verify Test 2 - Variable Merge**:
   - Confirm \`status\` now equals "completed-dynamically" (from DYNAMIC_STATUS)
   - Confirm \`lastUpdated\` contains a timestamp (from CURRENT_TIMESTAMP)
   - Confirm \`name\`, \`version\`, \`buildCount\`, \`author\` are UNCHANGED

## Expected Output Format

Report findings in this YAML format:

\`\`\`yaml
status: SUCCESS
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
message: "WriteState merge test passed - partial updates work correctly"
\`\`\`

## Runtime Evaluation Required

Claude must execute the state-read and state-write skill calls to complete this test.
The state is stored in \`.state/merge-test-state.json\`.
`}
      </Markdown>
    </Command>
  );
}
