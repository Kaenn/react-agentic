/**
 * Scenario 4.3: fileExists Test Builder
 *
 * Goal: Confirm that the `fileExists()` test builder produces correct
 * shell syntax for file existence checks.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.3-file-exists-test.tsx
 * Output: .claude/commands/4.3-file-exists-test.md
 */

import { Command, Assign, useVariable, If, Else, fileExists } from '../../jsx.js';

// Declare variables for file paths
const existingFilePath = useVariable<string>("EXISTING_FILE_PATH");
const nonExistingFilePath = useVariable<string>("NON_EXISTING_FILE_PATH");
const dynamicFilePath = useVariable<string>("DYNAMIC_FILE_PATH");

export default function FileExistsTestBuilder() {
  return (
    <Command
      name="file-exists-test"
      description="Test fileExists() test builder for file existence checks. Use when testing file conditionals."
    >
      <h1>fileExists Test Builder Validation</h1>

      <p>
        This test validates that the fileExists() test builder produces correct
        shell syntax `[ -f $VAR ]` for file existence checks, and that you correctly
        evaluate these conditions at runtime.
      </p>

      <h2>IMPORTANT: Runtime Evaluation Required</h2>

      <p>
        You MUST evaluate each shell condition using the Bash tool before deciding
        which branch to follow. Do NOT just read the content - actually run each
        `[ -f $VAR ]` test to determine if the condition is true or false.
      </p>

      <h2>Step 1: Execute Variable Assignments</h2>

      <p>Run these bash commands to set up the test variables:</p>
      <Assign var={existingFilePath} value="package.json" />
      <Assign var={nonExistingFilePath} value="this-file-definitely-does-not-exist-xyz123.txt" />
      <Assign var={dynamicFilePath} bash="ls -1 *.json 2>/dev/null | head -1" />

      <h2>Step 2: Evaluate Conditions and Follow Branches</h2>

      <h3>Test 1: Existing File Check</h3>

      <p>Evaluate this condition using Bash: `[ -f $EXISTING_FILE_PATH ]`</p>

      <If test={fileExists(existingFilePath)}>
        <p>✅ TEST 1 PASSED: You correctly determined that package.json exists and followed the IF branch.</p>
      </If>

      <h3>Test 2: Non-Existing File Check (CRITICAL)</h3>

      <p>Evaluate this condition using Bash: `[ -f $NON_EXISTING_FILE_PATH ]`</p>
      <p>This condition should be FALSE - you should SKIP the content below and NOT report seeing it.</p>

      <If test={fileExists(nonExistingFilePath)}>
        <p>❌ TEST 2 FAILED: You should NOT see this message! The file does not exist, so this branch should be skipped.</p>
      </If>

      <h3>Test 3: Dynamic File Path</h3>

      <p>Evaluate this condition using Bash: `[ -f $DYNAMIC_FILE_PATH ]`</p>

      <If test={fileExists(dynamicFilePath)}>
        <p>✅ TEST 3 PASSED: Dynamic file path evaluation works correctly.</p>
      </If>

      <h3>Test 4: If/Else with Existing File</h3>

      <p>Evaluate: `[ -f $EXISTING_FILE_PATH ]` - should take IF branch:</p>

      <If test={fileExists(existingFilePath)}>
        <p>✅ TEST 4 PASSED: Correctly took IF branch for existing file.</p>
      </If>
      <Else>
        <p>❌ TEST 4 FAILED: Should not reach ELSE - file exists!</p>
      </Else>

      <h3>Test 5: If/Else with Non-Existing File</h3>

      <p>Evaluate: `[ -f $NON_EXISTING_FILE_PATH ]` - should take ELSE branch:</p>

      <If test={fileExists(nonExistingFilePath)}>
        <p>❌ TEST 5 FAILED: Should not reach IF - file doesn't exist!</p>
      </If>
      <Else>
        <p>✅ TEST 5 PASSED: Correctly took ELSE branch for non-existing file.</p>
      </Else>

      <h2>Step 3: Report Results</h2>

      <p>After evaluating ALL conditions above, report your findings:</p>

      <ol>
        <li>Did you execute each `[ -f $VAR ]` condition using Bash?</li>
        <li>Test 1: Did you see "TEST 1 PASSED"? (Expected: YES)</li>
        <li>Test 2: Did you see "TEST 2 FAILED"? (Expected: NO - you should have skipped it)</li>
        <li>Test 3: Did you see "TEST 3 PASSED"? (Expected: YES)</li>
        <li>Test 4: Which branch did you take? (Expected: IF branch, "PASSED")</li>
        <li>Test 5: Which branch did you take? (Expected: ELSE branch, "PASSED")</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  fileExists_syntax_correct: PASSED | FAILED
  existing_file_detected: PASSED | FAILED
  nonexisting_file_skipped: PASSED | FAILED
  dynamic_path_works: PASSED | FAILED
  if_else_branching: PASSED | FAILED
observations:
  conditions_evaluated_with_bash: true | false
  test_1_passed_visible: true | false
  test_2_failed_visible: true | false
  test_3_passed_visible: true | false
  test_4_branch_taken: IF | ELSE
  test_5_branch_taken: IF | ELSE
notes: <observations about fileExists() behavior and runtime evaluation>`}</code></pre>
    </Command>
  );
}
