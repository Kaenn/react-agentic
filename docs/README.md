# Documentation

This folder contains the documentation for react-agentic, a TSX-to-Markdown compiler for Claude Code commands and agents.

## User Guides

| Guide | Description |
|-------|-------------|
| [Getting Started](./getting-started.md) | Installation, first command, project structure |
| [Command](./command.md) | How to build slash commands with practical examples |
| [Agent](./agent.md) | How to build spawnable agents with input contracts |
| [Communication](./communication.md) | SpawnAgent pattern for Command ↔ Agent communication |
| [Variables](./variables.md) | Shell variables with `useVariable` and `<Assign>` |
| [Conditionals](./conditionals.md) | Decision logic with `<If>` and `<Else>` components |
| [MCP Configuration](./mcp-configuration.md) | Configure MCP servers via TSX |

## Technical Reference

| Doc | Description |
|-----|-------------|
| [Build Pipeline](./build-pipeline.md) | How TSX is transformed to markdown step-by-step |
| [Analysis](./analyze.md) | Why TypeScript Compiler API for TSX parsing |

## Examples

| Example | Location | Description |
|---------|----------|-------------|
| Command Example | [examples/command.md](./examples/command.md) | Example command structure |
| Code Reviewer | [src/app/code-reviewer.tsx](../src/app/code-reviewer.tsx) | Agent with input interface |
| Commit Helper | [src/app/commit-helper.tsx](../src/app/commit-helper.tsx) | Command using SpawnAgent |
| Plan Phase | [src/app/gsd/plan-phase.tsx](../src/app/gsd/plan-phase.tsx) | Complex orchestrator with multiple spawns |

## Quick Reference

### Component Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Command   │────►│ SpawnAgent  │────►│    Agent    │
│             │     │             │     │             │
│ /my-command │     │  Task(...)  │     │ Specialized │
│             │     │             │     │   worker    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
  .claude/           Emitted in          .claude/
  commands/          markdown            agents/
```

### File → Output Mapping

| Source | Output |
|--------|--------|
| `src/app/my-command.tsx` | `.claude/commands/my-command.md` |
| `src/app/my-agent.tsx` | `.claude/agents/my-agent.md` |
| `src/app/folder/thing.tsx` | `.claude/commands/thing.md` or `.claude/agents/folder/thing.md` |

### Build Commands

```bash
# Build specific file
node dist/cli/index.js build "src/app/my-command.tsx"

# Build all in app folder
node dist/cli/index.js build "src/app/**/*.tsx"

# Watch mode
npm run watch
```

---

> **Maintainer Note:** When features change, update these docs immediately. Documentation accuracy is critical for this project since it teaches patterns that users will follow.
