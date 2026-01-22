# Requirements: React Agentic v1.3

**Defined:** 2026-01-21
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v1.3 Requirements

### Conditional Logic

- [x] **COND-01**: `<If>` component accepts `test` prop (string shell expression)
- [x] **COND-02**: `<If>` component accepts `test` prop as VariableRef comparison (`${varRef.ref}`)
- [x] **COND-03**: `<If>` children render as "then" block content after **If condition:**
- [x] **COND-04**: `<Else>` component (sibling to `<If>`) provides **Otherwise:** content
- [x] **COND-05**: Nested `<If>` components produce readable conditional chains
- [x] **COND-06**: Variable interpolation in test props preserved at emit time (no compile-time evaluation)

## v1.1 Requirements

Requirements for Agent Framework milestone. Each maps to roadmap phases.

### Agent Component

- [x] **AGENT-01**: Agent component accepts `name` prop (string, required)
- [x] **AGENT-02**: Agent component accepts `description` prop (string, required)
- [x] **AGENT-03**: Agent component accepts `tools` prop (string, space-separated tool names)
- [x] **AGENT-04**: Agent component accepts `color` prop (string, terminal color name)
- [x] **AGENT-05**: Agent transpiles to `.claude/agents/{name}.md` output path
- [x] **AGENT-06**: Agent frontmatter uses GSD format (tools as string, not array)
- [x] **AGENT-07**: Agent supports generic type parameters `<Agent<TInput, TOutput>>`
- [x] **AGENT-08**: Agent file can export TypeScript interface for input contract

### SpawnAgent Component

- [x] **SPAWN-01**: SpawnAgent component accepts `agent` prop (string, agent name)
- [x] **SPAWN-02**: SpawnAgent component accepts `model` prop (string, supports `{variable}` syntax)
- [x] **SPAWN-03**: SpawnAgent component accepts `description` prop (string, human-readable)
- [x] **SPAWN-04**: SpawnAgent component accepts `prompt` prop (string/template literal)
- [x] **SPAWN-05**: SpawnAgent emits GSD Task() syntax in command markdown
- [x] **SPAWN-06**: SpawnAgent preserves `{variable}` placeholders in prompt (no interpolation)
- [x] **SPAWN-07**: SpawnAgent supports generic type parameter `<SpawnAgent<TInput>>`
- [x] **SPAWN-08**: SpawnAgent can import type from Agent file for validation

### Cross-File Validation

- [x] **VALID-01**: Transpiler validates referenced Agent file exists
- [x] **VALID-02**: Transpiler validates SpawnAgent input type matches Agent's exported interface
- [x] **VALID-03**: Error messages include source location for both Command and Agent files

### IR Extensions

- [x] **IR-01**: Add `AgentDocumentNode` type to IR
- [x] **IR-02**: Add `AgentFrontmatterNode` type with GSD-specific fields
- [x] **IR-03**: Add `SpawnAgentNode` type to IR
- [x] **IR-04**: Add `TypeReference` type for cross-file type tracking
- [x] **IR-05**: Update discriminated union and assertNever handling

## v1.4 Requirements

### Agent Output Management

- [ ] **OUTPUT-01**: Standard `AgentStatus` type with HTTP-like codes (SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT)
- [ ] **OUTPUT-02**: `BaseOutput` interface with `status: AgentStatus` and optional `message: string`
- [ ] **OUTPUT-03**: Agent output types extend `BaseOutput` with status-specific extra fields
- [ ] **OUTPUT-04**: `<Agent<TInput, TOutput>>` infers output schema from TOutput type parameter
- [ ] **OUTPUT-05**: Emitter auto-generates `<structured_returns>` section from output type
- [ ] **OUTPUT-06**: `useOutput(AgentRef)` hook returns typed accessor for spawned agent's output
- [ ] **OUTPUT-07**: `<OnStatus>` component accepts `output` prop (from useOutput) and `status` prop
- [ ] **OUTPUT-08**: `<OnStatus>` children render conditionally based on agent return status
- [ ] **OUTPUT-09**: Output field interpolation in OnStatus children: `{output.confidence}`, `{output.findings}`
- [ ] **OUTPUT-10**: Emitter generates status-based conditional prose blocks from OnStatus components

