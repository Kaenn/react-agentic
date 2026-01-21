# Roadmap: React Agentic

## Overview

This roadmap delivers a TSX-to-Markdown transpiler in 6 phases following compiler architecture best practices. The journey begins with IR type definitions and emitter (enabling testable, maintainable code), progresses through element coverage and CLI interface, and concludes with composition features and production polish. Build order follows research guidance: IR first, emitter second, transformer third, CLI last.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & IR** - Project scaffolding and intermediate representation types
- [x] **Phase 2: Core Transpilation** - TSX parsing and basic element transformation
- [x] **Phase 3: Full Element Coverage** - Command frontmatter, XML blocks, and raw markdown
- [x] **Phase 4: CLI Interface** - Build command with glob processing and output conventions
- [x] **Phase 5: Composition** - Props spreading and component composition support
- [x] **Phase 6: Watch & Error Handling** - Watch mode, dry run, and source-located errors
- [x] **Phase 7: Example Validation** - Create working example command that validates transpiler output

## Phase Details

### Phase 1: Foundation & IR
**Goal**: Establish project infrastructure and define intermediate representation that decouples parsing from generation
**Depends on**: Nothing (first phase)
**Requirements**: None (infrastructure phase)
**Success Criteria** (what must be TRUE):
  1. Project compiles with TypeScript and all dependencies installed
  2. IR types exist for all planned node kinds (Heading, Paragraph, List, XmlBlock, Command, etc.)
  3. Markdown emitter can convert hand-crafted IR to valid Markdown output
  4. Unit tests verify emitter produces correct Markdown for each IR node type
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Project setup (package.json, tsconfig, dependencies)
- [x] 01-02-PLAN.md — IR type definitions and Markdown emitter

### Phase 2: Core Transpilation
**Goal**: Parse TSX files and transform basic HTML-like elements to Markdown via IR
**Depends on**: Phase 1
**Requirements**: CORE-01, CORE-03
**Success Criteria** (what must be TRUE):
  1. User can write TSX with h1-h6, p, b, i, code, a, ul, ol, li, blockquote, pre, br, hr elements
  2. Running transpiler on TSX produces correctly formatted Markdown output
  3. Text content is preserved through the parse->transform->emit pipeline
  4. Nested elements (bold inside paragraph, list items with formatting) render correctly
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — ts-morph parser setup and JSX AST traversal
- [x] 02-02-PLAN.md — Transformer for basic elements (headings, paragraphs, text formatting)
- [x] 02-03-PLAN.md — Transformer for lists, blockquotes, code blocks, and links

### Phase 3: Full Element Coverage
**Goal**: Complete element support including Command frontmatter, XML blocks, and raw markdown passthrough
**Depends on**: Phase 2
**Requirements**: CORE-02, CORE-04, CORE-05
**Success Criteria** (what must be TRUE):
  1. User can write `<Command name="..." description="..." allowedTools={[...]}>` and get valid YAML frontmatter
  2. User can write `<div name="example">content</div>` and get `<example>content</example>` output
  3. User can write `<Markdown>{raw}</Markdown>` and content passes through unchanged
  4. Complete command TSX files transpile to Claude Code-compatible Markdown with frontmatter
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Command component props to YAML frontmatter
- [x] 03-02-PLAN.md — Named div blocks and Markdown passthrough component

### Phase 4: CLI Interface
**Goal**: Usable CLI tool with build command, glob processing, and proper output conventions
**Depends on**: Phase 3
**Requirements**: CLI-01, CLI-02, CLI-05, INFRA-03, INFRA-04
**Success Criteria** (what must be TRUE):
  1. User can run `react-agentic build src/**/*.tsx` to process multiple files
  2. Output files are placed in `.claude/commands/` following Claude Code convention
  3. Terminal output has visual hierarchy with colors (respects NO_COLOR)
  4. User can run `react-agentic --help` and see usage information
  5. User can run `react-agentic --version` and see current version
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — CLI scaffolding with commander (help, version, basic structure)
- [x] 04-02-PLAN.md — Build command with glob processing and colored output

### Phase 5: Composition
**Goal**: Enable props spreading and component composition for reusable command fragments
**Depends on**: Phase 4
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. User can use `{...baseProps}` to spread static props at transpile time
  2. User can import and use shared component fragments across multiple command files
  3. Composed components flatten correctly into final Markdown output
  4. TypeScript provides type checking for spread props and composed components
**Plans**: 2 plans

Plans:
- [x] 05-01-PLAN.md — Static props spreading resolution
- [x] 05-02-PLAN.md — Component composition and fragment flattening

### Phase 6: Watch & Error Handling
**Goal**: Production-ready CLI with watch mode, dry run, and developer-friendly error messages
**Depends on**: Phase 5
**Requirements**: CLI-03, CLI-04, INFRA-01, INFRA-02
**Success Criteria** (what must be TRUE):
  1. User can run `react-agentic build --watch` and see auto-rebuild on file changes
  2. Watch mode debounces rapid file changes (no duplicate builds)
  3. User can run `react-agentic build --dry-run` to preview output without writing files
  4. Transpilation errors include file path, line number, and column
  5. CLI exits with non-zero code when transpilation fails
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Source-located error messages with TypeScript-style formatting
- [x] 06-02-PLAN.md — Dry run mode with build tree preview
- [x] 06-03-PLAN.md — Watch mode with chokidar and debouncing

### Phase 7: Example Validation
**Goal**: Fix and validate the example command TSX file to demonstrate correct syntax and all supported features
**Depends on**: Phase 6
**Requirements**: None (validation phase)
**Success Criteria** (what must be TRUE):
  1. Example command.tsx uses valid JSX syntax (all content inside Command wrapper)
  2. Running `react-agentic build` on the example produces valid markdown
  3. Output markdown can be used as a Claude Code command
  4. Example demonstrates all supported features (headings, lists, formatting, XML blocks)
  5. TSX files open without TypeScript errors in IDE (JSX types available)
  6. List items with bold text render inline (no line breaks)
  7. Example lives in src/app/ with default watch path support
**Plans**: 3 plans

Plans:
- [x] 07-01-PLAN.md — Fix and validate example command TSX file
- [x] 07-02-PLAN.md — Close UAT gaps: JSX types, list item fix, src/app location
- [x] 07-03-PLAN.md — Fix space preservation in list items with bold text

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & IR | 2/2 | Complete | 2026-01-21 |
| 2. Core Transpilation | 3/3 | Complete | 2026-01-21 |
| 3. Full Element Coverage | 2/2 | Complete | 2026-01-21 |
| 4. CLI Interface | 2/2 | Complete | 2026-01-21 |
| 5. Composition | 2/2 | Complete | 2026-01-21 |
| 6. Watch & Error Handling | 3/3 | Complete | 2026-01-21 |
| 7. Example Validation | 3/3 | Complete | 2026-01-21 |

---
*Roadmap created: 2026-01-20*
*Depth: Standard (7 phases)*
*Coverage: 16/16 v1 requirements mapped*
