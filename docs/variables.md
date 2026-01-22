# Variables

Variables let you capture dynamic values at runtime and use them throughout your commands. This enables shell-level state management using `useVariable` hook and `<Assign>` component.

## Basic Structure

```tsx
import { Command, Assign, useVariable } from '../jsx.js';

// Declare variable reference
const timestamp = useVariable<string>("TIMESTAMP");

export default function MyCommand() {
  return (
    <Command name="my-command" description="Uses variables">
      {/* Emit the variable assignment with bash command */}
      <Assign var={timestamp} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />

      {/* Use the variable in shell commands */}
      <pre><code className="language-bash">
echo "Time: $TIMESTAMP"
      </code></pre>
    </Command>
  );
}
```

## useVariable Hook

Declares a shell variable reference. The actual assignment is specified on `<Assign>`.

```tsx
// Declare variable references
const phaseDir = useVariable<string>("PHASE_DIR");
const outputFile = useVariable<string>("OUTPUT_FILE");
```

### Signature

```tsx
function useVariable<T = string>(name: string): VariableRef<T>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Shell variable name (e.g., `"PHASE_DIR"`) |

### Returns

`VariableRef<T>` with:
- `name`: The variable name
- `ref`: Same as name (for string interpolation)

## Assign Component

Emits the actual variable assignment as a bash code block. You specify **how** to assign the value here.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `var` | VariableRef | Yes | Variable from `useVariable` |
| `bash` | string | One of | Bash command to capture output: `VAR=$(command)` |
| `value` | string | One of | Static value: `VAR=value` |
| `env` | string | One of | Environment variable: `VAR=$ENV` |

**Note:** Exactly one of `bash`, `value`, or `env` must be provided.

### Examples

```tsx
const phaseDir = useVariable("PHASE_DIR");
const outputFile = useVariable("OUTPUT_FILE");
const phase = useVariable("PHASE");

// Bash command - capture output
<Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1`} />
// Outputs: PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)

// Static value
<Assign var={outputFile} value="/tmp/output/result.md" />
// Outputs: OUTPUT_FILE=/tmp/output/result.md

// Environment variable
<Assign var={phase} env="PHASE_NUMBER" />
// Outputs: PHASE=$PHASE_NUMBER
```

### Output

For bash assignments:
```markdown
```bash
PHASE_DIR=$(ls -d .planning/phases/${PHASE}-* 2>/dev/null | head -1)
```​
```

For static values:
```markdown
```bash
OUTPUT_FILE=/tmp/output/result.md
```​
```

For environment variables:
```markdown
```bash
PHASE=$PHASE_NUMBER
```​
```

Values with spaces are automatically quoted:
```markdown
```bash
MESSAGE="Hello World"
```​
```

## Example: Orchestrator Command

A practical command that generates a timestamp and passes it to a spawned agent:

```tsx
import { Command, XmlBlock, SpawnAgent, Assign, useVariable } from '../jsx.js';
import type { AgentInput } from './my-agent.js';

// Declare variables at module level (outside component)
const commandTimestamp = useVariable<string>("COMMAND_TIMESTAMP");
const outputFile = useVariable<string>("OUTPUT_FILE");

export default function OrchestratorCommand() {
  return (
    <Command
      name="orchestrate"
      description="Orchestrates work with timestamp tracking"
      allowedTools={['Read', 'Write', 'Bash', 'Task']}
    >
      <XmlBlock name="process">
        <h2>Step 1: Setup</h2>
        <p>Create output directory and capture timestamp:</p>
        <pre><code className="language-bash">
mkdir -p /tmp/gsd-test
        </code></pre>

        {/* Emit variable assignments */}
        <Assign var={commandTimestamp} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />
        <Assign var={outputFile} value="/tmp/gsd-test/agent-result.md" />

        <h2>Step 2: Spawn Agent</h2>
        <SpawnAgent<AgentInput>
          agent="my-agent"
          model="haiku"
          description="Process with timestamp"
          prompt={`<input>
**Timestamp:** {command_timestamp}
</input>

<output>
Write result to: {output_file}
</output>`}
        />

        <h2>Step 3: Verify</h2>
        <p>Read the output file:</p>
        <pre><code className="language-bash">
cat "$OUTPUT_FILE"
        </code></pre>
      </XmlBlock>
    </Command>
  );
}
```

## Output

This compiles to `.claude/commands/orchestrate.md`:

```markdown
---
name: orchestrate
description: Orchestrates work with timestamp tracking
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
---

<process>
## Step 1: Setup

Create output directory and capture timestamp:

```bash
mkdir -p /tmp/gsd-test
```

```bash
COMMAND_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
```

```bash
OUTPUT_FILE=/tmp/gsd-test/agent-result.md
```

## Step 2: Spawn Agent

Task(
  prompt="<input>\n**Timestamp:** {command_timestamp}\n</input>\n\n<output>\nWrite result to: {output_file}\n</output>",
  subagent_type="my-agent",
  model="haiku",
  description="Process with timestamp"
)

## Step 3: Verify

Read the output file:

```bash
cat "$OUTPUT_FILE"
```
</process>
```

## Variable Interpolation in Prompts

When using variables in `SpawnAgent` prompts, use the `{variable_name}` syntax (lowercase with underscores). Claude Code interpolates these at runtime:

```tsx
const phaseNumber = useVariable("PHASE_NUMBER");

<Assign var={phaseNumber} bash={`echo 5`} />

<SpawnAgent
  prompt={`Process phase {phase_number}`}  // Uses {phase_number}
  ...
/>
```

The variable name is converted: `PHASE_NUMBER` → `{phase_number}`

## Tips

1. **Declare variables at module level** — Outside the component function, so they're available throughout

2. **Place `<Assign>` before usage** — Variables must be assigned before shell commands reference them

3. **Use descriptive names** — `COMMAND_TIMESTAMP` is clearer than `TS`

4. **Use `bash` for dynamic values** — When the value needs to be computed at runtime

5. **Use `value` for constants** — For paths and configuration that don't change

6. **Use `env` for environment access** — When you need to read from the environment
