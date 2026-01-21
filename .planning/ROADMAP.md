# Roadmap: React Agentic

## Milestones

- ✅ **v1.0 MVP** - Phases 1-7 (shipped 2026-01-21)
- 🚧 **v1.1 Agent Framework** - Phases 8-11 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-7) - SHIPPED 2026-01-21</summary>

See: .planning/milestones/v1.0-ROADMAP.md

</details>

### v1.1 Agent Framework (In Progress)

**Milestone Goal:** Enable Commands to spawn typed Agents with shared input/output contracts — the foundation for agentic TSX programming.

- [x] **Phase 8: IR Extensions** - Foundation types for Agent and SpawnAgent nodes
- [ ] **Phase 9: Agent Transpilation** - Agent component with GSD frontmatter format
- [ ] **Phase 10: SpawnAgent Component** - Task() syntax generation in Commands
- [ ] **Phase 11: Type Safety** - Generic typing and cross-file validation

## Phase Details

### Phase 8: IR Extensions
**Goal**: Extend the IR layer with node types needed to represent Agent documents and SpawnAgent invocations
**Depends on**: v1.0 complete (Phase 7)
**Requirements**: IR-01, IR-02, IR-03, IR-04, IR-05
**Success Criteria** (what must be TRUE):
  1. AgentDocumentNode type compiles and can be instantiated in IR
  2. AgentFrontmatterNode includes fields: name, description, tools (string), color (optional)
  3. SpawnAgentNode type captures agent reference, model, description, and prompt
  4. TypeReference type can store cross-file interface references
  5. assertNever in emitter handles all new node types without compile errors
**Plans:** 1 plan

Plans:
- [x] 08-01-PLAN.md — IR node interfaces and discriminated union updates

### Phase 9: Agent Transpilation
**Goal**: Agent component transpiles to GSD-compatible markdown files in .claude/agents/
**Depends on**: Phase 8
**Requirements**: AGENT-01, AGENT-02, AGENT-03, AGENT-04, AGENT-05, AGENT-06
**Success Criteria** (what must be TRUE):
  1. `<Agent name="researcher" ...>` outputs to `.claude/agents/researcher.md`
  2. Agent frontmatter uses GSD format: `tools: "Read Grep Glob"` (string, not array)
  3. Agent component requires name and description props (compile error if missing)
  4. Agent component accepts optional tools and color props
  5. Agent body content renders as markdown sections below frontmatter
**Plans**: TBD

Plans:
- [ ] 09-01: Agent component parsing and IR transformation
- [ ] 09-02: Agent emitter and output routing

### Phase 10: SpawnAgent Component
**Goal**: SpawnAgent component emits GSD Task() syntax in command markdown
**Depends on**: Phase 9
**Requirements**: SPAWN-01, SPAWN-02, SPAWN-03, SPAWN-04, SPAWN-05, SPAWN-06
**Success Criteria** (what must be TRUE):
  1. SpawnAgent inside Command emits `Task(agent="researcher", model="{model}", ...)` syntax
  2. `{variable}` placeholders in model and prompt props pass through unchanged (no interpolation)
  3. SpawnAgent prompt prop supports multi-line template literals
  4. SpawnAgent description prop renders in Task() output
  5. Command with SpawnAgent builds without errors
**Plans**: TBD

Plans:
- [ ] 10-01: SpawnAgent component parsing and IR transformation
- [ ] 10-02: Task() syntax emitter

### Phase 11: Type Safety
**Goal**: Generic typing and cross-file validation ensure type-safe agent spawning
**Depends on**: Phase 10
**Requirements**: AGENT-07, AGENT-08, SPAWN-07, SPAWN-08, VALID-01, VALID-02, VALID-03
**Success Criteria** (what must be TRUE):
  1. Agent file can export TypeScript interface (e.g., `export interface ResearcherInput { ... }`)
  2. SpawnAgent can import Agent's interface for type checking
  3. Transpiler errors if referenced Agent file does not exist
  4. Transpiler errors if SpawnAgent input type doesn't match Agent's exported interface
  5. Error messages include source locations for both Command and Agent files
**Plans**: TBD

Plans:
- [ ] 11-01: Generic type parameter extraction
- [ ] 11-02: Cross-file validation

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. IR Extensions | v1.1 | 1/1 | ✓ Complete | 2026-01-21 |
| 9. Agent Transpilation | v1.1 | 0/2 | Not started | - |
| 10. SpawnAgent Component | v1.1 | 0/2 | Not started | - |
| 11. Type Safety | v1.1 | 0/2 | Not started | - |

---
*Roadmap created: 2026-01-21*
*Milestone: v1.1 Agent Framework*
