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
  XmlBlock,
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
      <h1>ReadState Entire State Test</h1>

      <p>
        This command validates that <code>&lt;ReadState&gt;</code> without a <code>field</code> prop reads the entire state object.
      </p>

      <h2>Test Criteria</h2>

      <ol>
        <li><strong>ReadState without field reads entire state</strong>: The into variable receives all fields</li>
        <li><strong>Claude executes read operation correctly</strong>: state-read skill is invoked properly</li>
        <li><strong>Result is valid JSON object</strong>: The state is parseable JSON</li>
        <li><strong>Variable contains all state fields</strong>: All schema properties are present</li>
      </ol>

      <h2>Setup Phase</h2>

      <p>First, we'll write a known state so we have data to read.</p>

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

      <h2>Test 1: Read Entire State (No Field Parameter)</h2>

      <p>Now read the entire state into a variable WITHOUT specifying a field:</p>

      {/* Core test: ReadState without field */}
      <ReadState state={testState} into={entireState} />

      <h2>Verification Phase</h2>

      <p>The ENTIRE_STATE variable should now contain the full JSON object.</p>

      <h3>Expected State Structure</h3>

      <p>The state should contain:</p>
      <ul>
        <li><code>projectName</code>: "test-project"</li>
        <li><code>version</code>: "1.0.0"</li>
        <li><code>buildCount</code>: 42</li>
        <li><code>lastBuildDate</code>: "2026-01-22"</li>
        <li><code>config.debug</code>: true</li>
        <li><code>config.environment</code>: "testing"</li>
      </ul>

      <h3>Test 2: Verify Individual Fields Exist</h3>

      <p>Read specific fields to compare against entire state:</p>

      {/* Read specific fields for comparison */}
      <ReadState state={testState} into={verifyProjectName} field="projectName" />
      <ReadState state={testState} into={verifyVersion} field="version" />

      <h2>Validation Instructions</h2>

      <p>After executing this command, Claude should:</p>

      <ol>
        <li><strong>Check ENTIRE_STATE is JSON</strong>: Parse the value and verify it's a valid JSON object</li>
        <li><strong>Verify all fields present</strong>: The JSON should have projectName, version, buildCount, lastBuildDate, config</li>
        <li><strong>Check nested object</strong>: config should have debug and environment sub-fields</li>
        <li><strong>Compare with field reads</strong>: VERIFY_PROJECT_NAME should match entireState.projectName</li>
      </ol>

      <h2>Expected Output Format</h2>

      <p>Report findings in this YAML format:</p>

      <XmlBlock name="expected-output">
{`status: SUCCESS
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
message: "ReadState entire state test passed - all fields accessible"`}
      </XmlBlock>

      <h2>Runtime Evaluation Required</h2>

      <p>
        Claude must execute the state-read and state-write skill calls to complete this test.
        The state is stored in <code>.state/test-entire-state.json</code>.
      </p>
    </Command>
  );
}
