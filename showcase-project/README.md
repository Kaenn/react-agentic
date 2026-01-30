# Showcase Project

This project demonstrates how to use `react-agentic` to build Claude Code commands.

## Setup

```bash
npm install
```

## Build Commands

```bash
npm run build
```

This compiles all `.tsx` files in `src/` to markdown commands in `.claude/commands/`.

## Watch Mode

```bash
npm run watch
```

Automatically rebuilds when files change.

## Project Structure

```
showcase-project/
├── package.json          # Project config
├── tsconfig.json         # TypeScript config
├── src/
│   └── db-migrate.tsx    # Command source
└── .claude/
    ├── commands/
    │   └── db-migrate.md # Generated command
    └── runtime/
        └── runtime.js    # Bundled runtime functions
```

## Example Command

`src/db-migrate.tsx` demonstrates:
- **`useRuntimeVar`** - Typed shell variables
- **`runtimeFn`** - Node.js functions that run at command execution
- **`If`/`Else`** - Control flow
- **`AskUser`** - Interactive user prompts
- **`Return`** - Early exit with status

## Usage in Claude Code

After building, use the command in Claude Code:

```
/db-migrate
```
