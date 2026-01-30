# react-agentic

A TSX-to-Markdown compiler for authoring Claude Code commands and agents with full TypeScript support.

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
