# Requirements: React Agentic

**Defined:** 2026-01-31
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v3.1 Requirements

Requirements for Meta-Prompting milestone. Each maps to roadmap phases.

### Agent Contract

Components inside `<Agent>` that define its contract with callers.

- [ ] **AGNT-01**: `<Role>` component defines agent identity and responsibilities
- [ ] **AGNT-02**: `<UpstreamInput>` documents what context agent expects from caller
- [ ] **AGNT-03**: `<DownstreamConsumer>` documents what consumes agent's output
- [ ] **AGNT-04**: `<Methodology>` describes how the agent works (approach, patterns)
- [ ] **AGNT-05**: `<StructuredReturns>` with `<Return>` children defines typed return statuses

### Command Orchestration

Components inside `<Command>` for agent orchestration.

- [ ] **ORCH-01**: `<Uses agent={...}>` declares agent dependency at command level
- [ ] **ORCH-02**: `<Init>` wrapper groups initialization logic
- [ ] **ORCH-03**: `<ValidateEnvironment>` checks prerequisites before execution
- [ ] **ORCH-04**: `<ParseArguments>` defines argument schema for command
- [ ] **ORCH-05**: `<HandleReturn>` routes execution based on agent return status
- [ ] **ORCH-06**: `<Match status="...">` matches specific return status in HandleReturn

### Meta-Prompting

The context-gathering layer for intelligent prompt composition.

- [ ] **META-01**: `<MetaPrompt>` wrapper for context composition block
- [ ] **META-02**: `<GatherContext>` wrapper for file read operations
- [ ] **META-03**: `<ReadFile>` reads file into named variable for composition
- [ ] **META-04**: `<ComposeContext>` structures gathered content into XML blocks
- [ ] **META-05**: `<InlineField>` renders simple key-value inline (e.g., `**Phase:** 08`)
- [ ] **META-06**: `<Preamble>` renders intro text before structured content

### SpawnAgent Enhancement

Enhancements to existing SpawnAgent component.

- [ ] **SPWN-01**: `readAgentFile` prop enables agent self-reading pattern

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

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AGNT-01 | TBD | Pending |
| AGNT-02 | TBD | Pending |
| AGNT-03 | TBD | Pending |
| AGNT-04 | TBD | Pending |
| AGNT-05 | TBD | Pending |
| ORCH-01 | TBD | Pending |
| ORCH-02 | TBD | Pending |
| ORCH-03 | TBD | Pending |
| ORCH-04 | TBD | Pending |
| ORCH-05 | TBD | Pending |
| ORCH-06 | TBD | Pending |
| META-01 | TBD | Pending |
| META-02 | TBD | Pending |
| META-03 | TBD | Pending |
| META-04 | TBD | Pending |
| META-05 | TBD | Pending |
| META-06 | TBD | Pending |
| SPWN-01 | TBD | Pending |

**Coverage:**
- v3.1 requirements: 18 total
- Mapped to phases: 0
- Unmapped: 18 ⚠️

---
*Requirements defined: 2026-01-31*
*Last updated: 2026-01-31 after initial definition*
