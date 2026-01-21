# Requirements: React Agentic v1.1

**Defined:** 2026-01-21
**Core Value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.

## v1.1 Requirements

Requirements for Agent Framework milestone. Each maps to roadmap phases.

### Agent Component

- [ ] **AGENT-01**: Agent component accepts `name` prop (string, required)
- [ ] **AGENT-02**: Agent component accepts `description` prop (string, required)
- [ ] **AGENT-03**: Agent component accepts `tools` prop (string, space-separated tool names)
- [ ] **AGENT-04**: Agent component accepts `color` prop (string, terminal color name)
- [ ] **AGENT-05**: Agent transpiles to `.claude/agents/{name}.md` output path
- [ ] **AGENT-06**: Agent frontmatter uses GSD format (tools as string, not array)
- [ ] **AGENT-07**: Agent supports generic type parameters `<Agent<TInput, TOutput>>`
- [ ] **AGENT-08**: Agent file can export TypeScript interface for input contract

### SpawnAgent Component

- [ ] **SPAWN-01**: SpawnAgent component accepts `agent` prop (string, agent name)
- [ ] **SPAWN-02**: SpawnAgent component accepts `model` prop (string, supports `{variable}` syntax)
- [ ] **SPAWN-03**: SpawnAgent component accepts `description` prop (string, human-readable)
- [ ] **SPAWN-04**: SpawnAgent component accepts `prompt` prop (string/template literal)
- [ ] **SPAWN-05**: SpawnAgent emits GSD Task() syntax in command markdown
- [ ] **SPAWN-06**: SpawnAgent preserves `{variable}` placeholders in prompt (no interpolation)
- [ ] **SPAWN-07**: SpawnAgent supports generic type parameter `<SpawnAgent<TInput>>`
- [ ] **SPAWN-08**: SpawnAgent can import type from Agent file for validation

### Cross-File Validation

- [ ] **VALID-01**: Transpiler validates referenced Agent file exists
- [ ] **VALID-02**: Transpiler validates SpawnAgent input type matches Agent's exported interface
- [ ] **VALID-03**: Error messages include source location for both Command and Agent files

### IR Extensions

- [x] **IR-01**: Add `AgentDocumentNode` type to IR
- [x] **IR-02**: Add `AgentFrontmatterNode` type with GSD-specific fields
- [x] **IR-03**: Add `SpawnAgentNode` type to IR
- [x] **IR-04**: Add `TypeReference` type for cross-file type tracking
- [x] **IR-05**: Update discriminated union and assertNever handling

## Future Requirements

Deferred to v1.2+. Tracked but not in current roadmap.

### Agent Enhancements

- **AGENT-F01**: Agent section components (`<Role>`, `<Methodology>`, `<Output>`)
- **AGENT-F02**: Structured return type definition in Agent
- **AGENT-F03**: Return signal type exports (`RESEARCH_COMPLETE`, etc.)

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
| AGENT-01 | Phase 9 | Pending |
| AGENT-02 | Phase 9 | Pending |
| AGENT-03 | Phase 9 | Pending |
| AGENT-04 | Phase 9 | Pending |
| AGENT-05 | Phase 9 | Pending |
| AGENT-06 | Phase 9 | Pending |
| SPAWN-01 | Phase 10 | Pending |
| SPAWN-02 | Phase 10 | Pending |
| SPAWN-03 | Phase 10 | Pending |
| SPAWN-04 | Phase 10 | Pending |
| SPAWN-05 | Phase 10 | Pending |
| SPAWN-06 | Phase 10 | Pending |
| AGENT-07 | Phase 11 | Pending |
| AGENT-08 | Phase 11 | Pending |
| SPAWN-07 | Phase 11 | Pending |
| SPAWN-08 | Phase 11 | Pending |
| VALID-01 | Phase 11 | Pending |
| VALID-02 | Phase 11 | Pending |
| VALID-03 | Phase 11 | Pending |

**Coverage:**
- v1.1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after Phase 8 completion*
