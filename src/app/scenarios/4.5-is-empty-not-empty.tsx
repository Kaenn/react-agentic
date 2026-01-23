/**
 * Scenario 4.5: isEmpty and notEmpty Test Builders
 *
 * Goal: Confirm that `isEmpty()` and `notEmpty()` test builders produce
 * correct shell syntax for string checks.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.5-is-empty-not-empty.tsx
 * Output: .claude/commands/4.5-is-empty-not-empty.md
 */

import { Command, Assign, useVariable, If, notEmpty, isEmpty } from '../../jsx.js';

// Declare variables for testing string emptiness
const emptyVar = useVariable<string>("EMPTY_VAR");
const nonEmptyVar = useVariable<string>("NON_EMPTY_VAR");
const whitespaceVar = useVariable<string>("WHITESPACE_VAR");
const spacesOnlyVar = useVariable<string>("SPACES_ONLY_VAR");

export default function IsEmptyNotEmptyTest() {
  return (
    <Command
      name="is-empty-not-empty-test"
      description="Test isEmpty and notEmpty test builders. Use when testing string emptiness checks."
    >
      <h1>isEmpty and notEmpty Test Builders</h1>

      <p>
        This test validates that isEmpty() produces `[ -z "$VAR" ]` and
        notEmpty() produces `[ -n "$VAR" ]` shell syntax for string checks.
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test different string states:</p>
      <Assign var={emptyVar} value="" />
      <Assign var={nonEmptyVar} value="hello-world" />
      <Assign var={whitespaceVar} value="hello world with spaces" />
      <Assign var={spacesOnlyVar} value="   " />

      <h2>Test 1: isEmpty on Empty String (True Case)</h2>

      <p>Check if EMPTY_VAR is empty using isEmpty() - should produce `[ -z "$EMPTY_VAR" ]`:</p>

      <If test={isEmpty(emptyVar)}>
        <p>TEST 1 PASSED: isEmpty correctly identified EMPTY_VAR as empty.</p>
      </If>

      <h2>Test 2: isEmpty on Non-Empty String (False Case)</h2>

      <p>Check if NON_EMPTY_VAR is empty using isEmpty() - should be FALSE:</p>

      <If test={isEmpty(nonEmptyVar)}>
        <p>TEST 2 FAILED: This should NOT appear because NON_EMPTY_VAR has a value.</p>
      </If>

      <p>If you do NOT see "TEST 2 FAILED" message above, Test 2 passed (condition was false).</p>

      <h2>Test 3: notEmpty on Non-Empty String (True Case)</h2>

      <p>Check if NON_EMPTY_VAR is not empty using notEmpty() - should produce `[ -n "$NON_EMPTY_VAR" ]`:</p>

      <If test={notEmpty(nonEmptyVar)}>
        <p>TEST 3 PASSED: notEmpty correctly identified NON_EMPTY_VAR has a value.</p>
      </If>

      <h2>Test 4: notEmpty on Empty String (False Case)</h2>

      <p>Check if EMPTY_VAR is not empty using notEmpty() - should be FALSE:</p>

      <If test={notEmpty(emptyVar)}>
        <p>TEST 4 FAILED: This should NOT appear because EMPTY_VAR is empty.</p>
      </If>

      <p>If you do NOT see "TEST 4 FAILED" message above, Test 4 passed (condition was false).</p>

      <h2>Test 5: notEmpty with Whitespace Content</h2>

      <p>Check if WHITESPACE_VAR (contains "hello world with spaces") is not empty:</p>

      <If test={notEmpty(whitespaceVar)}>
        <p>TEST 5 PASSED: notEmpty works correctly with strings containing spaces.</p>
      </If>

      <h2>Test 6: Spaces-Only String Check</h2>

      <p>Check if SPACES_ONLY_VAR (contains only "   ") is considered non-empty by shell:</p>

      <If test={notEmpty(spacesOnlyVar)}>
        <p>TEST 6 RESULT: Shell considers spaces-only string as non-empty (expected behavior).</p>
      </If>

      <h2>Your Task</h2>

      <p>Execute the shell tests and verify:</p>

      <ol>
        <li>Verify isEmpty() produces `[ -z "$VAR" ]` syntax in the markdown</li>
        <li>Verify notEmpty() produces `[ -n "$VAR" ]` syntax in the markdown</li>
        <li>Test 1: Did you see "TEST 1 PASSED"? (Should YES - empty string is empty)</li>
        <li>Test 2: Did you see "TEST 2 FAILED"? (Should NO - non-empty is not empty)</li>
        <li>Test 3: Did you see "TEST 3 PASSED"? (Should YES - non-empty has value)</li>
        <li>Test 4: Did you see "TEST 4 FAILED"? (Should NO - empty has no value)</li>
        <li>Test 5: Did you see "TEST 5 PASSED"? (Should YES - spaces in content work)</li>
        <li>Test 6: Did you see "TEST 6 RESULT"? (Should YES - spaces-only is non-empty to shell)</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
syntax_verification:
  isEmpty_produces_z_flag: PASSED | FAILED
  notEmpty_produces_n_flag: PASSED | FAILED
tests:
  test_1_isEmpty_empty_string: PASSED | FAILED
  test_2_isEmpty_non_empty_string: PASSED | FAILED
  test_3_notEmpty_non_empty_string: PASSED | FAILED
  test_4_notEmpty_empty_string: PASSED | FAILED
  test_5_whitespace_content: PASSED | FAILED
  test_6_spaces_only: PASSED | FAILED
observations:
  test_1_visible: true | false
  test_2_visible: true | false
  test_3_visible: true | false
  test_4_visible: true | false
  test_5_visible: true | false
  test_6_visible: true | false
notes: <any observations about isEmpty/notEmpty behavior>`}</code></pre>
    </Command>
  );
}
