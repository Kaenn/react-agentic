# React Agentic

## What This Is

A TSX-to-Markdown transpiler that lets developers write Claude Code commands using React/TSX syntax with full TypeScript type safety. TSX files are parsed via the TypeScript Compiler API, transformed to an intermediate representation, and emitted as Markdown files with YAML frontmatter that Claude Code expects.

## Core Value

Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime. TypeScript catches missing props, invalid children, and structural errors before the command ever runs.

## Requirements

### Validated

- ✓ TSX → AST → MD transpilation pipeline — v1.0
- ✓ `<Command>` component with typed props (name, description, allowedTools) that become YAML frontmatter — v1.0
- ✓ HTML-like elements: h1-h6, b, i, code, a, p, ul, ol, li, blockquote, pre, br, hr — v1.0
- ✓ `<div name="...">` for XML-like semantic blocks in output — v1.0
- ✓ `<Markdown>` component as raw markdown fallback — v1.0
- ✓ Props spreading support with TypeScript types — v1.0
- ✓ Component composition (shared fragments across commands) — v1.0
- ✓ CLI: `react-agentic build <src> --out <dest>` — v1.0
- ✓ Watch mode for development workflow — v1.0
- ✓ Dry run mode with build tree preview — v1.0
- ✓ Source-located errors with file:line:col format — v1.0
- ✓ Colored terminal output (NO_COLOR aware) — v1.0

### Active

(None — start next milestone to add requirements)

### Out of Scope

- YAML output for state files — deferred to future milestone
- Additional elements beyond base set — will expand based on usage
- Vite/esbuild plugin integration — CLI first
- Component props support — v2
- Package imports (only relative imports supported) — v2
- Multi-block fragment returns — v2
- Config file support — v2
- Incremental compilation — v2

## Context

**Current State:** Shipped v1.0 with 2,442 LOC TypeScript across 16 source files.

**Tech stack:**
- TypeScript 5.9.3 with NodeNext module resolution
- ts-morph ^27.0.2 for TSX parsing
- Commander.js for CLI
- Chokidar for file watching
- Vitest for testing (155 tests)

**Architecture:**
- IR layer with discriminated unions decouples parsing from emission
- Parse → Transform → Emit pipeline
- Transformer supports component composition via import resolution

**Reference implementation:**
- Input example: `src/app/commit-helper.tsx`
- Output: `.claude/commands/commit-helper.md`
- Documentation: `docs/build-pipeline.md`

**Element mapping:**
| TSX | Markdown Output |
|-----|-----------------|
| `<Command props>` | YAML frontmatter |
| `<h2>Title</h2>` | `## Title` |
| `<b>text</b>` | `**text**` |
| `<i>text</i>` | `*text*` |
| `<code>text</code>` | `` `text` `` |
| `<ul><li>item</li></ul>` | `- item` |
| `<div name="foo">` | `<foo>...</foo>` |
| `<Markdown>{raw}</Markdown>` | raw content |
| `<br/>` | newline |

## Constraints

- **Stack**: TypeScript, ts-morph — required for type-aware AST parsing
- **Output format**: Markdown with YAML frontmatter — Claude Code's expected format
- **Compatibility**: Must work with standard TSX that React developers expect
- **JSX whitespace**: Use `{' '}` for explicit spacing between inline elements

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ts-morph over Babel | Full type resolution, not just syntax parsing | ✓ Good — enables spread resolution and component composition |
| CLI-first over plugin | Simpler initial scope, can add plugins later | ✓ Good — clean separation, watch mode works well |
| `<Markdown>` fallback | Never block users when element not supported | ✓ Good — escape hatch available |
| `<div name>` for XML blocks | Clean mapping to Claude Code's semantic tags | ✓ Good — intuitive syntax |
| IR discriminated unions | Type-safe switching with assertNever exhaustiveness | ✓ Good — caught bugs at compile time |
| Chokidar with debouncing | Research showed file watcher pitfalls | ✓ Good — 200ms debounce prevents duplicate builds |
| JSX `{' '}` pattern | Standard JSX whitespace behavior, not a bug | ✓ Good — documented in example |

---
*Last updated: 2026-01-21 after v1.0 milestone*
