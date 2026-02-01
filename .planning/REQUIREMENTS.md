# Requirements: React Agentic

**Defined:** 2026-01-31
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v3.1 Requirements

Requirements for Meta-Prompting milestone. Each maps to roadmap phases.

### Agent Contract

Components inside `<Agent>` that define its contract with callers.

- [x] **AGNT-01**: `<Role>` component defines agent identity and responsibilities
- [x] **AGNT-02**: `<UpstreamInput>` documents what context agent expects from caller
- [x] **AGNT-03**: `<DownstreamConsumer>` documents what consumes agent's output
- [x] **AGNT-04**: `<Methodology>` describes how the agent works (approach, patterns)
- [x] **AGNT-05**: `<StructuredReturns>` with `<StatusReturn>` children defines typed return statuses

### Command Orchestration

Components inside `<Command>` for agent orchestration.

- [x] **ORCH-07**: `<OnStatusDefault>` catch-all for unhandled agent return statuses

Note: ORCH-01 through ORCH-06 removed per CONTEXT.md (Uses, Init, ValidateEnvironment, ParseArguments, HandleReturn, Match). OnStatusDefault added as replacement catch-all component.

### Meta-Prompting

The context-gathering layer for intelligent prompt composition.

- [x] **META-01**: `<MetaPrompt>` wrapper for context composition block
- [x] **META-02**: `<GatherContext>` wrapper for file read operations
- [x] **META-03**: `<ReadFile>` reads file into named variable for composition
- [x] **META-04**: `<ComposeContext>` structures gathered content into XML blocks
- [x] **META-05**: `<InlineField>` renders simple key-value inline (e.g., `**Phase:** 08`)
- [x] **META-06**: `<Preamble>` renders intro text before structured content

### SpawnAgent Enhancement

Enhancements to existing SpawnAgent component.

- [x] **SPWN-01**: `readAgentFile` prop enables agent self-reading pattern

## Future Requirements

Deferred to v3.2 or later. Tracked but not in current roadmap.

### Extended Return Actions

- **RACT-01**: `<Display>` action for showing messages in HandleReturn
- **RACT-02**: `<PresentCheckpoint>` action for user interaction
- **RACT-03**: `<AwaitUserResponse>` action for waiting on input
- **RACT-04**: `<OfferOptions>` with `<Option>` children for choices
- **RACT-05**: `<OfferNext>` action for suggesting next command

### Extended Context

- **ECTX-01**: `<AdditionalSections>` wrapper for extra context sections
- **ECTX-02**: `<Section name="...">` for named context sections

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full agent inlining (Scenario 3) | Agent self-reading pattern preferred for reusability |
| Dynamic agent selection | Static agent reference sufficient for v3.1 |
| Cross-command state | Each command invocation is independent |
| Agent chaining DSL | Handle via composition in user code |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGNT-01 | Phase 34 | Complete |
| AGNT-02 | Phase 34 | Complete |
| AGNT-03 | Phase 34 | Complete |
| AGNT-04 | Phase 34 | Complete |
| AGNT-05 | Phase 34 | Complete |
| ORCH-07 | Phase 35 | Complete |
| META-01 | Phase 36 | Complete |
| META-02 | Phase 36 | Complete |
| META-03 | Phase 36 | Complete |
| META-04 | Phase 36 | Complete |
| META-05 | Phase 36 | Complete |
| META-06 | Phase 36 | Complete |
| SPWN-01 | Phase 37 | Complete |

**Coverage:**
- v3.1 requirements: 13 total (6 removed per CONTEXT.md)
- Mapped to phases: 13
- Complete: 13

---
*Requirements defined: 2026-01-31*
*Traceability updated: 2026-02-01 (v3.1 milestone complete)*
