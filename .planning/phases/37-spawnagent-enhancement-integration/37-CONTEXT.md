# Phase 37: SpawnAgent Enhancement + Integration - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable agents to read their own definitions via `readAgentFile` prop on SpawnAgent, and validate that all v3.1 meta-prompting components integrate correctly end-to-end. This phase completes the v3.1 milestone.

</domain>

<decisions>
## Implementation Decisions

### Self-reading instruction
- Prose pattern: "First, read {path} for your role and instructions."
- Instruction always prepended first in the prompt (not configurable position)
- Path derived from agent prop: `{agentsDir}/{agent}.md`
- Default agents directory: `~/.claude/agents/`
- Agents directory configurable via build config (not per-component prop)
- Exact wording fixed, not customizable via prop
- Compile-time error if `readAgentFile` is true but no `agent` prop (can't self-read inline agent)

### Prop naming and API
- Prop name: `readAgentFile` (boolean)
- Boolean only — no options object
- TypeScript enforcement: type system requires `agent` prop when `readAgentFile` is true
- Fully backward compatible: omitting `readAgentFile` means no change to current behavior

### Integration test scope
- Test coverage: targeted component pairs + one full end-to-end scenario
- Test location: dedicated file `v31-integration.test.ts`
- Test style: snapshots for full compiled output
- Validate structure: MetaPrompt's ReadFile + ComposeContext produces valid XML that matches agent expectations

### Claude's Discretion
- Exact TypeScript conditional types for readAgentFile + agent enforcement
- Build config schema for agentsDir setting
- Which component pairs to test (beyond the mandatory pairs)

</decisions>

<specifics>
## Specific Ideas

- Self-reading instruction matches existing GSD pattern: "First, read ~/.claude/agents/gsd-phase-researcher.md for your role and instructions."
- Pattern derived from `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 37-spawnagent-enhancement-integration*
*Context gathered: 2026-02-01*
