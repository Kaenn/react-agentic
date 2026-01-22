/**
 * State Read Skill
 *
 * Reads state from JSON files in .state/ directory.
 * Usage: /react-agentic:state-read {key} [--field {path}]
 */

import { Skill, Markdown } from '../jsx.js';

export default function StateReadSkill() {
  return (
    <Skill
      name="state-read"
      description="Read state from .state/ JSON files. Use when a command needs to read persistent state values."
      allowedTools={['Read', 'Bash(node:*)', 'Bash(cat:*)', 'Bash(jq:*)']}
      argumentHint="{key} [--field {path}]"
    >
      <Markdown>{`
# State Read

Read state values from JSON files in the \`.state/\` directory.

## Arguments

- \`{key}\`: State key identifier (e.g., \`projectContext\`)
- \`--field {path}\`: Optional dot-notation path for nested field (e.g., \`config.debug\`)

## Process

1. Parse arguments from \`$ARGUMENTS\`
   - First argument is the state key
   - If \`--field\` flag present, next argument is the field path

2. Locate state file at \`.state/{key}.json\`
   - If file doesn't exist, return error JSON: \`{"error": "State not found", "key": "{key}"}\`

3. Read the JSON file content

4. If field path provided:
   - Navigate the JSON using dot-notation (e.g., \`config.debug\` -> obj.config.debug)
   - Return the field value as JSON

5. If no field path:
   - Return the entire state object as JSON

## Output Format

Always output valid JSON:

**Success (full state):**
\`\`\`json
{"name": "My Project", "phase": 2, "config": {"debug": true}}
\`\`\`

**Success (field read):**
\`\`\`json
true
\`\`\`

**Error:**
\`\`\`json
{"error": "State not found", "key": "projectContext"}
\`\`\`

## Example Usage

Read full state:
\`\`\`
/react-agentic:state-read projectContext
\`\`\`

Read specific field:
\`\`\`
/react-agentic:state-read projectContext --field phase
\`\`\`

Read nested field:
\`\`\`
/react-agentic:state-read projectContext --field config.debug
\`\`\`

## Implementation Notes

Use \`jq\` for JSON parsing when available:
\`\`\`bash
# Full state
cat .state/{key}.json

# Field read
cat .state/{key}.json | jq '.config.debug'
\`\`\`

Or use Node.js:
\`\`\`bash
node -e "
  const fs = require('fs');
  const data = JSON.parse(fs.readFileSync('.state/{key}.json', 'utf-8'));
  const field = '{path}';
  if (field) {
    const parts = field.split('.');
    let value = data;
    for (const part of parts) value = value?.[part];
    console.log(JSON.stringify(value));
  } else {
    console.log(JSON.stringify(data));
  }
"
\`\`\`
`}</Markdown>
    </Skill>
  );
}
