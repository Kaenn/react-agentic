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
- **v3.1 Meta-Prompting** — Phases 34-37 (shipped 2026-02-01)
- **v3.2 Data Abstraction** — Phase 38 (in progress)

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

<details>
<summary>v3.1 Meta-Prompting (Phases 34-37) — SHIPPED 2026-02-01</summary>

See: .planning/milestones/v3.1-ROADMAP.md

- Phase 34: Agent Contract Components (4/4 plans) — Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns
- Phase 35: Command Orchestration Components (1/1 plan) — OnStatusDefault
- Phase 36: Meta-Prompting Components (3/3 plans) — ReadFile, MetaPrompt, GatherContext, ComposeContext, XmlBlock, InlineField, Preamble
- Phase 37: SpawnAgent Enhancement + Integration (2/2 plans) — readAgentFile prop, integration tests

</details>

---

## v3.2 Data Abstraction (Phase 38)

Unify data assignment patterns with a single `<Assign>` component using a `from` prop that accepts different source types (file, bash, value, runtimeFn). Deprecates separate ReadFile and simplifies the API.

### Phase 38: Unified Assign with from Prop

**Goal:** Single unified `<Assign var={ref} from={source} />` pattern for all data sources.

**Dependencies:** Phase 37 (builds on ReadFile and runtime patterns)

**Requirements:** See claudedocs/proposals/data-abstraction.md

**Plans:** 5 plans

Plans:
- [x] 38-01-PLAN.md — Source helpers and types (file, bash, value, env)
- [x] 38-02-PLAN.md — IR, transformer, and emitter support for from prop
- [x] 38-03-PLAN.md — Integration tests for from prop pattern
- [x] 38-04-PLAN.md — Remove legacy syntax and ReadFile component
- [ ] 38-05-PLAN.md — Gap closure: runtimeFn support for Assign from prop

**Details:**
- Implement `file()`, `bash()`, `value()`, `env()` source helper functions
- Extend `<Assign>` to accept `from` prop with source types
- Support runtimeFn directly as source (existing pattern)
- Optional file reads with `{ optional: true }`
- Remove `<ReadFile>` component entirely (not deprecated — clean break)
- Remove old Assign props (bash=, value=, env=) entirely

**Success Criteria:**
1. `<Assign var={x} from={file('path')} />` emits `X=$(cat path)`
2. `<Assign var={x} from={file('path', { optional: true })} />` emits `X=$(cat path 2>/dev/null)`
3. `<Assign var={x} from={bash('cmd')} />` emits `X=$(cmd)`
4. `<Assign var={x} from={value('str')} />` emits `X="str"` (quoted by default)
5. `<Assign var={x} from={value('str', { raw: true })} />` emits `X=str` (unquoted)
6. `<Assign var={x} from={env('HOME')} />` emits `X=$HOME`
7. `<Assign var={x} from={MyFn} args={{}} />` emits runtime function call
8. Old syntax removed, ReadFile removed (no deprecation period)

---

## Progress

**Execution Order:**
All phases complete through v3.1. v3.2 in progress.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-7 | v1.0 | 17/17 | Complete | 2026-01-21 |
| 8-19 | v1.1-v1.8 | 56/56 | Complete | 2026-01-26 |
| 20-25 | v2.0 | 17/17 | Complete | 2026-01-27 |
| 26 | v2.1 | 4/4 | Complete | 2026-01-31 |
| 27-33 | v3.0 | 13/13 | Complete | 2026-01-31 |
| 34-37 | v3.1 | 10/10 | Complete | 2026-02-01 |
| 38 | v3.2 | 4/5 | In Progress (gap closure) | - |

**Total:** 121 plans completed across 37 phases, Phase 38 gap closure in progress (1 plan)

---
*Roadmap created: 2026-01-21*
*v2.0 TSX Syntax Improvements shipped: 2026-01-27*
*v2.1 Parser Refactoring shipped: 2026-01-31*
*v3.0 Primitive/Composite Architecture shipped: 2026-01-31*
*v3.1 Meta-Prompting shipped: 2026-02-01*
