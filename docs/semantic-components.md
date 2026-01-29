# Semantic Components

Semantic components emit structured XML sections that follow Claude Code workflow patterns.

## ExecutionContext

Emit `<execution_context>` section with @ file references.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `string[]` | Yes | File paths to reference |
| `prefix` | `string` | No | Prefix for paths (default: "@") |

### Basic Usage

```tsx
import { ExecutionContext } from 'react-agentic';

<ExecutionContext paths={[
  "docs/guide.md",
  "src/config.ts",
  ".planning/PROJECT.md"
]} />
```

Emits:

```markdown
<execution_context>
@docs/guide.md
@src/config.ts
@.planning/PROJECT.md
</execution_context>
```

### Custom Prefix

```tsx
<ExecutionContext
  paths={["file1.md", "file2.md"]}
  prefix="->"
/>
```

Emits:

```markdown
<execution_context>
->file1.md
->file2.md
</execution_context>
```

### Why ExecutionContext?

Manually writing file references is error-prone:

```tsx
// Manual approach - typos, inconsistent formatting
<XmlBlock name="execution_context">
  <Markdown>{`@docs/guide.md
@ src/config.ts
.planning/PROJECT.md`}</Markdown>
</XmlBlock>
```

ExecutionContext ensures:
- Consistent prefix application
- No double-prefixing if path already starts with prefix
- Type-safe array of paths

## Using XmlBlock for Custom Sections

For sections not covered by semantic components, use `XmlBlock`:

```tsx
import { XmlBlock } from 'react-agentic';

<XmlBlock name="objective">
  <p>Complete the deployment process</p>
</XmlBlock>
```

Emits:

```markdown
<objective>
Complete the deployment process
</objective>
```

### Common Section Names

| Section | Purpose |
|---------|---------|
| `objective` | What the command/agent should accomplish |
| `process` | Step-by-step instructions |
| `role` | Agent's persona and responsibilities |
| `returns` | Expected output format |
| `constraints` | Rules and limitations |

## See Also

- [Command](./command.md) - Building slash commands
- [Agent](./agent.md) - Building spawnable agents
- [Structured Components](./structured-components.md) - Table and List components
