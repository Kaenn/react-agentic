# Command

Commands are slash-invocable actions in Claude Code. They define what Claude should do when a user types `/your-command`.

## Basic Structure

```tsx
import { Command, Markdown, XmlBlock } from 'react-agentic';

export default function MyCommand() {
  return (
    <Command
      name="command-name"
      description="What this command does"
      allowedTools={['Bash', 'Read', 'Write']}
    >
      {/* Command body */}
    </Command>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | ✓ | Command identifier (used as `/name`) |
| `description` | string | ✓ | Shown in command list |
| `allowedTools` | string[] | | Tools the command can use |
| `argumentHint` | string | | Shows usage hint (e.g., `[filename]`) |
| `agent` | string | | Default agent to use |

## Example: Database Migration Command

A practical command that helps manage database migrations:

```tsx
import { Command, XmlBlock, Markdown } from 'react-agentic';

export default function MigrateCommand() {
  return (
    <Command
      name="db-migrate"
      description="Run or create database migrations"
      argumentHint="[up|down|create <name>]"
      allowedTools={['Bash', 'Read', 'Write']}
    >
      <XmlBlock name="objective">
        <Markdown>{`Manage database migrations for the project.

**Actions:**
- \`up\` — Run pending migrations
- \`down\` — Rollback last migration
- \`create <name>\` — Create new migration file`}</Markdown>
      </XmlBlock>

      <XmlBlock name="context">
        <Markdown>{`Migrations directory: \`./migrations/\`
Database config: \`./config/database.json\`

Migration file format: \`YYYYMMDD_HHMMSS_<name>.sql\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <Markdown>{`## 1. Parse Arguments

Extract action from $ARGUMENTS:
- If empty or "up" → run pending migrations
- If "down" → rollback last migration
- If "create <name>" → create new migration

## 2. For "up" Action

\`\`\`bash
# List pending migrations
ls ./migrations/*.sql | sort
\`\`\`

For each pending migration:
1. Read the SQL file
2. Execute against database
3. Record in migrations table

## 3. For "down" Action

\`\`\`bash
# Get last applied migration
ls ./migrations/*.sql | sort | tail -1
\`\`\`

1. Read the down section of migration
2. Execute rollback SQL
3. Remove from migrations table

## 4. For "create" Action

\`\`\`bash
# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
\`\`\`

Create file: \`./migrations/\${TIMESTAMP}_<name>.sql\`

Template:
\`\`\`sql
-- Up Migration
CREATE TABLE ...;

-- Down Migration
DROP TABLE ...;
\`\`\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <Markdown>{`- [ ] Action parsed correctly
- [ ] Migrations executed in order
- [ ] Errors reported clearly
- [ ] Migration state updated`}</Markdown>
      </XmlBlock>
    </Command>
  );
}
```

## Output

This compiles to `.claude/commands/db-migrate.md`:

```markdown
---
name: db-migrate
description: Run or create database migrations
argument-hint: '[up|down|create <name>]'
allowed-tools:
  - Bash
  - Read
  - Write
---

<objective>
Manage database migrations for the project.
...
</objective>

<context>
Migrations directory: `./migrations/`
...
</context>

<process>
## 1. Parse Arguments
...
</process>

<success_criteria>
- [ ] Action parsed correctly
...
</success_criteria>
```

## Using XmlBlock vs Markdown

Use `<XmlBlock>` for structured sections that Claude should recognize:

```tsx
<XmlBlock name="objective">
  <Markdown>{`Your objective content`}</Markdown>
</XmlBlock>
```

Use `<Markdown>` directly for free-form content:

```tsx
<Markdown>{`## Some Heading

Free-form markdown content here.`}</Markdown>
```

## Render Props Pattern

Commands support a render props pattern for accessing command context within the component body:

```tsx
import { Command } from 'react-agentic';

export default function MyCommand() {
  return (
    <Command name="example" description="Demonstrates render props">
      {(ctx) => (
        <>
          <p>Command name: {ctx.name}</p>
          <p>Description: {ctx.description}</p>
          <p>Output will be written to: {ctx.outputPath}</p>
          <p>Source file: {ctx.sourcePath}</p>
        </>
      )}
    </Command>
  );
}
```

### Available Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Command name (from name prop) |
| `description` | `string` | Command description (from description prop) |
| `outputPath` | `string` | Absolute path where markdown will be written |
| `sourcePath` | `string` | Absolute path to the source .tsx file |
| `skill` | `string \| undefined` | Skill name if command uses skill system |

### Use Cases

**Dynamic documentation:**

```tsx
<Command name="deploy" description="Deploy to production">
  {(ctx) => (
    <>
      <p>This command ({ctx.name}) will deploy your application.</p>
      <p>Generated from: {ctx.sourcePath}</p>
    </>
  )}
</Command>
```

**Conditional logic based on output path:**

```tsx
<Command name="multi-env" description="Environment-aware command">
  {(ctx) => {
    const isProd = ctx.outputPath.includes('production');
    return (
      <>
        {isProd ? (
          <p>⚠️ Running in production mode</p>
        ) : (
          <p>Running in development mode</p>
        )}
      </>
    );
  }}
</Command>
```

**Note:** The render props pattern is optional. Standard JSX children work exactly as before:

```tsx
<Command name="simple" description="Standard approach">
  <p>Direct children work fine</p>
</Command>
```

## Tips

1. **Be specific in process steps** — Claude follows them literally
2. **Include bash examples** — Show exact commands to run
3. **Use success criteria** — Helps Claude know when it's done
4. **Keep scope focused** — One command = one responsibility
