/**
 * Scenario 4.6: equals Test Builder
 *
 * Goal: Confirm that the `equals()` test builder produces correct shell syntax
 * for string equality checks.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.6-equals-test.tsx
 * Output: .claude/commands/4.6-equals-test.md
 */

import { Command, Assign, useVariable, If, Else, equals } from '../../jsx.js';

// Declare variables at module level
const statusVar = useVariable<string>("STATUS");
const modeVar = useVariable<string>("MODE");
const valueWithSpaces = useVariable<string>("VALUE_WITH_SPACES");
const caseTestVar = useVariable<string>("CASE_TEST");

export default function EqualsTestBuilder() {
  return (
    <Command
      name="equals-test"
      description="Test equals() test builder for string equality checks. Use when testing string comparison."
    >
      <h1>equals Test Builder</h1>

      <p>
        This test validates that the equals() test builder produces correct
        shell syntax for string equality checks: [ $VAR = "value" ]
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test variables:</p>
      <Assign var={statusVar} value="success" />
      <Assign var={modeVar} value="production" />
      <Assign var={valueWithSpaces} value="hello world" />
      <Assign var={caseTestVar} value="Hello" />

      <h2>Test 1: Simple String Equality (Match)</h2>

      <p>Check if STATUS equals "success" (should be TRUE):</p>

      <If test={equals(statusVar, '"success"')}>
        <p>TEST 1 IF BRANCH: STATUS equals "success". This is correct.</p>
      </If>
      <Else>
        <p>TEST 1 ELSE BRANCH: STATUS does not equal "success". This should NOT appear.</p>
      </Else>

      <h2>Test 2: Simple String Equality (No Match)</h2>

      <p>Check if STATUS equals "failure" (should be FALSE):</p>

      <If test={equals(statusVar, '"failure"')}>
        <p>TEST 2 IF BRANCH: STATUS equals "failure". This should NOT appear.</p>
      </If>
      <Else>
        <p>TEST 2 ELSE BRANCH: STATUS does not equal "failure". This is correct.</p>
      </Else>

      <h2>Test 3: Values with Spaces</h2>

      <p>Check if VALUE_WITH_SPACES equals "hello world" (should be TRUE):</p>

      <If test={equals(valueWithSpaces, '"hello world"')}>
        <p>TEST 3 IF BRANCH: VALUE_WITH_SPACES equals "hello world". This is correct.</p>
      </If>
      <Else>
        <p>TEST 3 ELSE BRANCH: VALUE_WITH_SPACES does not match. This should NOT appear.</p>
      </Else>

      <h2>Test 4: Case Sensitivity Check (Exact Match)</h2>

      <p>Check if CASE_TEST equals "Hello" (exact case, should be TRUE):</p>

      <If test={equals(caseTestVar, '"Hello"')}>
        <p>TEST 4 IF BRANCH: CASE_TEST equals "Hello" (exact case). This is correct.</p>
      </If>
      <Else>
        <p>TEST 4 ELSE BRANCH: CASE_TEST does not match. This should NOT appear.</p>
      </Else>

      <h2>Test 5: Case Sensitivity Check (Different Case)</h2>

      <p>Check if CASE_TEST equals "hello" (lowercase, should be FALSE because comparison is case-sensitive):</p>

      <If test={equals(caseTestVar, '"hello"')}>
        <p>TEST 5 IF BRANCH: CASE_TEST equals "hello". This should NOT appear (case mismatch).</p>
      </If>
      <Else>
        <p>TEST 5 ELSE BRANCH: CASE_TEST does not equal "hello" (case-sensitive). This is correct.</p>
      </Else>

      <h2>Test 6: MODE Comparison</h2>

      <p>Check if MODE equals "production" (should be TRUE):</p>

      <If test={equals(modeVar, '"production"')}>
        <p>TEST 6 IF BRANCH: MODE equals "production". This is correct.</p>
      </If>
      <Else>
        <p>TEST 6 ELSE BRANCH: MODE does not equal "production". This should NOT appear.</p>
      </Else>

      <h2>Your Task</h2>

      <p>Evaluate each equals() condition above and verify:</p>

      <ol>
        <li>The equals() builder produces [ $VAR = "value" ] syntax in the output</li>
        <li>Claude evaluates string equality correctly</li>
        <li>Values with spaces are properly quoted and compared</li>
        <li>String comparison is case-sensitive</li>
      </ol>

      <p>Expected results:</p>
      <ul>
        <li>Test 1: IF branch (STATUS = "success")</li>
        <li>Test 2: ELSE branch (STATUS != "failure")</li>
        <li>Test 3: IF branch (spaces work correctly)</li>
        <li>Test 4: IF branch (exact case match)</li>
        <li>Test 5: ELSE branch (case mismatch)</li>
        <li>Test 6: IF branch (MODE = "production")</li>
      </ul>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  equals_produces_correct_syntax: PASSED | FAILED
  string_equality_evaluated: PASSED | FAILED
  spaces_properly_quoted: PASSED | FAILED
  case_sensitive_comparison: PASSED | FAILED
results:
  test_1_branch: IF | ELSE
  test_2_branch: IF | ELSE
  test_3_branch: IF | ELSE
  test_4_branch: IF | ELSE
  test_5_branch: IF | ELSE
  test_6_branch: IF | ELSE
expected:
  test_1: IF
  test_2: ELSE
  test_3: IF
  test_4: IF
  test_5: ELSE
  test_6: IF
observed_syntax: <copy the actual [ $VAR = "value" ] syntax you see>
notes: <any observations about equals() behavior>`}</code></pre>
    </Command>
  );
}
