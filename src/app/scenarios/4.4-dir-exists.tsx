/**
 * Scenario 4.4: dirExists Test Builder
 *
 * Goal: Confirm that the `dirExists()` test builder produces correct shell syntax
 * for directory existence checks.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/4.4-dir-exists.tsx
 * Output: .claude/commands/4.4-dir-exists.md
 */

import { Command, Assign, useVariable, If, dirExists, fileExists } from '../../jsx.js';

// Declare variables at module level
const existingDir = useVariable<string>("EXISTING_DIR");
const nonExistingDir = useVariable<string>("NON_EXISTING_DIR");
const fileNotDir = useVariable<string>("FILE_NOT_DIR");
const nestedDir = useVariable<string>("NESTED_DIR");

export default function DirExistsTest() {
  return (
    <Command
      name="dir-exists-test"
      description="Test dirExists() test builder for directory existence checks. Use when testing directory conditionals."
    >
      <h1>dirExists Test Builder Test</h1>

      <p>
        This test validates that the dirExists() test builder produces correct
        shell syntax [ -d $VAR ] for directory existence checks, and that Claude
        correctly distinguishes between files and directories.
      </p>

      <h2>Setup: Assign Test Variables</h2>

      <p>First, assign values to test variables:</p>
      <Assign var={existingDir} value="src" />
      <Assign var={nonExistingDir} value="this-directory-does-not-exist-12345" />
      <Assign var={fileNotDir} value="package.json" />
      <Assign var={nestedDir} value="src/app/scenarios" />

      <h2>Test 1: Existing Directory (True Case)</h2>

      <p>Check if $EXISTING_DIR exists as a directory (should be TRUE since "src" directory exists):</p>

      <If test={dirExists(existingDir)}>
        <p>TEST 1 PASSED: Directory $EXISTING_DIR exists! The dirExists() test builder correctly evaluates to TRUE for existing directories.</p>
      </If>

      <h2>Test 2: Non-Existing Directory (False Case)</h2>

      <p>Check if $NON_EXISTING_DIR exists (should be FALSE):</p>

      <If test={dirExists(nonExistingDir)}>
        <p>TEST 2 FAILED: This content should NOT appear because the directory does not exist.</p>
      </If>

      <p>If you do NOT see "TEST 2 FAILED" message above, Test 2 passed (Claude skipped the content).</p>

      <h2>Test 3: File vs Directory Distinction</h2>

      <p>Check if $FILE_NOT_DIR (package.json - a file) is a directory (should be FALSE):</p>

      <If test={dirExists(fileNotDir)}>
        <p>TEST 3 FAILED: This content should NOT appear because package.json is a file, not a directory.</p>
      </If>

      <p>If you do NOT see "TEST 3 FAILED" message above, Test 3 passed (dirExists correctly returns false for files).</p>

      <h2>Test 4: Contrast with fileExists</h2>

      <p>Verify that fileExists returns TRUE for package.json while dirExists returns FALSE:</p>

      <If test={fileExists(fileNotDir)}>
        <p>TEST 4a PASSED: fileExists correctly identifies $FILE_NOT_DIR as a file.</p>
      </If>

      <p>For comparison, the dirExists check was already done in Test 3 (should have been skipped).</p>

      <h2>Test 5: Nested Directory Path</h2>

      <p>Check if $NESTED_DIR exists (testing with a nested path "src/app/scenarios"):</p>

      <If test={dirExists(nestedDir)}>
        <p>TEST 5 PASSED: Nested directory $NESTED_DIR exists! Variable interpolation works with nested paths.</p>
      </If>

      <h2>Your Task</h2>

      <p>Evaluate each If condition above and verify:</p>

      <ol>
        <li>Does dirExists() produce "[ -d $VAR_NAME ]" syntax in the markdown?</li>
        <li>Test 1: Did you see "TEST 1 PASSED"? (Should YES - src directory exists)</li>
        <li>Test 2: Did you see "TEST 2 FAILED"? (Should NO - directory doesn't exist)</li>
        <li>Test 3: Did you see "TEST 3 FAILED"? (Should NO - file is not a directory)</li>
        <li>Test 4a: Did you see "TEST 4a PASSED"? (Should YES - confirms file/dir distinction)</li>
        <li>Test 5: Did you see "TEST 5 PASSED"? (Should YES - nested dir exists)</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  dir_exists_syntax_correct: PASSED | FAILED
  existing_directory_detected: PASSED | FAILED
  non_existing_directory_skipped: PASSED | FAILED
  file_not_treated_as_directory: PASSED | FAILED
  file_dir_distinction_works: PASSED | FAILED
  variable_interpolation: PASSED | FAILED
observations:
  test_1_visible: true | false
  test_2_visible: true | false
  test_3_visible: true | false
  test_4a_visible: true | false
  test_5_visible: true | false
  rendered_syntax_sample: "[ -d $EXISTING_DIR ]"
notes: <any observations about dirExists behavior>`}</code></pre>
    </Command>
  );
}
