# Roadmap: React Agentic

## Milestones

- **v1.0 MVP** - Phases 1-7 (shipped 2026-01-21)
- **v1.1 Agent Framework** - Phases 8-11 (shipped 2026-01-21)
- **v1.2 Type-Safe Communication** - Phase 12 (shipped 2026-01-21)
- **v1.3 Conditional Logic** - Phase 13 (shipped 2026-01-22)
- **v1.4 Agent Output Management** - Phases 14-15 (shipped 2026-01-22)
- **v1.5 Skill System** - Phase 16 (shipped 2026-01-22)
- **v1.6 State System** - Phase 17 (planned)

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

### v1.3 Conditional Logic (Complete)

**Milestone Goal:** Enable conditional execution in commands and agents using `<If>` component with variable-based test expressions — matching the prose-based conditional pattern from GSD commands.

- [x] **Phase 13: Conditional Logic** - If/Else components for shell test expressions, variable interpolation, compile-time syntax validation

### v1.4 Agent Output Management (Complete)

**Milestone Goal:** Enable typed agent-to-command communication with standard status protocols — agents return structured outputs, commands handle them with type-safe status-based conditional blocks.

- [x] **Phase 14: Agent Output Schema** - BaseOutput/AgentStatus types, TOutput type parameter, auto-generated `<structured_returns>`
- [x] **Phase 15: Command Output Handling** - useOutput hook, OnStatus component, status-based conditional rendering

### v1.5 Skill System (Complete)

**Milestone Goal:** Enable TSX-authored Claude Code skills with hybrid static/generated file support — SKILL.md generated from TSX, with support for static scripts and templates.

- [x] **Phase 16: Skill Component** - Skill/SkillFile/SkillStatic components, multi-file output to .claude/skills/{name}/

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
- [x] 13-01-PLAN.md — IR and JSX type extensions for If/Else
- [x] 13-02-PLAN.md — Transformer parsing for If/Else with sibling detection
- [x] 13-03-PLAN.md — Emitter and test command

### Phase 14: Agent Output Schema
**Goal**: Define standard agent output types and auto-generate structured returns section in agent markdown
**Depends on**: Phase 13
**Requirements**: OUTPUT-01, OUTPUT-02, OUTPUT-03, OUTPUT-04, OUTPUT-05
**Success Criteria** (what must be TRUE):
  1. `AgentStatus` type defines standard codes: SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT
  2. `BaseOutput` interface requires `status: AgentStatus` with optional `message: string`
  3. Agent TOutput type parameter extends BaseOutput with status-specific fields
  4. Emitter generates `<structured_returns>` section from output type interface
  5. Generated returns show status-specific field templates (e.g., SUCCESS shows confidence, findings)
**Plans:** 3 plans

Plans:
- [x] 14-01-PLAN.md — AgentStatus and BaseOutput type definitions
- [x] 14-02-PLAN.md — TOutput extraction and IR representation
- [x] 14-03-PLAN.md — Emitter for structured_returns section

### Phase 15: Command Output Handling
**Goal**: Enable commands to handle agent outputs with type-safe status-based conditional blocks
**Depends on**: Phase 14
**Requirements**: OUTPUT-06, OUTPUT-07, OUTPUT-08, OUTPUT-09, OUTPUT-10
**Success Criteria** (what must be TRUE):
  1. `useOutput(AgentRef)` hook returns typed accessor bound to spawned agent
  2. `<OnStatus output={ref} status="SUCCESS">` component accepts output ref and status
  3. OnStatus children render as conditional prose block for that status
  4. Output field interpolation works: `{output.confidence}` emits placeholder
  5. Multiple OnStatus blocks for different statuses produce sequential conditional blocks
**Plans:** 3 plans

Plans:
- [x] 15-01-PLAN.md — useOutput hook and OutputRef type
- [x] 15-02-PLAN.md — OnStatus component parsing and IR
- [x] 15-03-PLAN.md — Emitter for status-based conditional blocks

