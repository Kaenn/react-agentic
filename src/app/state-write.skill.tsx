/**
 * State Write Skill
 *
 * Writes state to JSON files in .state/ directory.
 * Usage: /react-agentic:state-write {key} --field {path} --value {val}
 *    OR: /react-agentic:state-write {key} --merge '{json}'
 */

import { Skill, Markdown } from '../jsx.js';

export default function StateWriteSkill() {
  return (
    <Skill
      name="state-write"
      description="Write state to .state/ JSON files. Use when a command needs to persist state values."
      allowedTools={['Read', 'Write', 'Bash(node:*)', 'Bash(mkdir:*)']}
      argumentHint="{key} --field {path} --value {val} | --merge '{json}'"
    >
      <Markdown>{`
# State Write

Write state values to JSON files in the \`.state/\` directory.

## Arguments

**Field mode:**
- \`{key}\`: State key identifier
- \`--field {path}\`: Dot-notation path for the field to write
- \`--value {val}\`: Value to write (JSON or string)

**Merge mode:**
- \`{key}\`: State key identifier
- \`--merge '{json}'\`: JSON object to shallow merge into state

## Process

1. Parse arguments from \`$ARGUMENTS\`
   - First argument is the state key
   - Detect mode: \`--field\` for field mode, \`--merge\` for merge mode

2. Ensure \`.state/\` directory exists:
   \`\`\`bash
   mkdir -p .state
   \`\`\`

3. Read existing state from \`.state/{key}.json\`
   - If file doesn't exist, start with empty object \`{}\`

4. **Field mode:**
   - Parse the field path (e.g., \`config.debug\` -> ['config', 'debug'])
   - Navigate/create intermediate objects
   - Set the value at the final path

5. **Merge mode:**
   - Parse the merge JSON object
   - Shallow merge: \`{ ...existingState, ...mergeObject }\`

6. Write updated state to \`.state/{key}.json\` with pretty formatting (2-space indent)

## Output Format

On success, output the updated state:

\`\`\`json
{"name": "Updated", "phase": 2, "config": {"debug": true}}
\`\`\`

On error:

\`\`\`json
{"error": "Invalid JSON in merge value", "input": "..."}
\`\`\`

## Example Usage

Write single field:
\`\`\`
/react-agentic:state-write projectContext --field phase --value 2
\`\`\`

Write nested field:
\`\`\`
/react-agentic:state-write projectContext --field config.debug --value true
\`\`\`

Write string value:
\`\`\`
/react-agentic:state-write projectContext --field name --value "My Project"
\`\`\`

Merge partial update:
\`\`\`
/react-agentic:state-write projectContext --merge '{"name": "New Name", "phase": 3}'
\`\`\`

## Implementation

Use Node.js for reliable JSON handling:

**Field write:**
\`\`\`bash
node -e "
  const fs = require('fs');
  const path = '.state/{key}.json';

  // Read existing or start empty
  let data = {};
  try { data = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}

  // Set nested value
  const field = '{field_path}'.split('.');
  let obj = data;
  for (let i = 0; i < field.length - 1; i++) {
    if (!(field[i] in obj)) obj[field[i]] = {};
    obj = obj[field[i]];
  }
  obj[field[field.length - 1]] = {value};

  // Write back
  fs.mkdirSync('.state', { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data));
"
\`\`\`

**Merge write:**
\`\`\`bash
node -e "
  const fs = require('fs');
  const path = '.state/{key}.json';

  // Read existing or start empty
  let data = {};
  try { data = JSON.parse(fs.readFileSync(path, 'utf-8')); } catch {}

  // Merge
  const merge = {merge_json};
  data = { ...data, ...merge };

  // Write back
  fs.mkdirSync('.state', { recursive: true });
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data));
"
\`\`\`

## Notes

- Creates \`.state/\` directory if it doesn't exist
- Creates state file with empty object if it doesn't exist
- Field write creates intermediate objects as needed
- Merge is shallow (top-level keys only)
- Always outputs pretty JSON (2-space indent) for readability
`}</Markdown>
    </Skill>
  );
}
