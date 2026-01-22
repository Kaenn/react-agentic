# Skill Component

Build Claude Code skills with TSX for type-safe, compile-time validated skill definitions.

## Quick Start

```tsx
import { Skill, Markdown } from 'react-agentic';

export default function MySkill() {
  return (
    <Skill
      name="my-skill"
      description="What this skill does. Use when the user asks to..."
    >
      <Markdown>{`
# My Skill

Instructions for Claude...
`}</Markdown>
    </Skill>
  );
}
```

Build:
```bash
npx react-agentic build src/app/my-skill.tsx
# Output: .claude/skills/my-skill/SKILL.md
```

## Props

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Skill directory name (lowercase, numbers, hyphens) |
| `description` | `string` | What the skill does and when to use it |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `disableModelInvocation` | `boolean` | `false` | Prevent Claude from auto-invoking |
| `userInvocable` | `boolean` | `true` | Show in slash-command menu |
| `allowedTools` | `string[]` | `[]` | Tools allowed without permission |
| `argumentHint` | `string` | - | Placeholder hint (e.g., `[filename]`) |
| `model` | `string` | - | Model override |
| `context` | `'fork'` | - | Run in subagent |
| `agent` | `string` | - | Subagent type when context='fork' |

## SkillFile Component

Generate additional files in the skill directory.

```tsx
<Skill name="deploy" description="...">
  {/* Main SKILL.md content */}
  <Markdown>...</Markdown>

  {/* Additional file: .claude/skills/deploy/reference.md */}
  <SkillFile name="reference.md">
    <Markdown>{`# Reference documentation...`}</Markdown>
  </SkillFile>

  {/* Nested path: .claude/skills/deploy/examples/basic.md */}
  <SkillFile name="examples/basic.md">
    <Markdown>{`# Basic example...`}</Markdown>
  </SkillFile>
</Skill>
```

### SkillFile Props

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Output filename (supports paths like `examples/basic.md`) |
| `children` | `ReactNode` | File content |

## SkillStatic Component

Copy static files from your source to the skill directory.

```tsx
<Skill name="deploy" description="...">
  <Markdown>...</Markdown>

  {/* Copy scripts/deploy.sh to .claude/skills/deploy/scripts/deploy.sh */}
  <SkillStatic src="scripts/deploy.sh" />

  {/* Copy with different destination */}
  <SkillStatic src="templates/config.json" dest="config.json" />
</Skill>
```

### SkillStatic Props

| Prop | Type | Description |
|------|------|-------------|
| `src` | `string` | Source path relative to TSX file |
| `dest` | `string` | Destination path (defaults to `src`) |

## Output Structure

A skill with all features:

```tsx
<Skill name="deploy" ...>
  <Markdown>Main content</Markdown>
  <SkillFile name="reference.md">...</SkillFile>
  <SkillFile name="examples/basic.md">...</SkillFile>
  <SkillStatic src="scripts/deploy.sh" />
</Skill>
```

Produces:

```
.claude/skills/deploy/
├── SKILL.md              # Main skill file (from Skill children)
├── reference.md          # From SkillFile
├── examples/
│   └── basic.md          # From SkillFile with path
└── scripts/
    └── deploy.sh         # From SkillStatic
```

## Frontmatter Format

The generated SKILL.md uses Claude Code's required format:

```yaml
---
name: deploy
description: Deploy the application. Use when user asks to deploy...
disable-model-invocation: true
allowed-tools:
  - Read
  - Bash(git:*)
argument-hint: '[environment]'
---
```

Note: Props use camelCase in TSX (`disableModelInvocation`) but emit as kebab-case in YAML (`disable-model-invocation`).

## Variables in Skills

Use `$ARGUMENTS` to access user-provided arguments:

```tsx
<Skill
  name="search"
  description="Search codebase"
  argumentHint="[query]"
>
  <Markdown>{`
Search for: $ARGUMENTS

Use Grep to find matches...
`}</Markdown>
</Skill>
```

## Complete Example

```tsx
import { Skill, SkillFile, SkillStatic, Markdown } from 'react-agentic';

export default function DeploySkill() {
  return (
    <Skill
      name="deploy"
      description="Deploy the application to production. Use when the user asks to deploy, release, or publish code."
      disableModelInvocation={true}
      allowedTools={['Read', 'Bash(git:*)', 'Bash(npm:*)']}
      argumentHint="[environment]"
    >
      <h1>Deploy</h1>

      <Markdown>{`
## Process

1. Validate environment: $ARGUMENTS
2. Run tests
3. Build application
4. Deploy

## Reference

See [reference.md](reference.md) for environment details.
`}</Markdown>

      <SkillFile name="reference.md">
        <Markdown>{`
# Deployment Reference

## Environments

| Name | URL |
|------|-----|
| staging | staging.example.com |
| production | example.com |
`}</Markdown>
      </SkillFile>

      <SkillStatic src="scripts/deploy.sh" />
      <SkillStatic src="scripts/validate.sh" />
    </Skill>
  );
}
```

## Best Practices

1. **Descriptive names**: Use clear, action-oriented names (`deploy`, `test`, `migrate`)
2. **Detailed descriptions**: Explain what the skill does AND when to use it
3. **Tool restrictions**: List only necessary tools in `allowedTools`
4. **Organize with SkillFile**: Split long reference material into separate files
5. **Use SkillStatic for scripts**: Keep complex bash scripts as separate files

## See Also

- [Command Component](./command.md) - Slash commands
- [Agent Component](./agent.md) - Spawnable agents
- [Variables](./variables.md) - Shell variable handling
