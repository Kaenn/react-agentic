---
phase: 38-data-abstraction
plan: 02
subsystem: compiler
tags: [tsx, parser, ir, emitter, variables, data-abstraction]

# Dependency graph
requires:
  - phase: 38-01
    provides: Source helper functions for unified data loading
provides:
  - Extended AssignNode IR with file and value.raw types
  - Transformer support for from prop with source helpers
  - Emitter support for all assignment source types
affects: [38-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified from prop pattern for Assign component"
    - "Source helper functions (file, bash, value, env) for data loading"
    - "Discriminated union for AssignNode.assignment types"

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/parser/transformers/variables.ts
    - src/emitter/emitter.ts

key-decisions:
  - "Extended AssignNode with discriminated union for assignment types"
  - "Added raw option to value type for unquoted bash values"
  - "Deferred runtimeFn support until context infrastructure ready"
  - "Maintained backward compatibility with legacy props (bash=, value=, env=)"

patterns-established:
  - "from prop pattern: <Assign var={v} from={file('path')} />"
  - "Source helpers with options: file(path, {optional: true})"
  - "Template literal support in all source helpers"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 38 Plan 02: Unified Assign with from Prop Summary

**Extended IR, transformer, and emitter to support unified from prop pattern with file/bash/value/env source helpers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T12:01:35Z
- **Completed:** 2026-02-02T12:04:55Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended AssignNode IR with 'file' type and 'raw' option for 'value' type
- Added transformer support for new from prop pattern with source helper detection
- Updated emitter to handle all assignment types with correct bash output
- Maintained full backward compatibility with existing bash=/value=/env= props

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend AssignNode IR with new source types** - `7e461c4` (feat)
2. **Task 2: Update transformer to handle from prop** - `e5190ef` (feat)
3. **Task 3: Update emitter for new assignment types** - `06a16b2` (feat)

## Files Created/Modified
- `src/ir/nodes.ts` - Extended AssignNode with discriminated union for 'file' and value.raw types
- `src/parser/transformers/variables.ts` - Added transformAssignWithFrom function for from prop pattern
- `src/emitter/emitter.ts` - Added 'file' case and raw option handling to emitAssignmentLine

## Decisions Made

**1. Discriminated union for AssignNode.assignment**
- Replaced simple type union with discriminated union for better type safety
- Each assignment type has its own properties (e.g., file has path + optional, value has content + raw)
- Enables exhaustive type checking in switch statements

**2. Deferred runtimeFn support**
- Plan included runtimeFn type but context infrastructure not ready (no ctx.runtimeFunctions map)
- Removed runtimeFn from IR and transformer to ship working foundation
- Can add runtimeFn in future phase when context infrastructure exists

**3. Template literal support in all helpers**
- Used existing extractTemplateContent utility from shared.ts
- Enables variable interpolation in paths and commands: file(`${dir}/file.md`)
- Consistent across all source types (file, bash, value, env)

**4. Backward compatibility maintained**
- Old props (bash=, value=, env=) still work during migration period
- from prop takes precedence when both patterns present
- All existing tests pass without modification

## Deviations from Plan

None - plan executed exactly as written, with the exception of deferring runtimeFn support until context infrastructure is ready (Rule 3 - blocking issue avoided by scoping to available infrastructure).

## Issues Encountered

**1. runtimeFn context infrastructure missing**
- **Problem:** Plan specified runtimeFn type but TransformContext lacks runtimeFunctions map
- **Resolution:** Removed runtimeFn from implementation scope to ship working foundation
- **Impact:** Minimal - file/bash/value/env source types are the core requirement, runtimeFn can be added later

**2. Build failed on initial emitter implementation**
- **Problem:** TypeScript complained about uninitialized 'line' variable in switch
- **Resolution:** Ensured all switch cases assign to line before use
- **Impact:** None - caught at compile time, fixed immediately

## Next Phase Readiness

- IR, transformer, and emitter pipeline complete for unified from prop pattern
- Ready for primitive components (Task, ReadFile) to adopt new syntax
- Existing legacy props still work, enabling gradual migration

---
*Phase: 38-data-abstraction*
*Completed: 2026-02-02*
