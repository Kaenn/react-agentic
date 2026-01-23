/**
 * Scenario 3.5: Variable Interpolation in Content
 *
 * Goal: Confirm that variable references are properly interpolated in text
 * content and instructions.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/3.5-variable-interpolation.tsx
 * Output: .claude/commands/3.5-variable-interpolation.md
 */

import { Command, Assign, useVariable, Markdown } from '../../jsx.js';

// Declare variables at module level
const currentDate = useVariable<string>("CURRENT_DATE");
const userName = useVariable<string>("USER_NAME");
const projectDir = useVariable<string>("PROJECT_DIR");

export default function VariableInterpolationTest() {
  return (
    <Command
      name="variable-interpolation-test"
      description="Test variable interpolation in content. Use when testing variable substitution."
    >
      <h1>Variable Interpolation in Content Test</h1>

      <p>
        This test validates that variable references ($VAR syntax) appear in markdown
        output and Claude substitutes actual values when executing shell commands.
      </p>

      <h2>Step 1: Assign Variables</h2>

      <p>First, assign values to our test variables:</p>
      <Assign var={currentDate} bash={`date +%Y-%m-%d`} />
      <Assign var={userName} env="USER" />
      <Assign var={projectDir} bash={`pwd`} />

      <h2>Test 1: Variable in Plain Text</h2>

      <p>The current date is $CURRENT_DATE.</p>
      <p>The current user is $USER_NAME.</p>
      <p>The project directory is $PROJECT_DIR.</p>

      <h2>Test 2: Multiple Variables in Same Sentence</h2>

      <p>User $USER_NAME is working in $PROJECT_DIR on $CURRENT_DATE.</p>

      <h2>Test 3: Variables in Code Block</h2>

      <pre><code className="language-bash">
echo "Date: $CURRENT_DATE"
echo "User: $USER_NAME"
echo "Dir: $PROJECT_DIR"
      </code></pre>

      <h2>Test 4: Variables in Instruction List</h2>

      <ol>
        <li>Verify that $USER_NAME matches your system username</li>
        <li>Verify that $CURRENT_DATE is today's date (YYYY-MM-DD format)</li>
        <li>Verify that $PROJECT_DIR is the current working directory</li>
      </ol>

      <h2>Test 5: Variables in Markdown Table</h2>

      <Markdown>
{`The build was created by **$USER_NAME** on **$CURRENT_DATE**.

| Variable | Reference | Expected |
|----------|-----------|----------|
| Date | $CURRENT_DATE | Today's date |
| User | $USER_NAME | Your username |
| Directory | $PROJECT_DIR | Working dir |`}
      </Markdown>

      <h2>Your Task</h2>

      <p>Execute the assignments above, then verify:</p>

      <ol>
        <li>Run each Assign block to set the variables</li>
        <li>Check that $CURRENT_DATE, $USER_NAME, $PROJECT_DIR appear in the markdown literally</li>
        <li>Run the echo commands and confirm Claude substitutes actual values</li>
        <li>Verify the table shows variable references that Claude can substitute</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  variable_reference_in_markdown: PASSED | FAILED
  claude_substitutes_values: PASSED | FAILED
  multiple_references_same_text: PASSED | FAILED
  variables_in_code_blocks: PASSED | FAILED
  variables_in_instructions: PASSED | FAILED
values:
  CURRENT_DATE: <actual value after substitution>
  USER_NAME: <actual value after substitution>
  PROJECT_DIR: <actual value after substitution>
notes: <observations about interpolation behavior>`}</code></pre>
    </Command>
  );
}
