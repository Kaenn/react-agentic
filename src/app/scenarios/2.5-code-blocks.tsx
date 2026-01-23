/**
 * Scenario 2.5: Code Blocks with Language
 *
 * Goal: Confirm that code blocks include language tags and Claude recognizes
 * them for syntax highlighting or language-specific handling.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/2.5-code-blocks.tsx
 * Output: .claude/skills/code-blocks-test/SKILL.md
 */

import { Skill, Markdown } from '../../jsx.js';

export default function CodeBlocksTestSkill() {
  return (
    <Skill
      name="code-blocks-test"
      description="Test skill to verify code blocks render with language tags and content is preserved. Use when testing code block rendering."
    >
      <h1>Code Blocks with Language Test</h1>

      <p>
        You have successfully invoked the code-blocks-test skill. This skill
        tests whether code blocks render with proper triple backticks, language
        tags, and preserved content.
      </p>

      <h2>Test 1: TypeScript Code Block</h2>

      <p>The following TypeScript code should have the language tag "typescript":</p>

      <Markdown>
{`\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return "Hello, " + user.name + "!";
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@example.com"
};

console.log(greetUser(user));
\`\`\``}
      </Markdown>

      <h2>Test 2: Bash Code Block</h2>

      <p>The following bash code should have the language tag "bash":</p>

      <Markdown>
{`\`\`\`bash
#!/bin/bash

# Variables and special characters
NAME="World"
COUNT=5

# Loop with special syntax
for i in $(seq 1 $COUNT); do
  echo "Hello $NAME - iteration $i"
done

# Conditionals
if [ -f "config.json" ]; then
  echo "Config file exists"
fi
\`\`\``}
      </Markdown>

      <h2>Test 3: JSON Code Block</h2>

      <p>The following JSON should have the language tag "json":</p>

      <Markdown>
{`\`\`\`json
{
  "name": "react-agentic",
  "version": "1.0.0",
  "dependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  }
}
\`\`\``}
      </Markdown>

      <h2>Test 4: Python Code Block</h2>

      <p>The following Python code should have the language tag "python":</p>

      <Markdown>
{`\`\`\`python
from typing import List, Dict

def process_data(items: List[Dict]) -> Dict:
    """Process a list of items and return aggregated results."""
    result = {
        "total": len(items),
        "sum": sum(item.get("value", 0) for item in items)
    }
    return result

# Using the function
data = [{"value": 10}, {"value": 20}, {"value": 30}]
print(process_data(data))
\`\`\``}
      </Markdown>

      <h2>Test 5: SQL Code Block</h2>

      <p>The following SQL should have the language tag "sql":</p>

      <Markdown>
{`\`\`\`sql
SELECT
  u.id,
  u.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 5
ORDER BY total_spent DESC;
\`\`\``}
      </Markdown>

      <h2>Test 6: Special Characters Preservation</h2>

      <p>
        The following code block contains special characters that should NOT be
        escaped or modified:
      </p>

      <Markdown>
{`\`\`\`typescript
// Special characters test
const regex = /[a-z]+\\d*$/i;
const template = \`Value: \\\${value}\`;
const operators = "< > & | ^ ~ ! @ # % * + = ?";
const escapes = "\\n \\t \\r \\\\ \\'";
const arrow = (x: number) => x * 2;
const nullish = value ?? "default";
const optional = user?.profile?.name;
\`\`\``}
      </Markdown>

      <h2>Test 7: Multi-line Preservation</h2>

      <p>
        The following code block should preserve all line breaks, indentation,
        and blank lines:
      </p>

      <Markdown>
{`\`\`\`typescript
class Example {
  private value: number;

  constructor(initial: number) {
    this.value = initial;
  }

  // Blank line above and below this method
  increment(): void {
    this.value++;
  }


  // Two blank lines above
  getValue(): number {
    return this.value;
  }
}
\`\`\``}
      </Markdown>

      <h2>Validation Instructions</h2>

      <p>
        After analyzing all code blocks above, respond with a YAML block
        confirming each test:
      </p>

      <Markdown>
{`\`\`\`yaml
status: SUCCESS
tests:
  typescript_block:
    has_language_tag: true/false
    language_tag_value: "typescript"
    code_preserved: true/false
  bash_block:
    has_language_tag: true/false
    language_tag_value: "bash"
    special_chars_intact: true/false  # $, quotes, etc.
  json_block:
    has_language_tag: true/false
    language_tag_value: "json"
    structure_valid: true/false
  python_block:
    has_language_tag: true/false
    language_tag_value: "python"
    indentation_preserved: true/false
  sql_block:
    has_language_tag: true/false
    language_tag_value: "sql"
    keywords_visible: true/false
  special_characters:
    regex_not_escaped: true/false
    template_literal_preserved: true/false
    operators_intact: true/false
  multiline_preservation:
    line_breaks_preserved: true/false
    blank_lines_preserved: true/false
    indentation_correct: true/false
code_blocks_rendering: PASSED/FAILED
timestamp: "ISO timestamp"
\`\`\``}
      </Markdown>
    </Skill>
  );
}
