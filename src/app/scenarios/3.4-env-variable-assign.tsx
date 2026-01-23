/**
 * Scenario 3.4: Assign Variable from Environment
 *
 * Goal: Confirm that `<Assign env="...">` produces correct syntax to read an
 * environment variable and assign it to a local variable.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/3.4-env-variable-assign.tsx
 * Output: .claude/commands/3.4-env-variable-assign.md
 */

import { Command, Assign, useVariable, If, notEmpty, isEmpty } from '../../jsx.js';

// Declare variables at module level
const userVar = useVariable<string>("LOCAL_USER");
const homeVar = useVariable<string>("LOCAL_HOME");
const pathVar = useVariable<string>("LOCAL_PATH");
const shellVar = useVariable<string>("LOCAL_SHELL");
const undefinedVar = useVariable<string>("LOCAL_UNDEFINED");

export default function EnvVariableAssignTest() {
  return (
    <Command
      name="env-variable-assign-test"
      description="Test Assign with env attribute for reading environment variables. Use when testing environment variable assignment."
    >
      <h1>Environment Variable Assignment Test</h1>

      <p>
        This test validates that the Assign component with the env attribute correctly
        produces shell syntax to read environment variables into local variables.
      </p>

      <h2>Test 1: Read USER Environment Variable</h2>

      <p>Assign the USER environment variable to LOCAL_USER:</p>
      <Assign var={userVar} env="USER" />

      <p>The output should reference $USER and assign it to LOCAL_USER.</p>

      <h2>Test 2: Read HOME Environment Variable</h2>

      <p>Assign the HOME environment variable to LOCAL_HOME:</p>
      <Assign var={homeVar} env="HOME" />

      <h2>Test 3: Read PATH Environment Variable</h2>

      <p>Assign the PATH environment variable to LOCAL_PATH:</p>
      <Assign var={pathVar} env="PATH" />

      <h2>Test 4: Read SHELL Environment Variable</h2>

      <p>Assign the SHELL environment variable to LOCAL_SHELL:</p>
      <Assign var={shellVar} env="SHELL" />

      <h2>Test 5: Read Undefined Environment Variable</h2>

      <p>Assign a non-existent environment variable (SOME_UNDEFINED_VAR_12345):</p>
      <Assign var={undefinedVar} env="SOME_UNDEFINED_VAR_12345" />

      <h2>Verification: Use Variables in Subsequent Instructions</h2>

      <p>Execute these commands to verify the values were captured:</p>

      <pre><code className="language-bash">
echo "LOCAL_USER = [$LOCAL_USER]"
echo "LOCAL_HOME = [$LOCAL_HOME]"
echo "LOCAL_PATH length = [${`{#LOCAL_PATH}`}]"
echo "LOCAL_SHELL = [$LOCAL_SHELL]"
echo "LOCAL_UNDEFINED = [$LOCAL_UNDEFINED]"
      </code></pre>

      <h2>Test 6: Conditional Based on Environment Variable</h2>

      <If test={notEmpty(userVar)}>
        <p>✅ LOCAL_USER has a value - environment variable was read successfully!</p>
      </If>

      <If test={notEmpty(homeVar)}>
        <p>✅ LOCAL_HOME has a value - HOME was captured!</p>
      </If>

      <If test={isEmpty(undefinedVar)}>
        <p>✅ LOCAL_UNDEFINED is empty - undefined env var handled correctly!</p>
      </If>

      <h2>Expected Results</h2>

      <ul>
        <li><strong>LOCAL_USER</strong>: should contain your username (e.g., "glenninizan")</li>
        <li><strong>LOCAL_HOME</strong>: should contain your home directory (e.g., "/Users/glenninizan")</li>
        <li><strong>LOCAL_PATH</strong>: should contain the PATH (long string with colons)</li>
        <li><strong>LOCAL_SHELL</strong>: should contain your shell path (e.g., "/bin/zsh")</li>
        <li><strong>LOCAL_UNDEFINED</strong>: should be empty (undefined env var)</li>
      </ul>

      <h2>Your Task</h2>

      <ol>
        <li>Execute each Assign block (they emit as bash code blocks with $ENV_VAR syntax)</li>
        <li>Verify the environment variable reference syntax is correct (e.g., LOCAL_USER=$USER)</li>
        <li>Run the verification echo commands</li>
        <li>Confirm that environment values are correctly captured into local variables</li>
        <li>Confirm undefined environment variables result in empty local variables</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  env_reference_syntax: PASSED | FAILED
  user_env_read: PASSED | FAILED
  home_env_read: PASSED | FAILED
  path_env_read: PASSED | FAILED
  shell_env_read: PASSED | FAILED
  undefined_env_handled: PASSED | FAILED
  variable_in_subsequent_use: PASSED | FAILED
values:
  LOCAL_USER: <actual value>
  LOCAL_HOME: <actual value>
  LOCAL_PATH: "<truncated or length>"
  LOCAL_SHELL: <actual value>
  LOCAL_UNDEFINED: "(empty)" or <value if any>
notes: <observations about environment variable assignment behavior>`}</code></pre>
    </Command>
  );
}
