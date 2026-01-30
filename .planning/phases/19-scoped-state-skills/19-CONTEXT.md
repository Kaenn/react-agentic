# Phase 19: Scoped State Skills - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Refactor state system to use provider-agnostic, scoped skills. Each State definition generates namespaced CRUD skills with deterministic code execution. State component binds to provider, auto-generates read/write/delete/init skills, and supports custom Operation components for semantic operations beyond CRUD.

</domain>

<decisions>
## Implementation Decisions

### Provider API design
- Claude's discretion on config structure (flat props vs config object)
- SQLite only for this phase — localfile and Supabase are future phases
- Separate init skill for schema creation (not inline in CRUD skills)
- Also auto-generate a main `init` command that orchestrates all state init skills
- Hardcoded database paths baked into generated skills

### Skill output format
- Bash + sqlite3 CLI for all generated code
- JSON output always (`sqlite3 -json` piped through jq)
- Claude's discretion on error handling pattern
- Documented skills with comments explaining SQL logic

### Operation semantics
- Args inferred from TypeScript interface fields used in body
- Body contains SQL template with placeholders (`$variable` syntax)
- Claude's discretion on CRUD composition
- Transaction block (BEGIN...COMMIT) for multi-statement operations

### State schema handling
- Convention-based type mapping:
  - `string` → TEXT
  - `number` → INTEGER
  - `boolean` → INTEGER (0/1)
  - `Date` → TEXT (ISO format)
- Flatten nested objects with underscores: `config.debug` → `config_debug` column
- Init skill inserts one default row with sensible defaults from interface
- Strict runtime validation: check types, ranges, enums before SQL execution

### Claude's Discretion
- Config structure (flat props vs config object per provider)
- Error handling pattern for skills
- How Operations compose with auto-generated CRUD
- Specific validation logic implementation

</decisions>

<specifics>
## Specific Ideas

- Init skill pattern: `{state}.init` creates schema, main `init` command orchestrates all
- Skill naming: `releases.read`, `releases.write`, `releases.delete`, `releases.init`
- Custom operations: `releases.record` for semantic operations with SQL templates
- JSON output enables Claude to parse structured responses reliably

</specifics>

<deferred>
## Deferred Ideas

- Localfile provider — future phase
- Supabase provider — future phase
- Environment variable connection strings — decided hardcoded for now

</deferred>

---

*Phase: 19-scoped-state-skills*
*Context gathered: 2026-01-22*
