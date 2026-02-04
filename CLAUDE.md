# react-agentic

A TSX-to-Markdown compiler for authoring Claude Code commands and agents with full TypeScript support.

## GSD Style Guide

This project uses [GSD (Get Shit Done)](GSD-STYLE.md) as its primary style and convention reference. All contributions must follow GSD conventions.

**Key constraints from GSD:**

- **Imperative voice** — "Execute tasks", not "Execution is performed"
- **No filler** — Avoid "Let me", "Just", "Simply", "Basically"
- **No sycophancy** — No "Great!", "Awesome!", "I'd be happy to help"
- **Semantic XML tags** — Use `<objective>`, `<process>`, not generic `<section>`, `<item>`
- **Temporal language banned** — Describe current state only (except changelogs/commits)
- **No enterprise patterns** — No story points, sprint ceremonies, time estimates
- **Context engineering** — Keep plans small (2-3 tasks), split aggressively
- **Atomic commits** — One commit per task, stage files individually

See [GSD-STYLE.md](GSD-STYLE.md) for complete conventions including file structure, naming, task structure, commit format, and anti-patterns.

## Documentation

> **IMPORTANT:** Keep documentation up to date when features change. These docs teach patterns that users follow — outdated docs lead to incorrect usage.

Full documentation lives in [`docs/`](docs/README.md).

### Documentation Index

| Doc | Description | Key Topics |
|-----|-------------|------------|
| [Philosophy](docs/philosophy.md) | Core concepts and design rationale | Build-time vs runtime, type safety across boundaries |
| [Getting Started](docs/getting-started.md) | Installation and first command | Project structure, basic usage |
| [Command](docs/command.md) | Building slash commands | Props, XmlBlock, render props pattern |
| [Agent](docs/agent.md) | Building spawnable agents | Input/output contracts, BaseOutput, structured returns |
| [Communication](docs/communication.md) | Command ↔ Agent data flow | SpawnAgent, useOutput, OnStatus |
| [Runtime System](docs/runtime.md) | TypeScript at execution time | `useRuntimeVar<T>`, `runtimeFn`, `.Call` pattern |
| [Control Flow](docs/control-flow.md) | Conditionals and iteration | If/Else, Loop/Break, Return, AskUser |
| [Structured Components](docs/structured-components.md) | Data-driven components | Table, List with array props |
| [Semantic Components](docs/semantic-components.md) | Workflow-specific sections | ExecutionContext |
| [Grammar Specification](docs/grammar.md) | Formal grammar reference | EBNF syntax, element props, nesting rules, V1/V3 matrix |

### Internal Documentation

Internal architecture and future features are in `claudedocs/`:

| Location | Contents |
|----------|----------|
| `claudedocs/architecture/` | Build pipeline, compiler internals |
| `claudedocs/proposals/` | Future feature designs (MCP Apps) |
| `claudedocs/to-integrate/` | Features with code but not yet exported (State, Skill, MCP Config) |

## Quick Start

```bash
# Build the compiler
npm run build

# Build a command/agent
node dist/cli/index.js build "src/app/my-command.tsx"

# Watch mode
npm run watch
```

## Project Structure

```
src/
├── app/           # Commands and agents (your code goes here)
├── cli/           # CLI entry and commands
├── parser/        # TSX parsing and transformation
├── ir/            # Intermediate representation nodes
├── emitter/       # Markdown emission
├── jsx.ts         # Component exports
└── index.ts       # Library exports

docs/              # User-facing documentation
claudedocs/        # Internal/future documentation

.claude/
├── commands/      # Generated command markdown
└── agents/        # Generated agent markdown
```

## Component Summary

### Core Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Command>` | Slash command | `/deploy`, `/migrate` |
| `<Agent>` | Spawnable worker | `test-runner`, `code-reviewer` |
| `<SpawnAgent>` | Spawn agent from command | Emits `Task()` syntax |
| `<Markdown>` | Inline content | Free-form markdown |
| `<XmlBlock>` | Structured section | `<objective>`, `<process>` |
| `<Table>` | Markdown tables | `<Table headers={[...]} rows={[...]} />` |
| `<List>` | Bullet/numbered lists | `<List items={[...]} />` |

### Runtime Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `useRuntimeVar<T>()` | Typed runtime variable | `const ctx = useRuntimeVar<Result>('CTX')` |
| `runtimeFn()` | Wrap function for runtime | `const Fn = runtimeFn(myFunction)` |
| `<Fn.Call>` | Invoke runtime function | `<Fn.Call args={{...}} output={ctx} />` |