## Future Requirements

Deferred to v1.5+. Tracked but not in current roadmap.

### Agent Enhancements

- **AGENT-F01**: Agent section components (`<Role>`, `<Methodology>`, `<Output>`)

### SpawnAgent Enhancements

- **SPAWN-F01**: Auto-add `Task` to Command's `allowed-tools` when SpawnAgent used
- **SPAWN-F02**: Multiple SpawnAgent in single Command with ordering
- **SPAWN-F03**: Parallel spawn pattern support

### Validation Enhancements

- **VALID-F01**: Watch mode rebuilds dependents when Agent interface changes
- **VALID-F02**: MCP tool name validation against known tools
- **VALID-F03**: Model variable validation (`{researcher_model}` vs typos)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Runtime agent execution | We transpile to markdown, not execute agents |
| Dynamic agent references | `agent={getAgent()}` can't be resolved at transpile time |
| Agent discovery/registry | Over-engineering for v1.1 |
| Context variable interpolation | Runtime concern, we emit `{variable}` literally |
| Multi-agent composition | Agents don't compose, commands spawn them |
| @ reference resolution | Must preserve verbatim per GSD pattern |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IR-01 | Phase 8 | Complete |
| IR-02 | Phase 8 | Complete |
| IR-03 | Phase 8 | Complete |
| IR-04 | Phase 8 | Complete |
| IR-05 | Phase 8 | Complete |
| AGENT-01 | Phase 9 | Complete |
| AGENT-02 | Phase 9 | Complete |
| AGENT-03 | Phase 9 | Complete |
| AGENT-04 | Phase 9 | Complete |
| AGENT-05 | Phase 9 | Complete |
| AGENT-06 | Phase 9 | Complete |
| SPAWN-01 | Phase 10 | Complete |
| SPAWN-02 | Phase 10 | Complete |
| SPAWN-03 | Phase 10 | Complete |
| SPAWN-04 | Phase 10 | Complete |
| SPAWN-05 | Phase 10 | Complete |
| SPAWN-06 | Phase 10 | Complete |
| AGENT-07 | Phase 11 | Complete |
| AGENT-08 | Phase 11 | Complete |
| SPAWN-07 | Phase 11 | Complete |
| SPAWN-08 | Phase 11 | Complete |
| VALID-01 | Phase 11 | Complete |
| VALID-02 | Phase 11 | Complete |
| VALID-03 | Phase 11 | Complete |
| COND-01 | Phase 13 | Complete |
| COND-02 | Phase 13 | Complete |
| COND-03 | Phase 13 | Complete |
| COND-04 | Phase 13 | Complete |
| COND-05 | Phase 13 | Complete |
| COND-06 | Phase 13 | Complete |
| OUTPUT-01 | Phase 14 | Not Started |
| OUTPUT-02 | Phase 14 | Not Started |
| OUTPUT-03 | Phase 14 | Not Started |
| OUTPUT-04 | Phase 14 | Not Started |
| OUTPUT-05 | Phase 14 | Not Started |
| OUTPUT-06 | Phase 15 | Not Started |
| OUTPUT-07 | Phase 15 | Not Started |
| OUTPUT-08 | Phase 15 | Not Started |
| OUTPUT-09 | Phase 15 | Not Started |
| OUTPUT-10 | Phase 15 | Not Started |

**Coverage:**
- v1.1 requirements: 21 total (complete)
- v1.3 requirements: 6 total (complete)
- v1.4 requirements: 10 total (agent output management)
- Mapped to phases: 37
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-22 after Phase 13 completion (v1.3 conditional logic)*
