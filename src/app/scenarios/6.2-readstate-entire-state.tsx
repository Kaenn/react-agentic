/**
 * Scenario 6.2: ReadState Entire State
 *
 * Tests that `<ReadState>` without a field reads the entire state object:
 * - ReadState without field reads entire state
 * - Claude executes the read operation correctly
 * - The result is a valid JSON object
 * - The variable contains all state fields
 */
import {
  Command,
  useVariable,
  useStateRef,
  ReadState,
  WriteState,
  Markdown,
  If,
  notEmpty,
} from '../../jsx.js';

// Define a multi-field state schema for testing
interface TestState {
  projectName: string;
  version: string;
  buildCount: number;
  lastBuildDate: string;
  config: {
    debug: boolean;
    environment: string;
  };
}

export default function ReadStateEntireState() {
  // Create state reference
  const testState = useStateRef<TestState>('test-entire-state');

  // Variables for state operations
  const entireState = useVariable('ENTIRE_STATE');
  const verifyProjectName = useVariable('VERIFY_PROJECT_NAME');
  const verifyVersion = useVariable('VERIFY_VERSION');

  return (
    <Command
      name="6.2-readstate-entire-state"
      description="Test ReadState without field to read entire state object"
    >
      <Markdown>
{`# ReadState Entire State Test

This command validates that \`<ReadState>\` without a \`field\` prop reads the entire state object.

## Test Criteria

1. **ReadState without field reads entire state**: The into variable receives all fields
2. **Claude executes read operation correctly**: state-read skill is invoked properly
3. **Result is valid JSON object**: The state is parseable JSON
4. **Variable contains all state fields**: All schema properties are present

## Setup Phase

First, we'll write a known state so we have data to read.
`}
      </Markdown>

      {/* Write initial state data for testing */}
      <WriteState
        state={testState}
        merge={{
          projectName: 'test-project',
          version: '1.0.0',
          buildCount: 42,
          lastBuildDate: '2026-01-22',
          config: {
            debug: true,
            environment: 'testing'
          }
        }}
      />

      <Markdown>
{`
## Test 1: Read Entire State (No Field Parameter)

Now read the entire state into a variable WITHOUT specifying a field:
`}
      </Markdown>

      {/* Core test: ReadState without field */}
      <ReadState state={testState} into={entireState} />

      <Markdown>
{`
## Verification Phase

The ENTIRE_STATE variable should now contain the full JSON object.

### Expected State Structure

The state should contain:
- \`projectName\`: "test-project"
- \`version\`: "1.0.0"
- \`buildCount\`: 42
- \`lastBuildDate\`: "2026-01-22"
- \`config.debug\`: true
- \`config.environment\`: "testing"

### Test 2: Verify Individual Fields Exist

Read specific fields to compare against entire state:
`}
      </Markdown>

      {/* Read specific fields for comparison */}
      <ReadState state={testState} into={verifyProjectName} field="projectName" />
      <ReadState state={testState} into={verifyVersion} field="version" />

      <Markdown>
{`
## Validation Instructions

After executing this command, Claude should:

1. **Check ENTIRE_STATE is JSON**: Parse the value and verify it's a valid JSON object
2. **Verify all fields present**: The JSON should have projectName, version, buildCount, lastBuildDate, config
3. **Check nested object**: config should have debug and environment sub-fields
4. **Compare with field reads**: VERIFY_PROJECT_NAME should match entireState.projectName

## Expected Output Format

Report findings in this YAML format:

\`\`\`yaml
status: SUCCESS
test_results:
  readstate_no_field_works: true   # ReadState without field executed
  result_is_valid_json: true       # ENTIRE_STATE parsed as JSON successfully
  all_fields_present: true         # projectName, version, buildCount, lastBuildDate, config all exist
  nested_object_intact: true       # config.debug and config.environment present
state_read:
  entire_state: |
    { full JSON content here }
  field_reads:
    projectName: "test-project"
    version: "1.0.0"
validation:
  entire_matches_field_reads: true  # entireState.projectName == VERIFY_PROJECT_NAME
message: "ReadState entire state test passed - all fields accessible"
\`\`\`

## Runtime Evaluation Required

Claude must execute the state-read and state-write skill calls to complete this test.
The state is stored in \`.state/test-entire-state.json\`.
`}
      </Markdown>
    </Command>
  );
}
