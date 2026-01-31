# Roadmap: React Agentic

## Milestones

- **v1.0 MVP** - Phases 1-7 (shipped 2026-01-21)
- **v1.1 Agent Framework** - Phases 8-11 (shipped 2026-01-21)
- **v1.2 Type-Safe Communication** - Phase 12 (shipped 2026-01-21)
- **v1.3 Conditional Logic** - Phase 13 (shipped 2026-01-22)
- **v1.4 Agent Output Management** - Phases 14-15 (shipped 2026-01-22)
- **v1.5 Skill System** - Phase 16 (shipped 2026-01-22)
- **v1.6 State System** - Phase 17 (shipped 2026-01-22)
- **v1.7 MCP Configuration** - Phase 18 (shipped 2026-01-22)
- **v1.8 Scoped State Skills** - Phase 19 (shipped 2026-01-26)
- **v2.0 TSX Syntax Improvements** - Phases 20-25 (shipped 2026-01-27)
- **v2.1 Parser Refactoring** - Phase 26 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-7) - SHIPPED 2026-01-21</summary>

See: .planning/milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>v1.1-v1.8 (Phases 8-19) - SHIPPED</summary>

See: .planning/ROADMAP.md history or milestone archives

- Phase 8: IR Extensions (v1.1)
- Phase 9: Agent Transpilation (v1.1)
- Phase 10: SpawnAgent Component (v1.1)
- Phase 11: Type Safety (v1.1)
- Phase 12: Typed SpawnAgent Input (v1.2)
- Phase 13: Conditional Logic (v1.3)
- Phase 14: Agent Output Schema (v1.4)
- Phase 15: Command Output Handling (v1.4)
- Phase 16: Skill Component (v1.5)
- Phase 17: State System (v1.6)
- Phase 18: MCP Configuration (v1.7)
- Phase 19: Scoped State Skills (v1.8)

</details>

<details>
<summary>v2.0 TSX Syntax Improvements (Phases 20-25) - SHIPPED 2026-01-27</summary>

See: .planning/milestones/v2.0-ROADMAP.md

- Phase 20: Module Restructure (2/2 plans)
- Phase 21: Structured Props (2/2 plans)
- Phase 22: Semantic Components (4/4 plans)
- Phase 23: Context Access Patterns (3/3 plans)
- Phase 24: Parser/Emitter Integration (3/3 plans)
- Phase 25: TSX Test Modernization (3/3 plans)

</details>

### v2.1 Parser Refactoring (IN PROGRESS)

**Milestone Goal:** Refactor the large parser files (parser.ts: 1255 lines, transformer.ts: 3956 lines) into smaller, maintainable submodules for improved code organization and readability.

- [ ] **Phase 26: Parser Refactoring** - Split parser.ts and transformer.ts into focused submodules

## Phase Details

### Phase 26: Parser Refactoring
**Goal**: Split monolithic parser files into organized submodules for maintainability
**Depends on**: Phase 25 (v2.0 complete)
**Requirements**: REF-01, REF-02
**Success Criteria** (what must be TRUE):
  1. `parser.ts` (1255 lines) split into `utils/` directory with 7 focused modules
  2. `transformer.ts` (3956 lines) split into `transformers/` directory with 10 focused modules
  3. Central `index.ts` re-exports all public APIs (no breaking changes)
  4. All existing tests pass after refactoring
  5. Build passes with no TypeScript errors
  6. Code is easier to navigate and understand
**Plans**: 4 plans

Plans:
- [x] 26-01-PLAN.md — Create utils/ directory with project, jsx-traversal, text-extraction, spread-resolution, component-resolution, type-resolution, variable-extraction modules
- [x] 26-02-PLAN.md — Create transformers/ directory foundation (types, shared utilities, dispatch stub)
- [x] 26-03-PLAN.md — Extract document, html, inline, semantic, control transformers
- [x] 26-04-PLAN.md — Extract remaining transformers, implement dispatch, update coordinator, verify tests

## Progress

**Execution Order:**
Phases execute in numeric order: 26 -> ...

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 | 17/17 | Complete | 2026-01-21 |
| 8-19 | v1.1-v1.8 | 56/56 | Complete | 2026-01-26 |
| 20-25 | v2.0 | 17/17 | Complete | 2026-01-27 |
| 26 | v2.1 | 4/4 | In Progress | - |

---
*Roadmap created: 2026-01-21*
*v2.0 TSX Syntax Improvements shipped: 2026-01-27*
*v2.1 Parser Refactoring in progress: 2026-01-27*
