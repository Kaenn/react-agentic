---
phase: 32-composite-library
plan: 03
subsystem: composites
tags: [spawn-agent, retry, loop, control-flow, type-safe]

# Dependency graph
requires:
  - phase: 32-01
    provides: Composites directory infrastructure (barrel export, package.json subpath)
provides:
  - SpawnAgentWithRetry composite component
  - Retry loop pattern for agent spawning
  - Type-safe generic props interface
affects: [32-04, agent-commands]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite wrapping primitive with Loop/If/Break"
    - "Generic TInput/TOutput preservation across components"

key-files:
  created:
    - src/composites/SpawnAgentWithRetry.tsx
    - tests/composites/spawn-agent.test.ts
  modified:
    - src/composites/index.ts

key-decisions:
  - "Added breakWhen prop alongside retryWhen for explicit loop exit control"
  - "Output typed as RuntimeVarProxy<string> with cast for compatibility with V3SpawnAgentProps"

patterns-established:
  - "Agent composite pattern: wrap SpawnAgent with control flow for common patterns"

# Metrics
duration: 4min
completed: 2026-01-31
---

# Phase 32 Plan 03: SpawnAgentWithRetry Composite Summary

**SpawnAgentWithRetry composite wrapping SpawnAgent with configurable retry loop using maxRetries, retryWhen, and breakWhen props**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-31T18:57:45Z
- **Completed:** 2026-01-31T19:01:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created SpawnAgentWithRetry composite with built-in Loop/If/Break retry pattern
- Added maxRetries prop for configurable retry attempts (default: 3)
- Added retryWhen/breakWhen conditions for custom retry logic
- Preserved generic TInput/TOutput type parameters for type-safe agent references
- 3 JSDoc @example blocks showing basic retry, custom conditions, and AgentRef usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SpawnAgentWithRetry composite** - `bbecf9b` (feat)
2. **Task 2: Update barrel export and add tests** - `efd4918` (test)

**Plan metadata:** (to be committed)

## Files Created/Modified
- `src/composites/SpawnAgentWithRetry.tsx` - SpawnAgentWithRetry composite with retry loop pattern (149 lines)
- `src/composites/index.ts` - Barrel export for SpawnAgentWithRetry (already updated by plan 02)
- `tests/composites/spawn-agent.test.ts` - Tests for export and type correctness (52 lines, 5 tests)

## Decisions Made
- Added `breakWhen` prop alongside `retryWhen` to provide explicit control over loop exit conditions, since negating conditions as strings is not valid in the type system
- Used `as unknown as RuntimeVarProxy<string>` cast for output prop to match V3SpawnAgentProps type while preserving user-facing generic TOutput

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Barrel export already contained SpawnAgentWithRetry (added by plan 02 in anticipation) - no additional changes needed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SpawnAgentWithRetry ready for use in agent commands
- Pattern established for additional agent composites (e.g., SpawnAgentWithValidation)
- Phase 32 plan 04 can proceed with any remaining composite components

---
*Phase: 32-composite-library*
*Completed: 2026-01-31*
