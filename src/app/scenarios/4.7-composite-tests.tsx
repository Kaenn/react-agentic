/**
 * Scenario 4.7: Composite Tests with and/or
 *
 * Goal: Confirm that `and()` and `or()` test builders compose multiple
 * conditions correctly.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.7-composite-tests.tsx
 * Output: .claude/commands/4.7-composite-tests.md
 */

import { Command, Assign, useVariable, If, Else, and, or, fileExists, dirExists, notEmpty, isEmpty, equals } from '../../jsx.js';

// Declare variables at module level
const existingFile = useVariable<string>("EXISTING_FILE");
const existingDir = useVariable<string>("EXISTING_DIR");
const nonExistingFile = useVariable<string>("NON_EXISTING_FILE");
const testValue = useVariable<string>("TEST_VALUE");
const emptyValue = useVariable<string>("EMPTY_VALUE");
const statusCode = useVariable<string>("STATUS_CODE");

export default function CompositeTestsCommand() {
  return (
    <Command
      name="composite-tests"
      description="Test and() and or() test builders for composite conditions. Use when testing composite logic."
    >
      <h1>Composite Tests with and/or</h1>

      <p>
        This test validates that the and() and or() test builders correctly
        compose multiple conditions into shell expressions using && and || operators.
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test variables:</p>
      <Assign var={existingFile} value="package.json" />
      <Assign var={existingDir} value=".git" />
      <Assign var={nonExistingFile} value="this-file-does-not-exist-xyz123.txt" />
      <Assign var={testValue} value="hello-world" />
      <Assign var={emptyValue} value="" />
      <Assign var={statusCode} value="0" />

      <h2>Test 1: Simple and() - Both True</h2>

      <p>Check if both package.json exists AND .git directory exists (both should be TRUE):</p>

      <If test={and(fileExists(existingFile), dirExists(existingDir))}>
        <p>TEST 1 PASSED: Both conditions are true. The and() builder correctly produced `[ -f $EXISTING_FILE ] && [ -d $EXISTING_DIR ]` syntax.</p>
      </If>
      <Else>
        <p>TEST 1 FAILED: and() should have evaluated to true when both conditions are true.</p>
      </Else>

      <h2>Test 2: Simple and() - One False</h2>

      <p>Check if package.json exists AND non-existing file exists (second is FALSE):</p>

      <If test={and(fileExists(existingFile), fileExists(nonExistingFile))}>
        <p>TEST 2 FAILED: This should NOT appear because one condition is false.</p>
      </If>
      <Else>
        <p>TEST 2 PASSED: and() correctly evaluated to false when one condition is false.</p>
      </Else>

      <h2>Test 3: Simple or() - First True</h2>

      <p>Check if package.json exists OR non-existing file exists (first is TRUE):</p>

      <If test={or(fileExists(existingFile), fileExists(nonExistingFile))}>
        <p>TEST 3 PASSED: or() evaluated to true because at least one condition is true.</p>
      </If>
      <Else>
        <p>TEST 3 FAILED: or() should have evaluated to true when first condition is true.</p>
      </Else>

      <h2>Test 4: Simple or() - Second True</h2>

      <p>Check if non-existing file exists OR .git directory exists (second is TRUE):</p>

      <If test={or(fileExists(nonExistingFile), dirExists(existingDir))}>
        <p>TEST 4 PASSED: or() evaluated to true because the second condition is true.</p>
      </If>
      <Else>
        <p>TEST 4 FAILED: or() should have evaluated to true when second condition is true.</p>
      </Else>

      <h2>Test 5: Simple or() - Both False</h2>

      <p>Check if non-existing file exists OR empty value is not empty (both FALSE):</p>

      <If test={or(fileExists(nonExistingFile), notEmpty(emptyValue))}>
        <p>TEST 5 FAILED: This should NOT appear because both conditions are false.</p>
      </If>
      <Else>
        <p>TEST 5 PASSED: or() correctly evaluated to false when both conditions are false.</p>
      </Else>

      <h2>Test 6: Nested Composite - and() with or()</h2>

      <p>Check if (file exists) AND (dir exists OR value is empty). Using: and(fileExists, or(dirExists, isEmpty)):</p>

      <If test={and(fileExists(existingFile), or(dirExists(existingDir), isEmpty(emptyValue)))}>
        <p>TEST 6 PASSED: Nested composite correctly evaluated. File exists AND (dir exists OR value is empty).</p>
      </If>
      <Else>
        <p>TEST 6 FAILED: Nested composite should have evaluated to true.</p>
      </Else>

      <h2>Test 7: Nested Composite - or() with and()</h2>

      <p>Check if (non-existing file) OR (file exists AND value not empty). Using: or(fileExists(nonExisting), and(fileExists, notEmpty)):</p>

      <If test={or(fileExists(nonExistingFile), and(fileExists(existingFile), notEmpty(testValue)))}>
        <p>TEST 7 PASSED: Nested composite correctly evaluated. First is false, but (file exists AND value not empty) is true.</p>
      </If>
      <Else>
        <p>TEST 7 FAILED: Nested composite should have evaluated to true via the second condition.</p>
      </Else>

      <h2>Test 8: Triple and() Condition</h2>

      <p>Check if file exists AND dir exists AND value not empty (all TRUE):</p>

      <If test={and(fileExists(existingFile), dirExists(existingDir), notEmpty(testValue))}>
        <p>TEST 8 PASSED: Triple and() with all true conditions works correctly.</p>
      </If>
      <Else>
        <p>TEST 8 FAILED: Triple and() should have evaluated to true when all conditions are true.</p>
      </Else>

      <h2>Test 9: Triple or() with One True</h2>

      <p>Check if (non-existing file) OR (value empty) OR (dir exists). Only third is TRUE:</p>

      <If test={or(fileExists(nonExistingFile), isEmpty(testValue), dirExists(existingDir))}>
        <p>TEST 9 PASSED: Triple or() correctly evaluated to true when third condition is true.</p>
      </If>
      <Else>
        <p>TEST 9 FAILED: Triple or() should have evaluated to true when at least one is true.</p>
      </Else>

      <h2>Test 10: Complex Nested - or(and(), and())</h2>

      <p>Check if (non-existing file AND empty value) OR (file exists AND dir exists). First and() is false, second is true:</p>

      <If test={or(and(fileExists(nonExistingFile), isEmpty(emptyValue)), and(fileExists(existingFile), dirExists(existingDir)))}>
        <p>TEST 10 PASSED: Complex nested or(and(), and()) evaluated correctly via second and() branch.</p>
      </If>
      <Else>
        <p>TEST 10 FAILED: Complex nested should evaluate to true via second and() branch.</p>
      </Else>

      <h2>Your Task</h2>

      <p>Evaluate each test and verify:</p>

      <ol>
        <li>Does and() produce `test1 && test2` syntax in the markdown output?</li>
        <li>Does or() produce `test1 || test2` syntax in the markdown output?</li>
        <li>Do nested composites produce correctly grouped expressions?</li>
        <li>Are all tests evaluated correctly by Claude?</li>
      </ol>

      <p>Expected results:</p>
      <ul>
        <li>Test 1: PASSED (both true with and)</li>
        <li>Test 2: PASSED via ELSE (one false with and)</li>
        <li>Test 3: PASSED (first true with or)</li>
        <li>Test 4: PASSED (second true with or)</li>
        <li>Test 5: PASSED via ELSE (both false with or)</li>
        <li>Test 6: PASSED (nested and-or)</li>
        <li>Test 7: PASSED (nested or-and)</li>
        <li>Test 8: PASSED (triple and)</li>
        <li>Test 9: PASSED (triple or)</li>
        <li>Test 10: PASSED (complex or-and-and)</li>
      </ul>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  and_produces_correct_syntax: PASSED | FAILED
  or_produces_correct_syntax: PASSED | FAILED
  nested_composites_work: PASSED | FAILED
  claude_evaluates_correctly: PASSED | FAILED
results:
  test_1_simple_and_both_true: PASSED | FAILED
  test_2_simple_and_one_false: PASSED | FAILED
  test_3_simple_or_first_true: PASSED | FAILED
  test_4_simple_or_second_true: PASSED | FAILED
  test_5_simple_or_both_false: PASSED | FAILED
  test_6_nested_and_or: PASSED | FAILED
  test_7_nested_or_and: PASSED | FAILED
  test_8_triple_and: PASSED | FAILED
  test_9_triple_or: PASSED | FAILED
  test_10_complex_nested: PASSED | FAILED
syntax_samples:
  and_sample: "[ -f $EXISTING_FILE ] && [ -d $EXISTING_DIR ]"
  or_sample: "[ -f $EXISTING_FILE ] || [ -f $NON_EXISTING_FILE ]"
  nested_sample: "[ -f $EXISTING_FILE ] && [ -d $EXISTING_DIR ] || [ -z $EMPTY_VALUE ]"
notes: <any observations about and/or composite behavior>`}</code></pre>
    </Command>
  );
}
