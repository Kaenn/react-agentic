# react-agentic

A TSX-to-Markdown compiler for authoring Claude Code commands and agents with full TypeScript support.

## Documentation

> **IMPORTANT:** Keep documentation up to date when features change. These docs teach patterns that users follow — outdated docs lead to incorrect usage.

Full documentation lives in [`docs/`](docs/README.md):

### User Guides
| Guide | Description |
|-------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, first command, project structure |
| [Command](docs/command.md) | Build slash commands (e.g., `/db-migrate`) |
| [Agent](docs/agent.md) | Build spawnable agents with input contracts |
| [Communication](docs/communication.md) | SpawnAgent pattern for Command ↔ Agent data flow |
| [Variables](docs/variables.md) | Shell variables with `useVariable` and `<Assign>` |

### Technical Reference
| Doc | Description |
|-----|-------------|
| [Build Pipeline](docs/build-pipeline.md) | How TSX transforms to markdown |
| [Analysis](docs/analyze.md) | Why TypeScript Compiler API |

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
├── jsx.ts         # Component exports (Command, Agent, SpawnAgent, etc.)
└── index.ts       # Library exports

docs/              # Documentation (keep up to date!)
├── README.md      # Doc index
├── getting-started.md
├── command.md
├── agent.md
├── communication.md
└── variables.md

.claude/
├── commands/      # Generated command markdown
└── agents/        # Generated agent markdown
```

## Core Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Command>` | Slash command | `/deploy`, `/migrate` |
| `<Agent>` | Spawnable worker | `test-runner`, `code-reviewer` |
| `<SpawnAgent>` | Spawn agent from command | Emits `Task()` syntax |
| `useVariable` | Declare shell variable | `useVariable("TS")` |
| `<Assign>` | Emit variable assignment | `<Assign var={ts} bash={\`date\`} />` |
| `<Markdown>` | Inline content | Free-form markdown |
| `<XmlBlock>` | Structured section | `<objective>`, `<process>` |
