# Phase 38: Unified Assign with from Prop - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Single unified `<Assign var={ref} from={source} />` component for all data sources. Replaces ReadFile and old Assign props entirely. Sources include file(), bash(), value(), and runtimeFn.

</domain>

<decisions>
## Implementation Decisions

### Source helper API
- file() and bash() support runtime Refs via template strings
  - `file(\`./.planning/phases/${phaseIdRef}.md\`)` → emits path with `$PHASE_ID`
  - `bash(\`git log ${commitRef}\`)` → emits command with `$COMMIT`
- value() is build-time resolution only
  - `value('literal')` — string literal
  - `value(process.env.KEY)` — resolved at compile time
  - `value(\`/claude/${MAX_ITERATION}\`)` — template with build-time constants
- value() accepts string literals only (no runtime Refs)
- file() is implemented as a wrapper around bash() internally
  - `file('path')` → internally becomes bash equivalent (`cat path`)
  - Shares emit logic, DRY implementation

### Source options
- file() has optional flag only: `file('path', { optional: true })`
- bash() has no options — just the command string
- value() has raw option: `value('str', { raw: true })` for unquoted emit

### Removal strategy (no deprecation)
- ReadFile: removed entirely (not in production, clean break)
- Old Assign props (bash="...", value="..."): removed entirely
- Only `from={source}` syntax supported going forward
- Update existing tests to new syntax
- Remove ReadFile from docs entirely

### Emit patterns
- bash() matches current Assign bash= emit format
- value() quotes by default: `X="value"`
- value() with `{ raw: true }`: `X=value` (unquoted)
- file() emits same as ReadFile does today (improved/type-safe version)
- runtimeFn emit unchanged from current pattern

### Claude's Discretion
- Source helper typing approach (branded types vs plain objects)
- Internal implementation structure for source wrappers
- Exact error handling for edge cases (Claude manages at runtime)

</decisions>

<specifics>
## Specific Ideas

- file() is conceptually "bash with cat" — share implementation
- Template string interpolation pattern: `${ref}` in TSX → `$VAR_NAME` in output
- Build-time vs runtime resolution is the key distinction between value() and file()/bash()

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-data-abstraction*
*Context gathered: 2026-02-01*
