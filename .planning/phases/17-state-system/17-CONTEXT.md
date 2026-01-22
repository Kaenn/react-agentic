# Phase 17: State System - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Typed, persistent state system for Commands and Agents with compile-time validation. Users can read/write state via TSX components and CLI skills. Core deliverables: StateRegistry, ReadState/WriteState components, FileAdapter, CLI skills.

</domain>

<decisions>
## Implementation Decisions

### State Registry Design
- TypeScript interfaces for schema definition — compile-time validation
- Manual StateKey enum for key identification (e.g., `StateKey.PROJECT_CONTEXT`)
- Required defaults for every state — no undefined states
- No versioning in v1 — breaking changes require manual migration
- Global shared access — any Command/Agent can read/write any registered state
- Single central file: `src/state/registry.ts` — all states defined in one place
- One adapter per state — each state can specify its own storage adapter
- Deep readonly for nested state objects — must use WriteState to modify

### Read/Write Patterns
- Dot-notation strings for nested field access: `field="user.preferences.theme"`
- Compile-time path validation — type errors on invalid paths
- Compile-time error for invalid data — no runtime type checks
- Shallow merge for partial updates — `merge={partial}` replaces top-level keys
- ReadState supports full state or field reads: `<ReadState state={ref}>` or `<ReadState state={ref} field="path">`

### Storage Behavior
- Configurable file location — user specifies path in adapter config
- Create file with defaults on first read — never undefined
- Last write wins concurrency — no locking, simple semantics
- Pretty JSON for FileAdapter (local files), compact for external adapters

### CLI Integration
- Skill names: `/react-agentic:state-read` and `/react-agentic:state-write`
- JSON output always — parseable by scripts
- Permissions managed by MCP — out of scope for this phase

### Claude's Discretion
- CLI argument structure (key + field vs JSON body)
- Exact adapter interface design
- Error message formatting
- Internal caching strategy (if any)

</decisions>

<specifics>
## Specific Ideas

- State files should be human-readable for debugging (pretty JSON locally)
- External database adapters (future) should use compact format for efficiency
- Deep readonly prevents accidental mutations — explicit WriteState enforces intent

</specifics>

<deferred>
## Deferred Ideas

- Versioning and migration functions — future phase if needed
- Permission/authentication for CLI — managed by MCP layer
- File locking for concurrent access — not needed for typical single-agent usage
- External adapters (Redis, Postgres, Supabase) — add when needed

</deferred>

---

*Phase: 17-state-system*
*Context gathered: 2026-01-22*
