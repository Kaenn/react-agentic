# react-agentic

A TSX-to-Markdown compiler for authoring Claude Code commands with full TypeScript support.

## Documentation

- [Build Pipeline](docs/build-pipeline.md) - How TSX is transformed to markdown step-by-step
- [Analysis](docs/analyze.md) - Why TypeScript Compiler API for TSX parsing
- [Command Example](docs/examples/command.md) - Example command structure

## Quick Start

```bash
# Build all commands
npm run build

# Watch mode
npm run watch
```

## Project Structure

```
src/
├── cli/           # CLI entry and commands
├── parser/        # TSX parsing and transformation
├── ir/            # Intermediate representation nodes
├── emitter/       # Markdown emission
└── index.ts       # Library exports
```
