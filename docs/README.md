# Documentation

This folder contains the documentation for react-agentic, a TSX-to-Markdown compiler for Claude Code commands and agents.

## User Guides

| Guide | Description |
|-------|-------------|
| [Philosophy](./philosophy.md) | Build-time vs runtime, core design principles |
| [Getting Started](./getting-started.md) | Installation, first command, project structure |
| [Command](./command.md) | How to build slash commands with practical examples |
| [Agent](./agent.md) | How to build spawnable agents with input contracts |
| [Communication](./communication.md) | SpawnAgent pattern for Command <-> Agent communication |
| [Runtime System](./runtime.md) | useRuntimeVar and runtimeFn for TypeScript at runtime |
| [Control Flow](./control-flow.md) | If/Else, Loop/Break, Return, AskUser |
| [Conditionals](./conditionals.md) | Legacy conditionals (see Control Flow) |
| [Structured Components](./structured-components.md) | Table and List with array props |
| [Semantic Components](./semantic-components.md) | ExecutionContext for file references |
| [Grammar Specification](./grammar.md) | Formal EBNF grammar, element reference, nesting rules |

## Examples

| Example | Location | Description |
|---------|----------|-------------|
| Command Example | [examples/command.md](./examples/command.md) | Example command structure |
| Runtime Test | [src/app/test-runtime.tsx](../src/app/test-runtime.tsx) | Runtime features demo |

## Quick Reference

### Component Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Command   │────>│ SpawnAgent  │────>│    Agent    │
│             │     │             │     │             │
│ /my-command │     │  Task(...)  │     │ Specialized │
│             │     │             │     │   worker    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      v                   v                   v
  .claude/           Emitted in          .claude/
  commands/          markdown            agents/
```

### Core Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Command>` | Slash command | `/deploy`, `/migrate` |
| `<Agent>` | Spawnable worker | `test-runner`, `code-reviewer` |
| `<SpawnAgent>` | Spawn agent from command | Emits `Task()` syntax |
| `<Markdown>` | Inline content | Free-form markdown |
| `<XmlBlock>` | Structured section | `<objective>`, `<process>` |
| `<Table>` | Markdown tables | `<Table headers={["A"]} rows={[["1"]]} />` |
| `<List>` | Bullet/ordered lists | `<List items={["a", "b"]} ordered />` |

### Runtime Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `useRuntimeVar<T>()` | Typed runtime variable | `const ctx = useRuntimeVar<Result>('CTX')` |
| `runtimeFn()` | Wrap function for runtime | `const Fn = runtimeFn(myFunction)` |

### Control Flow Components

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

### File -> Output Mapping

| Source | Output |
|--------|--------|
| `src/app/my-command.tsx` | `.claude/commands/my-command.md` |
| `src/app/my-agent.tsx` | `.claude/agents/my-agent.md` |

### Build Commands

```bash
# Build specific file
npx react-agentic build "src/app/my-command.tsx"

# Build all in app folder
npx react-agentic build "src/app/**/*.tsx"

# Watch mode
npm run watch
```

---

> **Maintainer Note:** When features change, update these docs immediately. Documentation accuracy is critical for this project since it teaches patterns that users will follow.
