# Meta-Prompting

Meta-prompting components enable Claude Code commands and agents to dynamically gather project context at runtime. This is the foundation for building commands that adapt to the current state of your project.

## Overview

Meta-prompting follows a three-stage pattern:

1. **Gather** - Read files into shell variables
2. **Compose** - Combine context into structured sections
3. **Use** - Reference context in prompts and instructions

```tsx
<MetaPrompt>
  <GatherContext>
    <ReadFile path=".planning/STATE.md" as="STATE" />
    <ReadFile path=".planning/REQUIREMENTS.md" as="REQS" optional />
  </GatherContext>

  <ComposeContext title="Project State">
    {`${STATE}\n\n${REQS}`}
  </ComposeContext>
</MetaPrompt>
```

## Components

### ReadFile (Primitive)

Read a single file into a shell variable at runtime.

```tsx
import { ReadFile } from 'react-agentic';

// Required file - command fails if missing
<ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />

// Optional file - silently empty if missing
<ReadFile path=".planning/CONTEXT.md" as="CONTEXT" optional />

// Dynamic path with shell variable
<ReadFile path="${PHASE_DIR}/PLAN.md" as="PLAN_CONTENT" />
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | Yes | File path (may include shell variables) |
| `as` | `string` | Yes | Shell variable name for content |
| `optional` | `boolean` | No | Suppress error if file missing |

**Output:**

```bash
# Required file
STATE_CONTENT=$(cat .planning/STATE.md)

# Optional file
CONTEXT=$(cat .planning/CONTEXT.md 2>/dev/null)

# Path with variable
PLAN_CONTENT=$(cat "${PHASE_DIR}/PLAN.md")
```

### GatherContext (Composite)

Semantic wrapper for grouping ReadFile components. Pure organizational - no output, just returns children.

```tsx
import { GatherContext, ReadFile } from 'react-agentic';
import { GatherContext } from 'react-agentic/composites/meta-prompting';

<GatherContext>
  <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
  <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
  <ReadFile path=".planning/CONTEXT.md" as="CONTEXT" optional />
</GatherContext>
```

### ComposeContext (Composite)

Wrap gathered content in an XML block with optional title.

```tsx
import { ComposeContext } from 'react-agentic/composites/meta-prompting';

<ComposeContext title="Project State">
  {`Current state:\n${STATE_CONTENT}`}
</ComposeContext>
```

**Output:**

```xml
<context title="Project State">
Current state:
[STATE_CONTENT value here]
</context>
```

### MetaPrompt (Composite)

Top-level container for meta-prompting patterns. Pure organizational wrapper.

```tsx
import { MetaPrompt, GatherContext, ComposeContext } from 'react-agentic/composites/meta-prompting';
import { ReadFile } from 'react-agentic';

<MetaPrompt>
  <GatherContext>
    <ReadFile path=".planning/STATE.md" as="STATE" />
  </GatherContext>

  <h2>Current Context</h2>
  <ComposeContext title="State">{STATE}</ComposeContext>
</MetaPrompt>
```

### InlineField (Composite)

Emit a labeled field for single values.

```tsx
import { InlineField } from 'react-agentic/composites/meta-prompting';

<InlineField name="Phase">{CURRENT_PHASE}</InlineField>
// Output: **Phase:** [CURRENT_PHASE value]
```

### Preamble (Composite)

Emit a blockquote-styled preamble note.

```tsx
import { Preamble } from 'react-agentic/composites/meta-prompting';

<Preamble>
This command requires .planning/ directory to exist.
</Preamble>
// Output: > This command requires .planning/ directory to exist.
```

## GSD-Style Context Composition

The meta-prompting pattern is inspired by GSD (Get Shit Done) orchestration, where commands dynamically load project state before executing.

### Complete Example

```tsx
import { Command, ReadFile, XmlBlock } from 'react-agentic';
import {
  MetaPrompt,
  GatherContext,
  ComposeContext,
  InlineField,
  Preamble
} from 'react-agentic/composites/meta-prompting';

export default function PlanExecutor() {
  return (
    <Command
      name="execute-plan"
      description="Execute current phase plan"
    >
      <MetaPrompt>
        <Preamble>
          Executes the next plan in the current phase.
        </Preamble>

        <GatherContext>
          <ReadFile path=".planning/STATE.md" as="STATE" />
          <ReadFile path=".planning/PROJECT.md" as="PROJECT" optional />
        </GatherContext>

        <h2>Project Context</h2>
        <ComposeContext title="Current State">
          {STATE}
        </ComposeContext>

        <XmlBlock name="objective">
          <p>Execute the next plan based on current project state.</p>
        </XmlBlock>
      </MetaPrompt>
    </Command>
  );
}
```

### Dynamic Phase Loading

For multi-phase workflows, use shell variable interpolation:

```tsx
<MetaPrompt>
  <GatherContext>
    {/* Base state */}
    <ReadFile path=".planning/STATE.md" as="STATE" />

    {/* Phase-specific files use variable from STATE */}
    <ReadFile path="${PHASE_DIR}/CONTEXT.md" as="PHASE_CONTEXT" optional />
    <ReadFile path="${PHASE_DIR}/${PLAN_FILE}" as="PLAN" />
  </GatherContext>

  <ComposeContext title="Phase ${PHASE_NUMBER}">
    {`${PHASE_CONTEXT}\n\n${PLAN}`}
  </ComposeContext>
</MetaPrompt>
```

## Error Handling

### Required vs Optional Files

- **Required files** (`optional` not set or `false`): Command fails immediately if file doesn't exist
- **Optional files** (`optional={true}` or just `optional`): Variable is empty string if file missing

```tsx
// This fails if STATE.md missing
<ReadFile path=".planning/STATE.md" as="STATE" />

// This silently continues with empty CONTEXT
<ReadFile path=".planning/CONTEXT.md" as="CONTEXT" optional />
```

### Path Quoting

Paths containing `$` (shell variables) or spaces are automatically quoted in the output:

```tsx
<ReadFile path="${DIR}/file.md" as="CONTENT" />
// Output: CONTENT=$(cat "${DIR}/file.md")

<ReadFile path="my file.md" as="CONTENT" />
// Output: CONTENT=$(cat "my file.md")
```

## Best Practices

1. **Group related files** - Use GatherContext to visually group file reads
2. **Use semantic variable names** - `STATE`, `CONTEXT`, `PLAN` not `FILE1`, `FILE2`
3. **Mark optional files explicitly** - Don't assume files exist
4. **Structure context with ComposeContext** - Claude understands XML structure better
5. **Use Preamble for notes** - Distinguish setup notes from actual instructions

## Import Paths

```tsx
// Primitive (from main package)
import { ReadFile } from 'react-agentic';

// Composites (from subpath export)
import {
  MetaPrompt,
  GatherContext,
  ComposeContext,
  InlineField,
  Preamble
} from 'react-agentic/composites/meta-prompting';
```

## See Also

- [Primitives](./primitives.md) - Core compiler-owned components
- [Composites](./composites.md) - User-definable component wrappers
- [Grammar Specification](./grammar.md) - Full component reference
