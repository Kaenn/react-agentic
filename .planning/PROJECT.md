# React Agentic

## What This Is

A TSX-to-Markdown transpiler that lets developers write Claude Code commands using React/TSX syntax with full TypeScript type safety. TSX files are parsed via the TypeScript Compiler API, transformed to AST, and output as Markdown files with YAML frontmatter that Claude Code expects.

## Core Value

Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime. TypeScript catches missing props, invalid children, and structural errors before the command ever runs.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] TSX → AST → MD transpilation pipeline
- [ ] `<Command>` component with typed props (name, description, allowedTools) that become YAML frontmatter
- [ ] HTML-like elements: h1-h6, b, i, code, a, p, ul, ol, li, blockquote, pre, br, hr
- [ ] `<div name="...">` for XML-like semantic blocks in output
- [ ] `<Markdown>` component as raw markdown fallback
- [ ] Props spreading support with TypeScript types
- [ ] Component composition (shared fragments across commands)
- [ ] CLI: `react-agentic build <src> --out <dest>`
- [ ] Watch mode for development workflow

### Out of Scope

- YAML output for state files — deferred to future milestone
- Additional elements beyond base set — will expand based on usage
- Vite/esbuild plugin integration — CLI first

## Context

**Domain:** This targets developers creating Claude Code custom commands who want React/TypeScript ergonomics instead of writing raw markdown.

**Technical approach:** Use ts-morph (TypeScript Compiler API wrapper) for parsing TSX. This gives full type awareness, resolves generics/interfaces, and handles JSX as first-class syntax.

**Reference implementation:**
- Input example: `docs/examples/command.tsx`
- Output example: `docs/examples/command.md`
- Analysis doc: `docs/analyze.md`

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ts-morph over Babel | Full type resolution, not just syntax parsing | — Pending |
| CLI-first over plugin | Simpler initial scope, can add plugins later | — Pending |
| `<Markdown>` fallback | Never block users when element not supported | — Pending |
| `<div name>` for XML blocks | Clean mapping to Claude Code's semantic tags | — Pending |

---
*Last updated: 2026-01-20 after initialization*
