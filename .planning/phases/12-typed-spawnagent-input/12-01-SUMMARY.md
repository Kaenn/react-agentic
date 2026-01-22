---
phase: 12-typed-spawnagent-input
plan: 01
subsystem: compiler
tags: [typescript, ir, jsx, spawnagent, typed-input]

# Dependency graph
requires:
  - phase: 11-type-safety
    provides: TypeReference extraction and cross-file validation
provides:
  - SpawnAgentInput discriminated union type
  - InputProperty and InputPropertyValue types
  - Optional input and extraInstructions fields on SpawnAgentNode
  - SpawnAgentProps.input accepting VariableRef or object literal
affects: [12-02 transformer, 12-03 emitter]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - discriminated-union-for-input: SpawnAgentInput uses type discriminator for variable vs object
    - backward-compat-deprecation: prompt marked optional with @deprecated JSDoc

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/jsx.ts
    - src/emitter/emitter.ts

key-decisions:
  - "prompt-optional-fallback: Emitter uses empty string fallback for optional prompt"

patterns-established:
  - "InputPropertyValue: discriminated union for string/variable/placeholder input values"
  - "SpawnAgentInput: discriminated union for variable-ref vs object-literal input"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 12 Plan 01: IR and JSX Type Extensions Summary

**SpawnAgentInput discriminated union and optional input/extraInstructions fields for typed SpawnAgent prop**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T23:28:00Z
- **Completed:** 2026-01-21T23:31:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended SpawnAgentNode with optional input and extraInstructions fields
- Created SpawnAgentInput discriminated union (variable | object forms)
- Added InputProperty and InputPropertyValue types for object literal handling
- Updated SpawnAgentProps with input prop and deprecated prompt
- All 234 existing tests pass (backward compatible)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SpawnAgentNode in IR** - `f13e42b` (feat)
2. **Task 2: Update SpawnAgentProps in JSX** - `e7a42a8` (feat)

## Files Created/Modified
- `src/ir/nodes.ts` - Added SpawnAgentInput types, made prompt optional, added input/extraInstructions fields
- `src/jsx.ts` - Added input prop, deprecated prompt, added children prop for extra instructions
- `src/emitter/emitter.ts` - Fixed to handle optional prompt with empty string fallback

## Decisions Made
- prompt-optional-fallback: Emitter uses `node.prompt ?? ''` to handle optional prompt during migration period

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed emitter for optional prompt**
- **Found during:** Task 1 (Extend SpawnAgentNode in IR)
- **Issue:** Making prompt optional in IR caused TypeScript error in emitter (string | undefined not assignable to string)
- **Fix:** Added null coalescing `node.prompt ?? ''` with comment explaining future enhancement
- **Files modified:** src/emitter/emitter.ts
- **Verification:** Build succeeds, all tests pass
- **Committed in:** f13e42b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- IR types ready for transformer to parse input prop
- SpawnAgentProps ready for JSX authoring with typed input
- Emitter ready for enhancement to generate prompt from input (12-03)

---
*Phase: 12-typed-spawnagent-input*
*Completed: 2026-01-21*
