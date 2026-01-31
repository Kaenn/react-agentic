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
- **v2.1 Parser Refactoring** - Phase 26 (shipped 2026-01-31)
- **v3.0 Primitive/Composite Architecture** - Phases 27-33 (in progress)

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

<details>
<summary>v2.1 Parser Refactoring (Phase 26) - SHIPPED 2026-01-31</summary>

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

</details>

### v3.0 Primitive/Composite Architecture (IN PROGRESS)

**Milestone Goal:** Separate primitive components (compiler-owned) from composite components (user-definable TSX functions). Enable users to create custom components that compose primitives.

- [x] **Phase 27: Baseline & Registry** - Snapshot tests and primitive classification
- [x] **Phase 28: Content Types** - Type foundation for content constraints
- [ ] **Phase 29: Reference Printing** - Direct interpolation and Ref component
- [ ] **Phase 30: Component Composition** - Children and props support
- [ ] **Phase 31: Content Validation** - Type-safe nesting constraints
- [ ] **Phase 32: Composite Library** - Move components to user-definable layer
- [ ] **Phase 33: Documentation** - User-facing docs and examples

## Phase Details

### Phase 27: Baseline & Registry
**Goal**: Establish safety baseline before refactoring and formalize primitive classification
**Depends on**: Phase 26 (v2.1 complete)
**Requirements**: FOUND-01, FOUND-02
**Success Criteria** (what must be TRUE):
  1. Snapshot tests exist for all current component markdown output
  2. Running refactoring changes that alter output causes test failures
  3. Primitive registry lists all compiler-owned components explicitly
  4. `isPrimitive()` function replaces ad-hoc component checks
**Plans**: 2 plans

Plans:
- [x] 27-01-PLAN.md — Create snapshot tests for all component markdown output
- [x] 27-02-PLAN.md — Create primitive registry with classification functions

### Phase 28: Content Types
**Goal**: Type foundation enabling content constraints across component boundaries
**Depends on**: Phase 27
**Requirements**: FOUND-03, FOUND-04, FOUND-05
**Success Criteria** (what must be TRUE):
  1. CommandContent and AgentContent types exist with full feature set (SpawnAgent, control flow allowed)
  2. SubComponentContent type exists with restricted features (no SpawnAgent, no top-level control flow)
  3. All three types exported from `react-agentic` for user component typing
  4. Types are discriminated unions with clear membership
**Plans**: 1 plan

Plans:
- [x] 28-01-PLAN.md — Create content-types.ts with discriminated union types, export from package root

### Phase 29: Reference Printing
**Goal**: Enable composites to print variable and function references in markdown output
**Depends on**: Phase 28
**Requirements**: REF-01, REF-02, REF-03, REF-04
**Success Criteria** (what must be TRUE):
  1. RuntimeVar interpolation `{ctx}` emits `$CTX` in markdown
  2. RuntimeVar interpolation `{ctx.data.status}` emits `$CTX.data.status` (shell variable syntax)
  3. RuntimeFn has `.name`, `.call`, `.input`, `.output` properties for reference metadata
  4. `<Ref value={ctx.status} />` component renders `$CTX.status` in markdown context
  5. `<Ref value={myFn} call />` renders function call syntax with parens
**Plans**: 1 plan

Plans:
- [ ] 29-01-PLAN.md — RuntimeVar shell syntax, RuntimeFn properties, Ref component

### Phase 30: Component Composition
**Goal**: Full support for children and props in custom components
**Depends on**: Phase 29
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04
**Success Criteria** (what must be TRUE):
  1. Custom components accept `children` prop with typed MarkdownContent
  2. Props passed to custom components are available inside component body
  3. Same behavior in static transformer and runtime transformer paths
  4. Fragments return multiple elements without wrapper (no spurious divs)
**Plans**: TBD

Plans:
- [ ] 30-01-PLAN.md — TBD
- [ ] 30-02-PLAN.md — TBD

### Phase 31: Content Validation
**Goal**: Compile-time errors for invalid content nesting
**Depends on**: Phase 30
**Requirements**: VALID-01, VALID-02, VALID-03
**Success Criteria** (what must be TRUE):
  1. TypeScript error when SpawnAgent used inside SubComponentContent context
  2. TypeScript error when control flow used at wrong nesting level
  3. Error messages clearly state what is forbidden and why
  4. Valid nesting compiles without errors
**Plans**: TBD

Plans:
- [ ] 31-01-PLAN.md — TBD

### Phase 32: Composite Library
**Goal**: Move current components to user-definable composite layer
**Depends on**: Phase 31
**Requirements**: LIB-01, LIB-02, LIB-03, LIB-04, LIB-05, LIB-06
**Success Criteria** (what must be TRUE):
  1. If/Else implemented as composites (user can copy and modify)
  2. Loop/Break implemented as composites
  3. SpawnAgent implemented as composite (wraps primitive Task emission)
  4. Step, Table, List, ExecutionContext implemented as composites
  5. All composites importable from `react-agentic/composites`
  6. Composite source code serves as reference for user-defined components
**Plans**: TBD

Plans:
- [ ] 32-01-PLAN.md — TBD
- [ ] 32-02-PLAN.md — TBD
- [ ] 32-03-PLAN.md — TBD

### Phase 33: Documentation
**Goal**: User-facing documentation for primitive/composite architecture
**Depends on**: Phase 32
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. docs/primitives-composites.md explains the boundary and why it exists
  2. Migration guide covers transitioning from string templates to typed children
  3. At least 3 example composites demonstrate common patterns
  4. Examples include: conditional wrapper, repeated section, custom validation
**Plans**: TBD

Plans:
- [ ] 33-01-PLAN.md — TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 27 -> 28 -> 29 -> 30 -> 31 -> 32 -> 33

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 | 17/17 | Complete | 2026-01-21 |
| 8-19 | v1.1-v1.8 | 56/56 | Complete | 2026-01-26 |
| 20-25 | v2.0 | 17/17 | Complete | 2026-01-27 |
| 26 | v2.1 | 4/4 | Complete | 2026-01-31 |
| 27 | v3.0 | 2/2 | Complete | 2026-01-31 |
| 28 | v3.0 | 1/1 | Complete | 2026-01-31 |
| 29 | v3.0 | 0/2 | Not started | - |
| 30 | v3.0 | 0/2 | Not started | - |
| 31 | v3.0 | 0/1 | Not started | - |
| 32 | v3.0 | 0/3 | Not started | - |
| 33 | v3.0 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-21*
*v2.0 TSX Syntax Improvements shipped: 2026-01-27*
*v2.1 Parser Refactoring shipped: 2026-01-31*
*v3.0 Primitive/Composite Architecture started: 2026-01-31*
