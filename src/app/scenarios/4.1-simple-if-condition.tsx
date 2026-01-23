/**
 * Scenario 4.1: Simple If Condition
 *
 * Goal: Confirm that `<If test="...">` creates conditional instructions
 * that Claude evaluates and branches on.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.1-simple-if-condition.tsx
 * Output: .claude/commands/4.1-simple-if-condition.md
 */

import { Command, Assign, useVariable, If, notEmpty, isEmpty } from '../../jsx.js';

// Declare variables at module level
const existingFile = useVariable<string>("EXISTING_FILE");
const nonExistingFile = useVariable<string>("NON_EXISTING_FILE");
const testValue = useVariable<string>("TEST_VALUE");
const emptyValue = useVariable<string>("EMPTY_VALUE");

export default function SimpleIfConditionTest() {
  return (
    <Command
      name="simple-if-test"
      description="Test If component for conditional instructions. Use when testing conditional logic."
    >
      <h1>Simple If Condition Test</h1>

      <p>
        This test validates that the If component renders as conditional instructions
        that Claude can evaluate and branch on based on shell test expressions.
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test variables:</p>
      <Assign var={existingFile} value="package.json" />
      <Assign var={nonExistingFile} value="this-file-does-not-exist-12345.txt" />
      <Assign var={testValue} value="hello-world" />
      <Assign var={emptyValue} value="" />

      <h2>Test 1: File Existence Check (True Case)</h2>

      <p>Check if $EXISTING_FILE exists (should be TRUE since package.json exists):</p>

      <If test="[ -f $EXISTING_FILE ]">
        <p>TEST 1 PASSED: File $EXISTING_FILE exists! Claude correctly followed the If content when condition is true.</p>
      </If>

      <h2>Test 2: File Existence Check (False Case)</h2>

      <p>Check if $NON_EXISTING_FILE exists (should be FALSE):</p>

      <If test="[ -f $NON_EXISTING_FILE ]">
        <p>TEST 2 FAILED: This content should NOT appear because the file does not exist.</p>
      </If>

      <p>If you do NOT see "TEST 2 FAILED" message above, Test 2 passed (Claude skipped the content).</p>

      <h2>Test 3: Non-Empty String Check (True Case)</h2>

      <p>Check if TEST_VALUE is not empty (should be TRUE):</p>

      <If test={notEmpty(testValue)}>
        <p>TEST 3 PASSED: TEST_VALUE has a value. Claude correctly evaluated [ -n $TEST_VALUE ].</p>
      </If>

      <h2>Test 4: Empty String Check (True Case)</h2>

      <p>Check if EMPTY_VALUE is empty (should be TRUE):</p>

      <If test={isEmpty(emptyValue)}>
        <p>TEST 4 PASSED: EMPTY_VALUE is empty. Claude correctly evaluated [ -z $EMPTY_VALUE ].</p>
      </If>

      <h2>Test 5: Directory Existence Check</h2>

      <p>Check if .git directory exists (likely TRUE in this repo):</p>

      <If test="[ -d .git ]">
        <p>TEST 5 PASSED: .git directory exists. Claude evaluated the directory check correctly.</p>
      </If>

      <h2>Your Task</h2>

      <p>Evaluate each If condition above and report:</p>

      <ol>
        <li>Did the If blocks render as "**If [test]:**" pattern in the markdown?</li>
        <li>For Test 1: Did you see "TEST 1 PASSED"? (Should YES)</li>
        <li>For Test 2: Did you see "TEST 2 FAILED"? (Should NO - content should be skipped)</li>
        <li>For Test 3: Did you see "TEST 3 PASSED"? (Should YES)</li>
        <li>For Test 4: Did you see "TEST 4 PASSED"? (Should YES)</li>
        <li>For Test 5: Did you see "TEST 5 PASSED"? (Should YES if in git repo)</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  if_renders_correctly: PASSED | FAILED
  true_condition_followed: PASSED | FAILED
  false_condition_skipped: PASSED | FAILED
  shell_test_evaluation: PASSED | FAILED
observations:
  test_1_message_visible: true | false
  test_2_message_visible: true | false
  test_3_message_visible: true | false
  test_4_message_visible: true | false
  test_5_message_visible: true | false
notes: <any observations about If conditional behavior>`}</code></pre>
    </Command>
  );
}
