# Roadmap: React Agentic

## Milestones

- **v1.0 MVP** — Phases 1-7 (shipped 2026-01-21)
- **v1.1 Agent Framework** — Phases 8-11 (shipped 2026-01-21)
- **v1.2 Type-Safe Communication** — Phase 12 (shipped 2026-01-21)
- **v1.3 Conditional Logic** — Phase 13 (shipped 2026-01-22)
- **v1.4 Agent Output Management** — Phases 14-15 (shipped 2026-01-22)
- **v1.5 Skill System** — Phase 16 (shipped 2026-01-22)
- **v1.6 State System** — Phase 17 (shipped 2026-01-22)
- **v1.7 MCP Configuration** — Phase 18 (shipped 2026-01-22)
- **v1.8 Scoped State Skills** — Phase 19 (shipped 2026-01-26)
- **v2.0 TSX Syntax Improvements** — Phases 20-25 (shipped 2026-01-27)
- **v2.1 Parser Refactoring** — Phase 26 (shipped 2026-01-31)
- **v3.0 Primitive/Composite Architecture** — Phases 27-33 (shipped 2026-01-31)
- **v3.1 Meta-Prompting** — Phases 34-37 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-7) — SHIPPED 2026-01-21</summary>

See: .planning/milestones/v1.0-ROADMAP.md

</details>

<details>
<summary>v1.1-v1.8 (Phases 8-19) — SHIPPED</summary>

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
<summary>v2.0 TSX Syntax Improvements (Phases 20-25) — SHIPPED 2026-01-27</summary>

See: .planning/milestones/v2.0-ROADMAP.md

- Phase 20: Module Restructure (2/2 plans)
- Phase 21: Structured Props (2/2 plans)
- Phase 22: Semantic Components (4/4 plans)
- Phase 23: Context Access Patterns (3/3 plans)
- Phase 24: Parser/Emitter Integration (3/3 plans)
- Phase 25: TSX Test Modernization (3/3 plans)

</details>

<details>
<summary>v2.1 Parser Refactoring (Phase 26) — SHIPPED 2026-01-31</summary>

See: .planning/milestones/ (no archive created - minor milestone)

- Phase 26: Parser Refactoring (4/4 plans) — Split parser.ts and transformer.ts into submodules

</details>

<details>
<summary>v3.0 Primitive/Composite Architecture (Phases 27-33) — SHIPPED 2026-01-31</summary>

See: .planning/milestones/v3.0-ROADMAP.md

- Phase 27: Baseline & Registry (2/2 plans) — Snapshot tests + primitive classification
- Phase 28: Content Types (1/1 plan) — CommandContent, AgentContent, SubComponentContent
- Phase 29: Reference Printing (2/2 plans) — Shell variable syntax, Ref component
- Phase 30: Component Composition (2/2 plans) — Props and children in custom components
- Phase 31: Content Validation (1/1 plan) — Compile-time nesting errors
- Phase 32: Composite Library (4/4 plans) — 7 user-definable composites
- Phase 33: Documentation (1/1 plan) — Primitives and composites docs

</details>

---

## v3.1 Meta-Prompting (Phases 34-37)

Components for agent contracts, command orchestration, and meta-prompting context composition. Enables structured context passing between commands and agents while keeping agent definitions self-contained.

### Phase 34: Agent Contract Components

**Goal:** Agents can define complete contracts describing identity, inputs, outputs, methodology, and return statuses.

**Dependencies:** None (builds on existing Agent primitive)

**Requirements:** AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05

**Plans:** 4 plans

Plans:
- [x] 34-01-PLAN.md — IR node types and component stubs
- [x] 34-02-PLAN.md — Parser transformers for contract components
- [x] 34-03-PLAN.md — Emitter and validation logic
- [x] 34-04-PLAN.md — Snapshot tests

**Success Criteria:**
1. Agent can declare identity and responsibilities with `<Role>` component ✓
2. Agent can document expected input context with `<UpstreamInput>` component ✓
3. Agent can document output consumers with `<DownstreamConsumer>` component ✓
4. Agent can describe working approach with `<Methodology>` component ✓
5. Agent can define typed return statuses with `<StructuredReturns>` containing `<StatusReturn>` children ✓

---

### Phase 35: Command Orchestration Components

**Goal:** Add OnStatusDefault component for catch-all agent return status handling.

**Dependencies:** Phase 34 (agents must have contracts to orchestrate)

**Requirements:** OnStatusDefault catch-all component (ORCH-01 through ORCH-06 removed per CONTEXT.md)

**Plans:** 1 plan

Plans:
- [x] 35-01-PLAN.md — OnStatusDefault component (IR, transformer, emitter, tests)

**Success Criteria:**
1. OnStatusDefault component can follow OnStatus blocks for catch-all handling ✓
2. OnStatusDefault with explicit output prop works standalone ✓
3. OnStatusDefault emits as "**On any other status:**" header ✓

---

### Phase 36: Meta-Prompting Components

**Goal:** Commands can compose structured context from file reads into typed XML blocks for agent consumption.

**Dependencies:** Phase 35 (orchestration provides the structure context lives in)

**Requirements:** META-01, META-02, META-03, META-04, META-05, META-06

**Success Criteria:**
1. Command can wrap context composition logic with `<MetaPrompt>` component
2. Command can group file reads with `<GatherContext>` wrapper
3. Command can read files into named variables with `<ReadFile path="..." as="...">` component
4. Command can structure content into XML blocks with `<ComposeContext>` containing `<XmlBlock>` children
5. Command can render simple key-value fields inline with `<InlineField name="..." value={...}>` component
6. Command can render intro text with `<Preamble>` component

---

### Phase 37: SpawnAgent Enhancement + Integration

**Goal:** SpawnAgent supports agent self-reading pattern and all v3.1 components work together end-to-end.

**Dependencies:** Phase 34, 35, 36 (all component types must exist)

**Requirements:** SPWN-01

**Success Criteria:**
1. SpawnAgent accepts `readAgentFile` prop that emits instruction for agent to read its own definition
2. Full scenario (command with Uses, Init, MetaPrompt, SpawnAgent, HandleReturn) compiles correctly
3. Agent with Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns compiles correctly
4. Integration test validates command-to-agent context flow

---

## Progress

**Execution Order:**
All phases complete through v3.0. v3.1 in progress.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 | 17/17 | Complete | 2026-01-21 |
| 8-19 | v1.1-v1.8 | 56/56 | Complete | 2026-01-26 |
| 20-25 | v2.0 | 17/17 | Complete | 2026-01-27 |
| 26 | v2.1 | 4/4 | Complete | 2026-01-31 |
| 27-33 | v3.0 | 13/13 | Complete | 2026-01-31 |
| 34 | v3.1 | 4/4 | Complete | 2026-02-01 |
| 35 | v3.1 | 1/1 | Complete | 2026-02-01 |
| 36 | v3.1 | 0/? | Pending | — |
| 37 | v3.1 | 0/? | Pending | — |

**Total:** 112 plans completed across 35 phases

---
*Roadmap created: 2026-01-21*
*v2.0 TSX Syntax Improvements shipped: 2026-01-27*
*v2.1 Parser Refactoring shipped: 2026-01-31*
*v3.0 Primitive/Composite Architecture shipped: 2026-01-31*
*v3.1 Meta-Prompting roadmap created: 2026-01-31*