### Phase 16: Skill Component
**Goal**: Enable TSX-authored Claude Code skills with hybrid static/generated file support
**Depends on**: Phase 15
**Requirements**: SKILL-01, SKILL-02, SKILL-03, SKILL-04, SKILL-05, SKILL-06
**Success Criteria** (what must be TRUE):
  1. `<Skill name="deploy" ...>` outputs to `.claude/skills/deploy/SKILL.md`
  2. Skill frontmatter includes name, description, disableModelInvocation, allowedTools
  3. `<SkillFile name="reference.md">` generates additional files in skill directory
  4. `<SkillStatic src="scripts/validate.sh" />` copies static files from source
  5. Skill body content renders as markdown in SKILL.md
  6. Build process handles multi-file skill output (SKILL.md + supporting files)
**Plans:** 5 plans

Plans:
- [x] 16-01-PLAN.md — IR and JSX type extensions for Skill
- [x] 16-02-PLAN.md — Transformer parsing for Skill/SkillFile/SkillStatic
- [x] 16-03-PLAN.md — Emitter and build command multi-file output
- [x] 16-04-PLAN.md — Public API exports
- [x] 16-05-PLAN.md — Integration test and documentation

**Details:**
Hybrid approach:
- SKILL.md: TSX-generated (dynamic content, TypeScript validation, variables)
- reference.md: TSX-generated via SkillFile (optional, for dynamic content)
- scripts/: Static files copied via SkillStatic
- templates/: Static files copied via SkillStatic

### v1.6 State System (Planned)

**Milestone Goal:** Enable typed, persistent state for Commands and Agents with compile-time validation — shared global state accessible via ReadState/WriteState components and CLI skills.

- [ ] **Phase 17: State System** - StateRegistry, ReadState/WriteState components, file adapter, CLI skills

### Phase 17: State System
**Goal**: Typed, persistent state system for Commands and Agents with compile-time validation
**Depends on**: Phase 16
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05, STATE-06
**Success Criteria** (what must be TRUE):
  1. `useStateRef<TSchema>(key)` creates typed state reference for compile-time validation
  2. `<ReadState state={ref}>` reads full state or nested field with compile-time type checking
  3. `<WriteState state={ref} field="path" value={val}>` writes single field with type validation
  4. `<WriteState state={ref} merge={partial}>` merges partial updates to state
  5. FileAdapter persists state to JSON file with create-if-missing behavior
  6. CLI skills `/react-agentic:state-read` and `/react-agentic:state-write` provide direct access
**Plans:** 6 plans

Plans:
- [ ] 17-01-PLAN.md — IR and JSX type extensions for State
- [ ] 17-02-PLAN.md — StateRegistry and FileAdapter implementation
- [ ] 17-03-PLAN.md — Transformer parsing for ReadState/WriteState
- [ ] 17-04-PLAN.md — Emitter for state operations
- [ ] 17-05-PLAN.md — Integration test and documentation
- [ ] 17-06-PLAN.md — CLI skills (state-read, state-write)

**Details:**
Core architecture:
- State Reference: useStateRef<TSchema>(key) creates typed reference
- Components: ReadState (full/field/nested), WriteState (field/merge modes)
- Storage: Abstract adapter pattern (FileAdapter first, Supabase/Postgres/Redis later)
- Type Safety: Compile-time validation via TypeScript generics
- Nested Access: Dot-notation paths (e.g., `config.debug`)
- CLI Skills: `/react-agentic:state-read` and `/react-agentic:state-write` for direct access

File structure:
```
src/state/
├── types.ts          # StateAdapter interface, StateConfig, helpers
├── file-adapter.ts   # JSON file adapter implementation
└── index.ts          # Public exports
```

## Progress

**Execution Order:**
Phases execute in numeric order: 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17

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
| 17. State System | v1.6 | 0/6 | Not Started | - |

---
*Roadmap created: 2026-01-21*
*v1.5 Skill System shipped 2026-01-22*
