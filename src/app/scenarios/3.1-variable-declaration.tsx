/**
 * Scenario 3.1: Variable Declaration with useVariable
 *
 * Goal: Confirm that `useVariable` declarations create proper shell variable
 * references that can be used throughout the skill/command.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/3.1-variable-declaration.tsx
 * Output: .claude/commands/3.1-variable-declaration.md
 */

import { Command, Assign, useVariable, If, notEmpty } from '../../jsx.js';

// Declare variables at module level (outside component)
const myVar = useVariable<string>("MY_VAR");
const timestamp = useVariable<string>("TIMESTAMP");
const projectName = useVariable<string>("PROJECT_NAME");

export default function VariableDeclarationTest() {
  return (
    <Command
      name="variable-test"
      description="Test useVariable hook for shell variable references. Use when testing variable declaration."
    >
      <h1>Variable Declaration Test</h1>

      <p>
        This test validates that useVariable creates proper shell variable references
        that can be used in Assign components and shell test expressions.
      </p>

      <h2>Test 1: Static Value Assignment</h2>

      <p>Assign a static value to MY_VAR:</p>
      <Assign var={myVar} value="test-value-123" />

      <h2>Test 2: Dynamic Value Assignment (bash)</h2>

      <p>Assign output of a bash command to TIMESTAMP:</p>
      <Assign var={timestamp} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />

      <h2>Test 3: Environment Variable Assignment</h2>

      <p>Read from environment into PROJECT_NAME:</p>
      <Assign var={projectName} env="USER" />

      <h2>Test 4: Variable Usage in Shell Commands</h2>

      <p>Use variables with $ prefix in shell commands:</p>
      <pre><code className="language-bash">
echo "MY_VAR is: $MY_VAR"
echo "TIMESTAMP is: $TIMESTAMP"
echo "PROJECT_NAME is: $PROJECT_NAME"
      </code></pre>

      <h2>Test 5: Variable in Test Builders</h2>

      <p>Test if MY_VAR is not empty (using notEmpty test builder):</p>
      <If test={notEmpty(myVar)}>
        <p>✅ MY_VAR has a value - the notEmpty test passed!</p>
      </If>

      <p>Test if TIMESTAMP is not empty:</p>
      <If test={notEmpty(timestamp)}>
        <p>✅ TIMESTAMP has a value - dynamic assignment worked!</p>
      </If>

      <h2>Test 6: Multiple Uses of Same Variable</h2>

      <p>Use MY_VAR in multiple places:</p>
      <pre><code className="language-bash">
echo "First use: $MY_VAR"
echo "Second use: $MY_VAR"
echo "Third use: $MY_VAR"
      </code></pre>

      <h2>Your Task</h2>

      <p>Execute the bash commands above and verify:</p>

      <ol>
        <li>Run each assignment block (the compiler emits them as bash code blocks)</li>
        <li>Verify MY_VAR contains "test-value-123"</li>
        <li>Verify TIMESTAMP contains a valid ISO timestamp</li>
        <li>Verify PROJECT_NAME contains your username from $USER</li>
        <li>Confirm the If conditions trigger correctly</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  static_value_assignment: PASSED | FAILED
  dynamic_bash_assignment: PASSED | FAILED
  env_variable_assignment: PASSED | FAILED
  shell_variable_syntax: PASSED | FAILED
  test_builders: PASSED | FAILED
  multiple_uses: PASSED | FAILED
values:
  MY_VAR: <actual value>
  TIMESTAMP: <actual value>
  PROJECT_NAME: <actual value>
notes: <observations about variable behavior>`}</code></pre>
    </Command>
  );
}
