# Requirements: React Agentic

**Defined:** 2026-01-20
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Transpilation

- [x] **CORE-01**: Parse TSX files via ts-morph to extract AST
- [x] **CORE-02**: Transform `<Command>` props (name, description, allowedTools) to YAML frontmatter
- [x] **CORE-03**: Transform HTML-like elements to Markdown (h1-h6, p, b, i, code, a, ul, ol, li, blockquote, pre, br, hr)
- [x] **CORE-04**: Transform `<div name="x">` to XML-like blocks `<x>...</x>`
- [x] **CORE-05**: `<Markdown>` component passes raw content through unchanged

### Composition

- [ ] **COMP-01**: Support props spreading (`{...baseProps}`) with static resolution at transpile time
- [ ] **COMP-02**: Support component composition — import and flatten shared fragments across commands

### CLI

- [x] **CLI-01**: Directory/glob processing: `react-agentic build src/**/*.tsx`
- [x] **CLI-02**: Output follows `.claude` convention — commands go to `.claude/commands/` regardless of source location
- [ ] **CLI-03**: Watch mode — auto-rebuild on file changes with debouncing
- [ ] **CLI-04**: Dry run mode — `--dry-run` prints output without writing files
- [x] **CLI-05**: Colored terminal output with visual hierarchy (respects NO_COLOR)

### Infrastructure

- [ ] **INFRA-01**: Error messages include file path, line number, and column
- [ ] **INFRA-02**: Non-zero exit code on transpilation errors
- [x] **INFRA-03**: `--help` displays usage information
- [x] **INFRA-04**: `--version` displays current version

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Configuration

- **CONFIG-01**: Config file support (`react-agentic.config.js` or `.react-agenticrc`)
- **CONFIG-02**: Verbose/quiet modes for output control

### Optimization

- **OPT-01**: Incremental compilation — only rebuild changed files
- **OPT-02**: Parallel processing for large command sets

### Output Formats

- **OUT-01**: YAML output for static state files
- **OUT-02**: JSON output mode for tooling integration

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Runtime JSX execution | Static transpilation only — we parse structure, not render React |
| Dynamic prop values | Can't evaluate `allowedTools={getTools()}` at transpile time |
| Conditional rendering | `{condition && <p>...</p>}` creates non-deterministic output |
| Plugin system | Premature abstraction — stabilize core first |
| Browser-based transpilation | This is a CLI/build tool, Node.js only |
| Full React component support | Only Command + HTML-like elements supported |
| GUI/Visual editor | Different product |
| TypeScript type checking | Users run tsc separately; we parse, not typecheck |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 2 | Complete |
| CORE-02 | Phase 3 | Complete |
| CORE-03 | Phase 2 | Complete |
| CORE-04 | Phase 3 | Complete |
| CORE-05 | Phase 3 | Complete |
| COMP-01 | Phase 5 | Pending |
| COMP-02 | Phase 5 | Pending |
| CLI-01 | Phase 4 | Complete |
| CLI-02 | Phase 4 | Complete |
| CLI-03 | Phase 6 | Pending |
| CLI-04 | Phase 6 | Pending |
| CLI-05 | Phase 4 | Complete |
| INFRA-01 | Phase 6 | Pending |
| INFRA-02 | Phase 6 | Pending |
| INFRA-03 | Phase 4 | Complete |
| INFRA-04 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-21 after Phase 4 completion*
