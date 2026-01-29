# Getting Started

react-agentic is a TSX-to-Markdown compiler for authoring Claude Code commands and agents with full TypeScript support.

## Installation

```bash
npm install react-agentic
```

Or clone and build locally:

```bash
npm install
npm run build
```

## Quick Start

### 1. Create Your First Command

Create a file `src/app/hello.tsx`:

```tsx
import { Command, Markdown } from 'react-agentic';

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
npx react-agentic build "src/app/hello.tsx"
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
| `<Table>` | Structured tables | Markdown table |
| `<List>` | Bullet or numbered lists | Markdown list |

### Runtime Components

| Component | Purpose |
|-----------|---------|
| `useRuntimeVar<T>()` | Declare typed runtime variable |
| `runtimeFn()` | Wrap TypeScript function for runtime |

### Control Flow Components

| Component | Purpose |
|-----------|---------|
| `<If>` / `<Else>` | Conditional rendering |
| `<Loop>` / `<Break>` | Bounded iteration |
| `<Return>` | Early exit with status |
| `<AskUser>` | Interactive user prompts |

## Example with Runtime Features

```tsx
import { Command, useRuntimeVar, runtimeFn, If, Else } from 'react-agentic';

interface CheckResult {
  exists: boolean;
  path: string;
}

async function checkProject(args: { path: string }): Promise<CheckResult> {
  const fs = await import('fs/promises');
  try {
    await fs.stat(args.path);
    return { exists: true, path: args.path };
  } catch {
    return { exists: false, path: args.path };
  }
}

const Check = runtimeFn(checkProject);

export default (
  <Command name="init" description="Initialize project">
    {() => {
      const result = useRuntimeVar<CheckResult>('RESULT');

      return (
        <>
          <h2>Project Initialization</h2>

          <Check.Call args={{ path: "." }} output={result} />

          <If condition={result.exists}>
            <p>Project already initialized at {result.path}</p>
          </If>
          <Else>
            <p>Creating new project...</p>
          </Else>
        </>
      );
    }}
  </Command>
);
```

## Next Steps

- [Command Documentation](./command.md) - Learn to build commands
- [Agent Documentation](./agent.md) - Learn to build agents
- [Runtime System](./runtime.md) - useRuntimeVar and runtimeFn
- [Control Flow](./control-flow.md) - If/Else, Loop, Return, AskUser
- [Communication](./communication.md) - Connect commands and agents with SpawnAgent
