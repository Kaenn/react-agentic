# Roadmap: React Agentic

## Milestones

- **v1.0 MVP** - Phases 1-7 (shipped 2026-01-21)
- **v1.1 Agent Framework** - Phases 8-11 (shipped 2026-01-21)
- **v1.2 Type-Safe Communication** - Phase 12 (shipped 2026-01-21)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-7) - SHIPPED 2026-01-21</summary>

See: .planning/milestones/v1.0-ROADMAP.md

</details>

### v1.1 Agent Framework (Complete)

**Milestone Goal:** Enable Commands to spawn typed Agents with shared input/output contracts — the foundation for agentic TSX programming.

- [x] **Phase 8: IR Extensions** - Foundation types for Agent and SpawnAgent nodes
- [x] **Phase 9: Agent Transpilation** - Agent component with GSD frontmatter format
- [x] **Phase 10: SpawnAgent Component** - Task() syntax generation in Commands
- [x] **Phase 11: Type Safety** - Generic typing and cross-file validation

### v1.2 Type-Safe Communication (Complete)

**Milestone Goal:** Replace manual prompt-based agent communication with type-driven input contracts — SpawnAgent uses typed `input` prop instead of freeform prompts.

- [x] **Phase 12: Typed SpawnAgent Input** - Input prop with VariableRef/object literal, auto-generated prompts, children as extra instructions

### v1.3 Conditional Logic (In Progress)

**Milestone Goal:** Enable conditional execution in commands and agents using `<If>` component with variable-based test expressions — matching the prose-based conditional pattern from GSD commands.

- [ ] **Phase 13: Conditional Logic** - If/Else components for shell test expressions, variable interpolation, compile-time syntax validation

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
**Plans:** 2 plans

Plans:
- [x] 09-01-PLAN.md — Agent component parsing and IR transformation
- [x] 09-02-PLAN.md — Agent emitter and output routing

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
**Plans:** 2 plans

Plans:
- [x] 10-01-PLAN.md — SpawnAgent component parsing and IR transformation
- [x] 10-02-PLAN.md — Task() syntax emitter

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
**Plans:** 2 plans

Plans:
- [x] 11-01-PLAN.md — Generic type parameter extraction
- [x] 11-02-PLAN.md — Cross-file validation

### Phase 12: Typed SpawnAgent Input
**Goal**: Replace prompt-based SpawnAgent with type-driven input prop that auto-generates structured prompts
**Depends on**: Phase 11
**Requirements**: INPUT-01, INPUT-02, INPUT-03, INPUT-04, INPUT-05
**Success Criteria** (what must be TRUE):
  1. SpawnAgent accepts `input` prop as VariableRef OR object literal
  2. `input` prop auto-generates structured prompt from Agent's interface contract
  3. SpawnAgent children become optional extra instructions (appended to auto-prompt)
  4. Compiler errors if `input` type doesn't match Agent's exported interface
  5. Existing `prompt` prop deprecated but still functional for backward compatibility
**Plans:** 4 plans

Plans:
- [x] 12-01-PLAN.md — IR and JSX type extensions for input prop
- [x] 12-02-PLAN.md — Transformer parsing for input prop and children
- [x] 12-03-PLAN.md — Emitter prompt generation from input
- [x] 12-04-PLAN.md — Validation tests and documentation

### Phase 13: Conditional Logic
**Goal**: Enable conditional execution in commands/agents using If/Else components that emit prose-based conditionals matching GSD patterns
**Depends on**: Phase 12
**Requirements**: COND-01, COND-02, COND-03, COND-04, COND-05, COND-06
**Success Criteria** (what must be TRUE):
  1. `<If test="condition">` component emits **If condition:** / **Otherwise:** prose pattern
  2. `<If>` accepts `test` prop as string shell expression or `VariableRef` comparison
  3. `<If>` children become the "then" block content
  4. `<Else>` component (optional sibling) provides "otherwise" content
  5. Nested `<If>` components produce properly indented conditional chains
  6. Variable interpolation in test expressions: `${varRef.ref}` or `{variable}` syntax
**Plans:** 3 plans

Plans:
- [ ] 13-01-PLAN.md — IR and JSX type extensions for If/Else
- [ ] 13-02-PLAN.md — Transformer parsing for If/Else with sibling detection
- [ ] 13-03-PLAN.md — Emitter and test command

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 8. IR Extensions | v1.1 | 1/1 | Complete | 2026-01-21 |
| 9. Agent Transpilation | v1.1 | 2/2 | Complete | 2026-01-21 |
| 10. SpawnAgent Component | v1.1 | 2/2 | Complete | 2026-01-21 |
| 11. Type Safety | v1.1 | 2/2 | Complete | 2026-01-21 |
| 12. Typed SpawnAgent Input | v1.2 | 4/4 | Complete | 2026-01-21 |
| 13. Conditional Logic | v1.3 | 0/3 | Not Started | — |

---
*Roadmap created: 2026-01-21*
*Milestone: v1.3 Conditional Logic*
