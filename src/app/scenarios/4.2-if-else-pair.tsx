/**
 * Scenario 4.2: If/Else Pair
 *
 * Goal: Confirm that `<If>` followed by `<Else>` creates proper branching
 * where Claude takes one path or the other.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.2-if-else-pair.tsx
 * Output: .claude/commands/4.2-if-else-pair.md
 */

import { Command, Assign, useVariable, If, Else, notEmpty, isEmpty } from '../../jsx.js';

// Declare variables at module level
const existingFile = useVariable<string>("EXISTING_FILE");
const nonExistingFile = useVariable<string>("NON_EXISTING_FILE");
const testValue = useVariable<string>("TEST_VALUE");
const emptyValue = useVariable<string>("EMPTY_VALUE");

export default function IfElsePairTest() {
  return (
    <Command
      name="if-else-pair-test"
      description="Test If/Else component pair for branching logic. Use when testing conditional branching."
    >
      <h1>If/Else Pair Test</h1>

      <p>
        This test validates that If followed by Else creates proper branching
        where Claude takes exactly one path based on the condition evaluation.
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test variables:</p>
      <Assign var={existingFile} value="package.json" />
      <Assign var={nonExistingFile} value="this-file-does-not-exist-12345.txt" />
      <Assign var={testValue} value="hello-world" />
      <Assign var={emptyValue} value="" />

      <h2>Test 1: File Exists (True Branch)</h2>

      <p>Check if $EXISTING_FILE exists. Should take the If branch since package.json exists:</p>

      <If test="[ -f $EXISTING_FILE ]">
        <p>TEST 1 IF BRANCH: File $EXISTING_FILE exists! This is the correct branch.</p>
      </If>
      <Else>
        <p>TEST 1 ELSE BRANCH: File not found. This should NOT appear.</p>
      </Else>

      <h2>Test 2: File Does Not Exist (Else Branch)</h2>

      <p>Check if $NON_EXISTING_FILE exists. Should take the Else branch since file does not exist:</p>

      <If test="[ -f $NON_EXISTING_FILE ]">
        <p>TEST 2 IF BRANCH: File found. This should NOT appear.</p>
      </If>
      <Else>
        <p>TEST 2 ELSE BRANCH: File $NON_EXISTING_FILE not found. This is the correct branch.</p>
      </Else>

      <h2>Test 3: Non-Empty Variable (True Branch)</h2>

      <p>Check if TEST_VALUE is not empty using notEmpty() builder:</p>

      <If test={notEmpty(testValue)}>
        <p>TEST 3 IF BRANCH: TEST_VALUE has value. This is the correct branch.</p>
      </If>
      <Else>
        <p>TEST 3 ELSE BRANCH: TEST_VALUE is empty. This should NOT appear.</p>
      </Else>

      <h2>Test 4: Empty Variable (Else Branch)</h2>

      <p>Check if EMPTY_VALUE is not empty (it is empty, so should take Else):</p>

      <If test={notEmpty(emptyValue)}>
        <p>TEST 4 IF BRANCH: EMPTY_VALUE has value. This should NOT appear.</p>
      </If>
      <Else>
        <p>TEST 4 ELSE BRANCH: EMPTY_VALUE is empty. This is the correct branch.</p>
      </Else>

      <h2>Test 5: Directory Check (True Branch)</h2>

      <p>Check if .git directory exists (should be true in this repo):</p>

      <If test="[ -d .git ]">
        <p>TEST 5 IF BRANCH: .git directory exists. This is the correct branch.</p>
      </If>
      <Else>
        <p>TEST 5 ELSE BRANCH: .git directory missing. This should NOT appear in a git repo.</p>
      </Else>

      <h2>Your Task</h2>

      <p>Evaluate each If/Else pair above and verify:</p>

      <ol>
        <li>Each If block renders as "**If [test]:**" pattern in the markdown</li>
        <li>Each Else block renders as "**Otherwise:**" pattern in the markdown</li>
        <li>You evaluate each condition exactly once</li>
        <li>You follow exactly one branch per test (never both If and Else)</li>
      </ol>

      <p>Expected results:</p>
      <ul>
        <li>Test 1: IF branch (file exists)</li>
        <li>Test 2: ELSE branch (file does not exist)</li>
        <li>Test 3: IF branch (variable has value)</li>
        <li>Test 4: ELSE branch (variable is empty)</li>
        <li>Test 5: IF branch (directory exists in git repo)</li>
      </ul>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  if_renders_correctly: PASSED | FAILED
  else_renders_as_otherwise: PASSED | FAILED
  single_branch_taken: PASSED | FAILED
  condition_evaluated_once: PASSED | FAILED
results:
  test_1_branch: IF | ELSE
  test_2_branch: IF | ELSE
  test_3_branch: IF | ELSE
  test_4_branch: IF | ELSE
  test_5_branch: IF | ELSE
expected:
  test_1: IF
  test_2: ELSE
  test_3: IF
  test_4: ELSE
  test_5: IF
notes: <any observations about If/Else branching behavior>`}</code></pre>
    </Command>
  );
}
