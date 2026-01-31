# Project Milestones: React Agentic

## v2.0 TSX Syntax Improvements (Shipped: 2026-01-27)

**Delivered:** Improved TSX authoring ergonomics with module restructure, semantic components, structured props (Table/List), and render props pattern for context access.

**Phases completed:** 20-25 (17 plans total)

**Key accomplishments:**

- Module restructure: Split jsx.ts (1044 -> 107 lines) into primitives/ and workflow/ directories
- Structured props: Table with headers/rows/alignment and List with items/ordered/start
- Semantic components: ExecutionContext, SuccessCriteria, OfferNext, XML wrappers
- Context access: Render props {(ctx) => ...} for Command/Agent, explicit generics
- Step component: Numbered workflow sections with heading/bold/xml variants
- Documentation: 1,130 lines of new docs with TSX -> markdown examples

**Stats:**

- 17 files created/modified
- 45,543 total lines of TypeScript
- 6 phases, 17 plans
- 2 days from start to ship

**Git range:** Phase 20 -> Phase 25

**What's next:** v2.1 Parser Refactoring (split parser.ts and transformer.ts into submodules)

---

## v1.8 Scoped State Skills (Shipped: 2026-01-26)

**Delivered:** Provider-agnostic scoped state skills with SQLite backend — State<TSchema> components generate deterministic CRUD skills without AI interpretation.

**Phases completed:** 19 (4 plans total)

**Key accomplishments:**

- State<TSchema> component with compile-time typed schema from TypeScript interfaces
- SQLite provider generating bash/sqlite3 code templates for CRUD operations
- Auto-generated skills: init, read, write, delete per state definition
- Custom Operation support for semantic operations (e.g., `releases.record`)
- TypeScript -> SQL schema mapping with type validation and enum constraints

**Stats:**

- 15 files created/modified
- 18,083 total lines of TypeScript
- 1 phase, 4 plans
- 1 day from start to ship

**Git range:** `feat(19-01)` -> `feat(19-04)`

**What's next:** Additional providers (localfile, supabase), state migration tooling

---

## v1.0 MVP (Shipped: 2026-01-21)

**Delivered:** A TSX-to-Markdown transpiler with full TypeScript support for authoring Claude Code commands.

**Phases completed:** 1-7 (17 plans total)

**Key accomplishments:**

- IR type system with discriminated unions and switch-based Markdown emitter
- TSX parsing via ts-morph with full HTML-like element transformation
- Command component with YAML frontmatter, XML blocks, and Markdown passthrough
- Production CLI with glob processing, colored output, and proper exit codes
- Props spreading and component composition for reusable command fragments
- Watch mode with debouncing, dry run mode, and source-located errors

**Stats:**

- 16 files created
- 2,442 lines of TypeScript
- 7 phases, 17 plans
- 2 days from project start to ship

**Git range:** `feat(01-02)` -> `feat(07-02)`

**What's next:** v2 features (config file, incremental compilation, parallel processing)

---
