# React Agentic

## What This Is

A TSX-to-Markdown transpiler that lets developers write Claude Code commands using React/TSX syntax with full TypeScript type safety. TSX files are parsed via the TypeScript Compiler API, transformed to an intermediate representation, and emitted as Markdown files with YAML frontmatter that Claude Code expects.

## Core Value

Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime. TypeScript catches missing props, invalid children, and structural errors before the command ever runs.

## Requirements

### Validated

**v1.0 MVP:**
- TSX -> AST -> MD transpilation pipeline — v1.0
- `<Command>` component with typed props (name, description, allowedTools) that become YAML frontmatter — v1.0
- HTML-like elements: h1-h6, b, i, code, a, p, ul, ol, li, blockquote, pre, br, hr — v1.0
- `<div name="...">` for XML-like semantic blocks in output — v1.0
- `<Markdown>` component as raw markdown fallback — v1.0
- Props spreading support with TypeScript types — v1.0
- Component composition (shared fragments across commands) — v1.0
- CLI: `react-agentic build <src> --out <dest>` — v1.0
- Watch mode for development workflow — v1.0
- Dry run mode with build tree preview — v1.0
- Source-located errors with file:line:col format — v1.0
- Colored terminal output (NO_COLOR aware) — v1.0

**v1.1 Agent Framework:**
- `<Agent>` component transpiles to Claude Code agent markdown — v1.1
- `<SpawnAgent>` component for Commands to invoke Agents — v1.1
- Shared interface definitions (Agent owns contract, Command imports it) — v1.1
- TypeScript type safety across command -> agent boundary — v1.1
- Output format matches GSD (get-shit-done) exactly — v1.1

**v1.2 Type-Safe Communication:**
- SpawnAgent `input` prop with VariableRef/object literal support — v1.2
- Auto-generated prompts from Agent interface contracts — v1.2

**v1.3 Conditional Logic:**
- `<If>` / `<Else>` components for conditional execution — v1.3
- Variable interpolation in test expressions — v1.3

**v1.4 Agent Output Management:**
- `AgentStatus` type and `BaseOutput` interface — v1.4
- `useOutput` hook and `<OnStatus>` component — v1.4
- Auto-generated `<structured_returns>` section — v1.4

**v1.5 Skill System:**
- `<Skill>` component with `<SkillFile>` and `<SkillStatic>` — v1.5

**v1.6 State System:**
- `useStateRef<TSchema>` / `<ReadState>` / `<WriteState>` — v1.6
- FileAdapter with JSON persistence — v1.6

**v1.7 MCP Configuration:**
- `<MCPServer>` component for settings.json generation — v1.7

**v1.8 Scoped State Skills:**
- `<State<TSchema>>` component with provider binding — v1.8
- SQLite provider with auto-generated CRUD skills — v1.8
- `<Operation>` for custom semantic operations — v1.8
- TypeScript -> SQL schema mapping — v1.8

**v2.0 TSX Syntax Improvements:**
- Module structure splits jsx.ts into primitives/ and workflow/ directories — v2.0
- Central index.ts re-exports all components from both directories — v2.0
- ExecutionContext component with paths prop and @ imports — v2.0
- SuccessCriteria component with checkbox list — v2.0
- OfferNext component with typed routes — v2.0
- DeviationRules, CommitRules, WaveExecution, CheckpointHandling XML sections — v2.0
- Table component with headers/rows array props — v2.0
- List component with items array prop — v2.0
- Command/Agent render props pattern {(ctx) => children} — v2.0
- Workflow components (Bash, Loop, If) explicit generic type parameters — v2.0
- Step component with name/number props for numbered workflow sections — v2.0
- Transformer and emitter support for all new components — v2.0
- Unit tests covering each new component — v2.0

### Active

**v2.1 Parser Refactoring (in progress):**
- [ ] Split parser.ts (1255 lines) into utils/ directory with focused modules
- [ ] Split transformer.ts (3956 lines) into transformers/ directory with focused modules
- [ ] Central index.ts re-exports all public APIs (no breaking changes)

### Out of Scope

- YAML output for state files — deferred to future milestone
- Additional elements beyond base set — will expand based on usage
- Vite/esbuild plugin integration — CLI first
- Package imports (only relative imports supported) — future
- Config file support — future
- Incremental compilation — future

## Context

**Current State:** Shipped v2.0 with 45,543 LOC TypeScript.

**Tech stack:**
- TypeScript 5.9.3 with NodeNext module resolution
- ts-morph ^27.0.2 for TSX parsing
- Commander.js for CLI
- Chokidar for file watching
- Vitest for testing (155+ tests)

**Architecture:**
- IR layer with discriminated unions decouples parsing from emission
- Parse -> Transform -> Emit pipeline
- Transformer supports component composition via import resolution
- Organized module structure: primitives/, workflow/, workflow/sections/

**Reference implementation:**
- Input example: `src/app/commit-helper.tsx`
- Output: `.claude/commands/commit-helper.md`
- Documentation: `docs/build-pipeline.md`

**v2.0 Component additions:**
| Component | Props | Output |
|-----------|-------|--------|
| `<Table>` | headers, rows, align | Markdown table |
| `<List>` | items, ordered, start | Bullet/numbered list |
| `<ExecutionContext>` | paths, prefix | @ file references |
| `<SuccessCriteria>` | items | Checkbox list |
| `<OfferNext>` | routes | Navigation section |
| `<Step>` | number, name, variant | Numbered section |

## Constraints

- **Stack**: TypeScript, ts-morph — required for type-aware AST parsing
- **Output format**: Markdown with YAML frontmatter — Claude Code's expected format
- **Compatibility**: Must work with standard TSX that React developers expect
- **JSX whitespace**: Use `{' '}` for explicit spacing between inline elements

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ts-morph over Babel | Full type resolution, not just syntax parsing | Good — enables spread resolution and component composition |
| CLI-first over plugin | Simpler initial scope, can add plugins later | Good — clean separation, watch mode works well |
| `<Markdown>` fallback | Never block users when element not supported | Good — escape hatch available |
| `<div name>` for XML blocks | Clean mapping to Claude Code's semantic tags | Good — intuitive syntax |
| IR discriminated unions | Type-safe switching with assertNever exhaustiveness | Good — caught bugs at compile time |
| Chokidar with debouncing | Research showed file watcher pitfalls | Good — 200ms debounce prevents duplicate builds |
| JSX `{' '}` pattern | Standard JSX whitespace behavior, not a bug | Good — documented in example |
| Module restructure (v2.0) | jsx.ts monolith (1044 lines) was hard to navigate | Good — 91% reduction, clean separation |
| Explicit named re-exports | Tree-shaking and API control | Good — 59 clean exports |
| Structured props (Table/List) | Array props vs manual JSX children | Good — type-safe, less boilerplate |
| Render props optional | Progressive disclosure, backwards compatible | Good — simple cases stay simple |
| Step number as string | Support sub-steps like "1.1" | Good — flexible numbering |

---
*Last updated: 2026-01-31 after v2.0 milestone*
