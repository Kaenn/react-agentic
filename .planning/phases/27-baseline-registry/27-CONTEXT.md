# Phase 27: Baseline & Registry - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish snapshot tests for all current component markdown output and formalize primitive classification with a registry. This is safety infrastructure before refactoring begins in later phases.

</domain>

<decisions>
## Implementation Decisions

### Snapshot organization
- One snapshot file per component (Command.snap, Agent.snap, If.snap, etc.)
- Snapshots live near test files in tests/components/__snapshots__/
- File naming left to Claude's discretion based on discoverability

### Primitive boundary
- Infrastructure components are primitives: SpawnAgent, If, Else, Loop, Break, Return, AskUser
- Presentation components are primitives FOR NOW but destined for composite layer: Table, List, ExecutionContext, XmlBlock
- ExecutionContext specifically marked for composite migration in Phase 32

### Registry API
- `isPrimitive()` accepts component reference (not string)
- Registry exported for advanced user introspection/metaprogramming
- Full introspection API: isPrimitive(), getPrimitives(), getComposites(), getComponentInfo()
- Registry location: src/ir/registry.ts (near IR definitions)

### Test coverage scope
- Key variations coverage: basic usage + important prop combinations
- Include key nesting combinations (If+SpawnAgent, Loop+Break)
- Component markdown only (not full command/agent output)
- Runtime components snapshot their template with placeholders (e.g., `$VAR` references) — actual execution is Claude's responsibility at runtime

### Claude's Discretion
- Snapshot file naming convention
- Snapshot update workflow (standard Jest/Vitest behavior)
- Registry metadata format (whether to track migration destinations)
- Specific nesting combinations worth snapshotting

</decisions>

<specifics>
## Specific Ideas

- "Primitives handle plumbing (agents, control flow), composites handle presentation" — the mental model for classification
- Runtime components emit instructions for Claude (variable references, conditionals) — impossible to test execution, just test the template output

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-baseline-registry*
*Context gathered: 2026-01-31*
