---
phase: 17-state-system
plan: 04
subsystem: emitter
tags: [state, emitter, skill-invocation, markdown]

# Dependency graph
requires:
  - phase: 17-01
    provides: ReadStateNode/WriteStateNode IR types
provides:
  - emitReadState method for state read skill invocation
  - emitWriteState method for state write skill invocation
  - Switch cases for readState/writeState node kinds
affects: [17-05, 17-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Skill invocation syntax: /react-agentic:state-read and /react-agentic:state-write"
    - "Dual-mode emit: field vs merge for write operations"

key-files:
  created: []
  modified:
    - src/emitter/emitter.ts

key-decisions:
  - "ReadState emits as prose-style skill invocation with store-in-variable instruction"
  - "WriteState field mode uses --field and --value flags"
  - "WriteState merge mode uses --merge flag with JSON string"
  - "Variable references emit as $VARIABLE_NAME (shell syntax)"

patterns-established:
  - "Skill invocation pattern: Use skill `/skill-name args` instruction format"
  - "Optional flag pattern: --field flag only included when field is specified"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 17 Plan 04: State Emitter Logic Summary

**Emitter methods for ReadState/WriteState IR nodes generating CLI skill invocations**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22
- **Completed:** 2026-01-22
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added ReadStateNode and WriteStateNode to emitter imports
- Added switch cases for 'readState' and 'writeState' node kinds
- Implemented emitReadState with full state and field-specific read patterns
- Implemented emitWriteState with field mode and merge mode patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ReadState emitter method** - `e9e1cec` (feat)
2. **Task 2: Add WriteState emitter method** - `d8d611f` (feat)

## Files Modified

- `src/emitter/emitter.ts` - Added imports, switch cases, and two emitter methods

## Output Format Examples

**ReadState (full state):**
```
Use skill `/react-agentic:state-read projectContext` and store result in `STATE`.
```

**ReadState (field):**
```
Use skill `/react-agentic:state-read projectContext --field "user.name"` and store result in `NAME`.
```

**WriteState (field mode with variable):**
```
Use skill `/react-agentic:state-write projectContext --field "user.name" --value $NAME`.
```

**WriteState (field mode with literal):**
```
Use skill `/react-agentic:state-write projectContext --field "status" --value "active"`.
```

**WriteState (merge mode):**
```
Use skill `/react-agentic:state-write projectContext --merge '{"updated": true}'`.
```

## Decisions Made

None - followed plan as specified.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in test files and build.ts unrelated to this plan. Transformer errors for state methods will be addressed in Plan 17-03 (useStateRef hook).

## User Setup Required

None - emitter logic is internal to the compiler.

## Next Phase Readiness

- Emitter ready to generate state skill invocations
- Requires Plan 17-03 (transformer) and Plan 17-05/06 (skills) for end-to-end functionality
- Switch statement now handles all BlockNode kinds from Plan 17-01

---
*Phase: 17-state-system*
*Completed: 2026-01-22*
