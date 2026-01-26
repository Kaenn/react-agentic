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
- **v2.0 TSX Syntax Improvements** - Phases 20-24 (in progress)

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

### v2.0 TSX Syntax Improvements (In Progress)

**Milestone Goal:** Improve TSX authoring ergonomics with better module organization, semantic components for common patterns, structured props for tables/lists, and render props pattern for context access.

- [ ] **Phase 20: Module Restructure** - Split jsx.ts into primitives/ and workflow/ directories
- [ ] **Phase 21: Structured Props** - Table and List components with array-based props
- [ ] **Phase 22: Semantic Components** - ExecutionContext, SuccessCriteria, OfferNext, and XML wrapper sections
- [ ] **Phase 23: Context Access Patterns** - Render props for Command/Agent, explicit generics, Step component
- [ ] **Phase 24: Parser/Emitter Integration** - Transform and emit all new components with tests

## Phase Details

### Phase 20: Module Restructure
**Goal**: Split jsx.ts (1044 lines) into organized primitives/ and workflow/ directories with clean re-exports
**Depends on**: Phase 19 (v1.8 complete)
**Requirements**: ORG-01, ORG-02, ORG-03
**Success Criteria** (what must be TRUE):
  1. jsx.ts split into `primitives/` and `workflow/` directories
  2. Central `index.ts` re-exports all components from both directories
  3. `workflow/sections/` subdirectory exists for semantic XML wrapper components
  4. All existing imports continue to work (no breaking changes)
  5. Build passes with no TypeScript errors
**Plans**: TBD

Plans:
- [ ] 20-01: Directory structure and file organization
- [ ] 20-02: Component migration and re-exports

### Phase 21: Structured Props
**Goal**: Add Table and List components that accept structured array props instead of manual JSX children
**Depends on**: Phase 20
**Requirements**: PROP-01, PROP-02
**Success Criteria** (what must be TRUE):
  1. `<Table headers={["A", "B"]} rows={[["1", "2"], ["3", "4"]]} />` emits markdown table
  2. `<List items={["item1", "item2"]} />` emits markdown bullet list
  3. Components accept optional props for styling (ordered list vs bullet, etc.)
  4. TypeScript enforces prop types at compile time
**Plans**: TBD

Plans:
- [ ] 21-01: Table and List IR nodes and JSX types
- [ ] 21-02: Table and List emitters

### Phase 22: Semantic Components
**Goal**: Add semantic section components that emit XML-wrapped content for common Claude Code patterns
**Depends on**: Phase 21
**Requirements**: SEM-01, SEM-02, SEM-03, SEM-04, SEM-05, SEM-06, SEM-07
**Success Criteria** (what must be TRUE):
  1. `<ExecutionContext paths={["@file1", "@file2"]} />` emits `<execution_context>` with @ imports
  2. `<SuccessCriteria items={["crit1", "crit2"]} />` emits `<success_criteria>` with checkbox list
  3. `<OfferNext routes={[{name: "x", description: "y", path: "z"}]} />` emits typed navigation section
  4. `<DeviationRules>`, `<CommitRules>`, `<WaveExecution>`, `<CheckpointHandling>` emit named XML sections with children
  5. All semantic components work inside Command and Agent bodies
**Plans**: TBD

Plans:
- [ ] 22-01: ExecutionContext and SuccessCriteria components
- [ ] 22-02: OfferNext component with typed routes
- [ ] 22-03: XML wrapper section components (DeviationRules, CommitRules, WaveExecution, CheckpointHandling)

### Phase 23: Context Access Patterns
**Goal**: Enable render props pattern for context access and explicit generics on workflow components
**Depends on**: Phase 22
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04
**Success Criteria** (what must be TRUE):
  1. `<Command>{(ctx) => ...}</Command>` render props pattern works with typed context
  2. `<Agent>{(ctx) => ...}</Agent>` render props pattern works with typed context
  3. `<Bash<string>>`, `<Loop<T>>`, `<If<T>>` accept explicit generic type parameters
  4. `<Step name="Setup" number={1}>` component emits numbered workflow section
  5. Context types include relevant command/agent metadata
**Plans**: TBD

Plans:
- [ ] 23-01: Command and Agent render props support
- [ ] 23-02: Explicit generics on workflow components
- [ ] 23-03: Step component for numbered sections

### Phase 24: Parser/Emitter Integration
**Goal**: Wire all new components through transformer and emitter with comprehensive tests
**Depends on**: Phase 23
**Requirements**: PAR-01, PAR-02, PAR-03
**Success Criteria** (what must be TRUE):
  1. Transformer recognizes all new components and converts to IR nodes
  2. Emitter generates correct markdown for all new IR nodes
  3. Unit tests cover each new component with expected input -> output
  4. Integration test demonstrates all new components in a single command
  5. Documentation updated for all new components
**Plans**: TBD

Plans:
- [ ] 24-01: Transformer updates for all new components
- [ ] 24-02: Emitter updates for all new IR nodes
- [ ] 24-03: Tests and documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 20 -> 21 -> 22 -> 23 -> 24

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. IR Extensions | v1.1 | 1/1 | Complete | 2026-01-21 |
| 9. Agent Transpilation | v1.1 | 2/2 | Complete | 2026-01-21 |
| 10. SpawnAgent Component | v1.1 | 2/2 | Complete | 2026-01-21 |
| 11. Type Safety | v1.1 | 2/2 | Complete | 2026-01-21 |
| 12. Typed SpawnAgent Input | v1.2 | 4/4 | Complete | 2026-01-21 |
| 13. Conditional Logic | v1.3 | 3/3 | Complete | 2026-01-22 |
| 14. Agent Output Schema | v1.4 | 3/3 | Complete | 2026-01-22 |
| 15. Command Output Handling | v1.4 | 3/3 | Complete | 2026-01-22 |
| 16. Skill Component | v1.5 | 5/5 | Complete | 2026-01-22 |
| 17. State System | v1.6 | 6/6 | Complete | 2026-01-22 |
| 18. MCP Configuration | v1.7 | 4/4 | Complete | 2026-01-22 |
| 19. Scoped State Skills | v1.8 | 4/4 | Complete | 2026-01-26 |
| 20. Module Restructure | v2.0 | 0/2 | Not started | - |
| 21. Structured Props | v2.0 | 0/2 | Not started | - |
| 22. Semantic Components | v2.0 | 0/3 | Not started | - |
| 23. Context Access Patterns | v2.0 | 0/3 | Not started | - |
| 24. Parser/Emitter Integration | v2.0 | 0/3 | Not started | - |

---
*Roadmap created: 2026-01-21*
*v2.0 TSX Syntax Improvements started: 2026-01-26*
