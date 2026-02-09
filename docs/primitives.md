# Primitives

Primitives are compiler-owned components that provide the core building blocks for react-agentic commands and agents. These are stable, low-level components maintained by the framework.

## What are Primitives?

Primitives are intrinsic components compiled directly by the react-agentic parser. Unlike composites, primitives are **not meant to be copied or modified** — they're part of the compiler's type system and markdown emission logic.

Think of primitives like HTML elements: you use them as-is to build higher-level abstractions. If you need enhanced behavior, create composites that wrap primitives rather than forking primitive implementations.

## Primitive Catalog

All primitives are imported from the main package:

```tsx
import {
  Command,
  Agent,
  SpawnAgent,
  Table,
  List,
  If,
  Else,
  useRuntimeVar,
} from 'react-agentic';
```

### Core Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `Command` | Top-level slash command container | [Command Guide](./command.md) |
| `Agent` | Spawnable agent definition | [Agent Guide](./agent.md) |
| `SpawnAgent` | Spawn agent from command | [Communication](./communication.md) |
| `OnStatus` | Agent status callbacks | [Communication](./communication.md) |
| `Markdown` | Inline markdown content | [Command Guide](./command.md) |
| `XmlBlock` | Structured XML-style sections | [Command Guide](./command.md) |
| `Indent` | Indentation control | - |

### Structured Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `Table` | Markdown tables from arrays | [Structured Components](./structured-components.md) |
| `List` | Bullet/ordered lists from arrays | [Structured Components](./structured-components.md) |

### Control Flow

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `If` | Conditional rendering | [Control Flow](./control-flow.md) |
| `Else` | Else branch | [Control Flow](./control-flow.md) |
| `Loop` | Bounded iteration | [Control Flow](./control-flow.md) |
| `Break` | Early loop exit | [Control Flow](./control-flow.md) |
| `Return` | Early command exit | [Control Flow](./control-flow.md) |
| `AskUser` | Interactive user prompts | [Control Flow](./control-flow.md) |

### Runtime System

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `useRuntimeVar` | Typed runtime variables | [Runtime System](./runtime.md) |
| `runtimeFn` | Runtime function wrapper | [Runtime System](./runtime.md) |
| `Ref` | Explicit reference printing | [Runtime System](./runtime.md) |

### Semantic Components

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| `ExecutionContext` | @ file references | [Semantic Components](./semantic-components.md) |

## When to Use Primitives

Use primitives directly when:

- Building simple commands without repeated patterns
- You need precise control over emitted markdown
- The primitive behavior matches your exact use case
- You're building your own composite components

## When to Use Composites

Use composites when:

- You're repeating the same primitive patterns
- You want enhanced behavior (caption on tables, retry on agents)
- You need common convenience features
- You want to reduce boilerplate

## See Also

- [Composites](./composites.md) - User-definable convenience wrappers built on primitives
- [Grammar Specification](./grammar.md) - Formal element reference and nesting rules
