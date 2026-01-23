/**
 * Scenario 3.3: Assign Variable with Static Value
 *
 * Goal: Confirm that `<Assign value="...">` produces correct shell variable
 * assignment with a literal value, including proper quoting for spaces and
 * special characters.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/3.3-static-value-assign.tsx
 * Output: .claude/commands/3.3-static-value-assign.md
 */

import { Command, Assign, useVariable } from '../../jsx.js';

// Declare variables at module level
const simpleValue = useVariable<string>("SIMPLE_VALUE");
const valueWithSpaces = useVariable<string>("VALUE_WITH_SPACES");
const valueWithQuotes = useVariable<string>("VALUE_WITH_QUOTES");
const valueWithSpecialChars = useVariable<string>("VALUE_WITH_SPECIAL_CHARS");
const emptyValue = useVariable<string>("EMPTY_VALUE");

export default function StaticValueAssignTest() {
  return (
    <Command
      name="static-value-assign-test"
      description="Test Assign with static value prop. Use when testing static value assignment."
    >
      <h1>Static Value Assignment Test</h1>

      <p>
        This test validates that the Assign component with the value prop produces
        correct shell variable assignment with proper quoting for various value types.
      </p>

      <h2>Test 1: Simple String Value</h2>

      <p>Assign a simple string without spaces or special characters:</p>
      <Assign var={simpleValue} value="hello-world" />

      <h2>Test 2: Value with Spaces</h2>

      <p>Assign a string containing spaces (should be properly quoted):</p>
      <Assign var={valueWithSpaces} value="hello world with spaces" />

      <h2>Test 3: Value with Quotes</h2>

      <p>Assign a string containing single quotes (escaping test):</p>
      <Assign var={valueWithQuotes} value="it's a test" />

      <h2>Test 4: Value with Special Characters</h2>

      <p>Assign a string with various special characters:</p>
      <Assign var={valueWithSpecialChars} value="special: !@#%^&*()_+" />

      <h2>Test 5: Empty String Value</h2>

      <p>Assign an empty string:</p>
      <Assign var={emptyValue} value="" />

      <h2>Verification Tests</h2>

      <p>After running the assignments above, execute these verification commands:</p>

      <pre><code className="language-bash">
echo "SIMPLE_VALUE = [$SIMPLE_VALUE]"
echo "VALUE_WITH_SPACES = [$VALUE_WITH_SPACES]"
echo "VALUE_WITH_QUOTES = [$VALUE_WITH_QUOTES]"
echo "VALUE_WITH_SPECIAL_CHARS = [$VALUE_WITH_SPECIAL_CHARS]"
echo "EMPTY_VALUE = [$EMPTY_VALUE]"
      </code></pre>

      <h2>Expected Values</h2>

      <ul>
        <li><strong>SIMPLE_VALUE</strong>: should equal "hello-world"</li>
        <li><strong>VALUE_WITH_SPACES</strong>: should equal "hello world with spaces"</li>
        <li><strong>VALUE_WITH_QUOTES</strong>: should equal "it's a test"</li>
        <li><strong>VALUE_WITH_SPECIAL_CHARS</strong>: should equal "special: !@#%^&amp;*()+_"</li>
        <li><strong>EMPTY_VALUE</strong>: should be empty string ""</li>
      </ul>

      <h2>Your Task</h2>

      <ol>
        <li>Execute each Assign block (they emit as bash code blocks)</li>
        <li>Run the verification commands to check values</li>
        <li>Confirm that values with spaces are properly preserved</li>
        <li>Confirm that special characters are not interpreted as shell metacharacters</li>
        <li>Confirm that empty string assignment works</li>
      </ol>

      <h2>Response Format</h2>

      <p>Respond with YAML status report:</p>

      <pre><code className="language-yaml">{`status: SUCCESS | FAILURE
tests:
  simple_string: PASSED | FAILED
  value_with_spaces: PASSED | FAILED
  value_with_quotes: PASSED | FAILED
  special_characters: PASSED | FAILED
  empty_string: PASSED | FAILED
values:
  SIMPLE_VALUE: <actual value>
  VALUE_WITH_SPACES: <actual value>
  VALUE_WITH_QUOTES: <actual value>
  VALUE_WITH_SPECIAL_CHARS: <actual value>
  EMPTY_VALUE: <actual value or "(empty)">
notes: <observations about quoting behavior>`}</code></pre>
    </Command>
  );
}
