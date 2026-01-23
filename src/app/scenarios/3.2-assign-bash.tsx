/**
 * Scenario 3.2: Assign Variable from Bash Command
 *
 * Goal: Confirm that `<Assign bash="...">` produces correct shell variable
 * assignment from command output.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/3.2-assign-bash.tsx
 * Output: .claude/commands/3.2-assign-bash.md
 */

import { Command, Assign, useVariable, If, notEmpty } from '../../jsx.js';

// Declare variables at module level
const currentDate = useVariable<string>("CURRENT_DATE");
const workingDir = useVariable<string>("WORKING_DIR");
const gitBranch = useVariable<string>("GIT_BRANCH");
const fileCount = useVariable<string>("FILE_COUNT");

export default function AssignBashTest() {
  return (
    <Command
      name="assign-bash-test"
      description="Test Assign component with bash attribute for capturing command output. Use when testing variable assignment from shell commands."
    >
      <h1>Assign Variable from Bash Command Test</h1>

      <p>
        This test validates that the Assign component with bash attribute correctly
        produces shell variable assignment instructions that capture command output.
      </p>

      <h2>Test 1: Simple Date Command</h2>

      <p>Assign the output of a date command to CURRENT_DATE:</p>
      <Assign var={currentDate} bash={`date +%Y-%m-%d`} />

      <p>The bash command should be preserved exactly as: <code>date +%Y-%m-%d</code></p>

      <h2>Test 2: Working Directory Command</h2>

      <p>Assign the output of pwd to WORKING_DIR:</p>
      <Assign var={workingDir} bash={`pwd`} />

      <h2>Test 3: Git Branch Command</h2>

      <p>Assign the current git branch to GIT_BRANCH:</p>
      <Assign var={gitBranch} bash={`git branch --show-current`} />

      <h2>Test 4: Command with Pipes</h2>

      <p>Assign file count using a piped command to FILE_COUNT:</p>
      <Assign var={fileCount} bash={`ls -1 | wc -l | tr -d ' '`} />

      <h2>Test 5: Use Variables in Subsequent Instructions</h2>

      <p>Now use the assigned variables:</p>

      <pre><code className="language-bash">
echo "Current date: $CURRENT_DATE"
echo "Working directory: $WORKING_DIR"
echo "Git branch: $GIT_BRANCH"
echo "File count: $FILE_COUNT"
      </code></pre>

      <h2>Test 6: Variable in Conditional</h2>

      <If test={notEmpty(currentDate)}>
        <p>✅ CURRENT_DATE has been assigned a value from the bash command!</p>
      </If>

      <If test={notEmpty(gitBranch)}>
        <p>✅ GIT_BRANCH captured the current branch name!</p>
      </If>

      <h2>Your Task</h2>

      <p>Execute each assignment and verify:</p>

      <ol>
        <li>Execute the Assign blocks - they should appear as bash code blocks with assignment syntax</li>
        <li>Verify CURRENT_DATE contains today's date in YYYY-MM-DD format</li>
        <li>Verify WORKING_DIR contains the current directory path</li>
        <li>Verify GIT_BRANCH contains the current branch name</li>
        <li>Verify FILE_COUNT contains a number (count of files)</li>
        <li>Confirm variables can be used in subsequent echo commands</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  assign_renders_as_instruction: PASSED | FAILED
  bash_command_preserved: PASSED | FAILED
  command_output_captured: PASSED | FAILED
  variable_in_subsequent_use: PASSED | FAILED
values:
  CURRENT_DATE: <actual value>
  WORKING_DIR: <actual value>
  GIT_BRANCH: <actual value>
  FILE_COUNT: <actual value>
notes: <observations about bash assignment behavior>`}</code></pre>
    </Command>
  );
}