### Control Flow

| Component | Purpose | Example |
|-----------|---------|---------|
| `<If>` / `<Else>` | Conditional blocks | `<If condition={ctx.error}>...</If>` |
| `<Loop>` / `<Break>` | Bounded iteration | `<Loop max={5}>...</Loop>` |
| `<Return>` | Early exit | `<Return status="SUCCESS" />` |
| `<AskUser>` | Interactive prompt | `<AskUser question="..." options={[...]} />` |

### Semantic Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<ExecutionContext>` | @ file references | `<ExecutionContext paths={["file.md"]} />` |

## Design Pattern: Components vs Factory Functions

When adding new features, choose between JSX components and factory functions based on what the feature represents:

### Components — For Content Definition

Use JSX components when the feature **creates a file** with markdown content:

```tsx
// <Agent> creates .claude/agents/reviewer.md with body content
<Agent name="reviewer" description="Code reviewer">
  Review the code for security issues...
</Agent>

// <Command> creates .claude/commands/deploy.md with body content
<Command name="deploy" description="Deploy to production">
  Execute deployment steps...
</Command>
```

**Characteristics:**
- Has children (content body)
- Creates an output file
- Defines structure AND content

### Factory Functions — For References

Use factory functions when the feature **creates a reference** to something defined elsewhere or to a Claude Code primitive:

```tsx
// defineAgent() creates a reference to an agent file
const Reviewer = defineAgent({ name: 'reviewer', path: './reviewer.md' });
<SpawnAgent agent={Reviewer} ... />

// defineTask() creates a reference to a Claude Code task primitive
const Research = defineTask('research', 'Research best practices');
<TaskDef task={Research} description="..." />
```

**Characteristics:**
- Returns a typed ref object (e.g., `AgentRef`, `TaskRef`)
- No content body — metadata only
- Used as prop value in components
- Enables cross-file type safety

### Decision Matrix

| Question | Component | Factory |
|----------|-----------|---------|
| Does it have markdown content? | ✅ | ❌ |
| Does it create a file? | ✅ | ❌ |
| Is it a reference to something else? | ❌ | ✅ |
| Is it a Claude Code primitive (Task, Team)? | ❌ | ✅ |
| Does it need cross-file type safety? | Maybe | ✅ |

### Examples by Feature

| Feature | Component | Factory | Rationale |
|---------|-----------|---------|-----------|
| Agent definition | `<Agent>` | — | Has content, creates file |
| Agent reference | — | `defineAgent()` | Reference for spawning |
| Command | `<Command>` | — | Has content, creates file |
| Task reference | — | `defineTask()` | Claude Code primitive, no content |
| Team reference | — | `defineTeam()` | Claude Code primitive, no content |
| Task display | `<TaskDef>` | — | Renders task in markdown |
| Runtime variable | — | `useRuntimeVar()` | Reference to runtime value |

### Naming Conventions

- **Components**: PascalCase, noun-based (`<Agent>`, `<TaskDef>`, `<Team>`)
- **Factories**: camelCase, verb-prefixed (`defineAgent()`, `defineTask()`, `useRuntimeVar()`)

## Claude Code Variable Patterns

When emitting markdown for Claude Code, use simple variable reference patterns instead of explicit bash/jq commands. Claude Code understands variable filling patterns directly from its context (memory) and will resolve them without needing functional bash commands.

### Pattern Format

```
$VARIABLE_NAME.property.nested_property
```

### Examples

**Simple variable reference:**
```
prompt=$RESEARCHER_PROMPT
```
Claude Code will fill this with the value of `$RESEARCHER_PROMPT` from its context.

**Property access:**
```
$CTX.phase_id
$RESULT.data.items
```
Claude Code understands dot notation to access nested properties.

**String concatenation in prompts:**
```
prompt="Instructions: " + $RESEARCHER_PROMPT
```
Claude Code will concatenate the static string with the variable value.

### Why Not jq/bash Commands?

Avoid generating explicit bash commands like:
```bash
# DON'T do this
$(echo "$CTX" | jq -r '.phase_id')
```

This is unnecessarily complex. Claude Code doesn't execute these as bash — it recognizes the variable pattern and fills it from context. Simple notation like `$CTX.phase_id` achieves the same result and is clearer.
