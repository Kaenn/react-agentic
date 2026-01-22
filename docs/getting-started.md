# Getting Started

react-agentic is a TSX-to-Markdown compiler for authoring Claude Code commands and agents with full TypeScript support.

## Installation

```bash
npm install
npm run build
```

## Quick Start

### 1. Create Your First Command

Create a file `src/app/hello.tsx`:

```tsx
import { Command, Markdown } from '../jsx.js';

export default function HelloCommand() {
  return (
    <Command
      name="hello"
      description="Greets the user warmly"
      allowedTools={['Bash']}
    >
      <Markdown>{`## Objective

Greet the user and show today's date.

## Process

1. Say hello to the user
2. Run \`date\` to show today's date
3. Wish them a productive day`}</Markdown>
    </Command>
  );
}
```

### 2. Build It

```bash
node dist/cli/index.js build "src/app/hello.tsx"
```

Output: `.claude/commands/hello.md`

### 3. Use It

In Claude Code, run:
```
/hello
```

## Project Structure

```
src/
├── app/           # Your commands and agents go here
│   ├── my-command.tsx
│   └── my-agent.tsx
├── jsx.js         # Component exports (Command, Agent, SpawnAgent, etc.)
└── ...

.claude/
├── commands/      # Generated command markdown files
└── agents/        # Generated agent markdown files
```

## Core Components

| Component | Purpose | Output |
|-----------|---------|--------|
| `<Command>` | Define a slash command | `.claude/commands/*.md` |
| `<Agent>` | Define a spawnable agent | `.claude/agents/*.md` |
| `<SpawnAgent>` | Spawn an agent from a command | `Task()` syntax |
| `<Markdown>` | Inline markdown content | Raw markdown |
| `<XmlBlock>` | XML-wrapped section | `<name>...</name>` |

### Conditional Components

| Component | Purpose | Example |
|-----------|---------|---------|
| `<If>` | Conditional block | `<If test="[ -f file ]">content</If>` |
| `<Else>` | Optional else block | Must follow `</If>` |

Conditionals emit as prose-based `**If condition:**` / `**Otherwise:**` patterns.

## Next Steps

- [Command Documentation](./command.md) - Learn to build commands
- [Agent Documentation](./agent.md) - Learn to build agents
- [Communication](./communication.md) - Connect commands and agents with SpawnAgent
