---
phase: 15-command-output-handling
plan: 01
subsystem: api
tags: [typescript, hooks, agent-output, status-handling]

# Dependency graph
requires:
  - phase: 14-agent-output-schema
    provides: AgentStatus, BaseOutput types for output contracts
provides:
  - useOutput<T> hook returning OutputRef<T> for typed output access
  - OutputRef interface with agent binding and field() accessor
  - OnStatus component for status-based conditional blocks
  - OnStatusProps interface for component props
affects: [15-02, 15-03, transformer, emitter]

# Tech tracking
tech-stack:
  added: []
  patterns: [hook-returns-ref, compile-time-components]

key-files:
  created: []
  modified: [src/jsx.ts, src/index.ts]

key-decisions:
  - "field-returns-placeholder: field('key') returns '{output.key}' string for runtime interpolation"
  - "baseoutput-constraint: useOutput<T extends BaseOutput> ensures type safety"

patterns-established:
  - "Output hook pattern: useOutput follows useVariable pattern exactly"
  - "OnStatus pattern: OnStatus follows If/Else component pattern exactly"

# Metrics
duration: 2m
completed: 2026-01-22
---

# Phase 15 Plan 01: JSX Types Summary

**useOutput hook and OnStatus component for type-safe agent output handling in commands**

## Performance

- **Duration:** 2m
- **Started:** 2026-01-22
- **Completed:** 2026-01-22
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- OutputRef<T> interface with agent name, typed field() accessor, and phantom type marker
- useOutput<T extends BaseOutput> hook returning OutputRef for status-based handling
- OnStatusProps interface accepting OutputRef and AgentStatus
- OnStatus compile-time component (returns null, transformed at build time)
- Library exports updated to include new types and components
- Also added missing exports: If, Else, AgentStatus, BaseOutput, IfProps, ElseProps

## Task Commits

Each task was committed atomically:

1. **Task 1 + Task 2: useOutput hook and OnStatus component** - `8772ffe` (feat)

**Plan metadata:** [committed with final docs update]

## Files Created/Modified
- `src/jsx.ts` - Added Agent Output Handling section with OutputRef, useOutput, OnStatusProps, OnStatus
- `src/index.ts` - Added exports for new types and components, plus missing If/Else exports

## Decisions Made
- field() method returns `{output.${key}}` placeholder string for Claude runtime interpolation
- useOutput constrained to `T extends BaseOutput` for type safety
- Placed Agent Output Handling section after Agent Output Types, before Conditional Logic

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Added missing exports to index.ts**
- **Found during:** Task 2 verification
- **Issue:** If, Else, AgentStatus, BaseOutput, IfProps, ElseProps were not exported from index.ts
- **Fix:** Added to library exports alongside new useOutput/OnStatus exports
- **Files modified:** src/index.ts
- **Commit:** 8772ffe

## Issues Encountered
- Pre-existing TypeScript error in build.ts (unrelated to our changes) - noted in STATE.md as known issue

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- JSX types ready for transformer implementation (15-02)
- OutputRef and OnStatusProps available for IR node creation
- No blockers or concerns

---
*Phase: 15-command-output-handling*
*Completed: 2026-01-22*
