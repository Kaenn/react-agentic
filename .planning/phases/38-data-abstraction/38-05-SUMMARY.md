---
phase: 38-data-abstraction
plan: 05
subsystem: compiler
tags: [runtime-fn, assign, ast-analysis, ir, emitter]

# Dependency graph
requires:
  - phase: 38-data-abstraction
    provides: Unified Assign from prop with file/bash/value/env sources
provides:
  - RuntimeFn support in Assign from prop pattern
  - Static AST detection of runtimeFn() wrappers
  - Runtime function invocation via runtime.js
affects: [future phases using runtime functions with Assign]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Static AST analysis for runtimeFn wrapper detection
    - Literal-only args extraction (runtime refs deferred)

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/parser/transformers/variables.ts
    - src/parser/transformer.ts
    - src/emitter/emitter.ts
    - tests/grammar/VariableComponents/assign-from.test.ts

key-decisions:
  - "Static AST analysis over runtime type guards (transformer has basic TransformContext)"
  - "Literal values only in args prop - runtime variable refs deferred to future work"
  - "V1 transformer duplicates V3 transformer logic (documented maintenance burden)"

patterns-established:
  - "Source file scanning for runtimeFn wrapper declarations"
  - "Object literal extraction for literal args"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 38 Plan 05: RuntimeFn Support in Assign Summary

**Runtime function assignment via static AST detection - `<Assign var={x} from={MyFn} args={{}} />` emits runtime.js invocation**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-02T08:22:24Z
- **Completed:** 2026-02-02T08:26:42Z
- **Tasks:** 4/4
- **Files modified:** 5

## Accomplishments

- Extended AssignNode IR with runtimeFn type (fnName, args fields)
- Static AST detection of runtimeFn() wrapper declarations in both V1 and V3 transformers
- Runtime.js invocation emitter with proper bash escaping
- Integration test suite with 3 test cases covering empty args, single arg, and multiple args
- Full test suite passes (984 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add runtimeFn type to AssignNode IR** - `453cb07` (feat)
2. **Task 2: Update transformer to detect RuntimeFnComponent** - `dc24f90` (feat)
3. **Task 3: Add runtimeFn case to emitter** - `39fd411` (feat)
4. **Task 4: Add integration tests for runtimeFn source** - `54e1a57` (test)

## Files Created/Modified

- `src/ir/nodes.ts` - Added runtimeFn type to AssignNode.assignment union
- `src/parser/transformers/variables.ts` - Added RuntimeFnComponent detection with helper functions
- `src/parser/transformer.ts` - Duplicated detection logic in V1 transformer
- `src/emitter/emitter.ts` - Added runtimeFn case emitting runtime.js invocation
- `tests/grammar/VariableComponents/assign-from.test.ts` - Added 3 integration tests for runtimeFn source

## Decisions Made

**Static AST analysis approach:**
- Transformer uses basic TransformContext (not RuntimeTransformContext)
- Can't use runtime type guards - must scan source file AST
- Implemented `findRuntimeFnName()` to detect `const X = runtimeFn(fnName)` patterns

**Literal values only:**
- Plan explicitly scopes to literal values in args prop (strings, numbers, booleans)
- Runtime variable references in args (e.g., `args={{ path: phaseDir }}`) deferred to future work
- Keeps gap closure focused and testable

**V1/V3 transformer duplication:**
- Both transformers need identical runtimeFn detection logic
- Added same helper functions to both files
- Confirms maintenance burden identified in Plan 38-03
- Future refactoring should consolidate transformers

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Transformer duplication discovered:**
- Initial tests failed - only updated V3 transformer (variables.ts)
- V1 transformer (transformer.ts) also used by test suite
- Solution: Added identical detection logic to V1 transformer
- Confirms Plan 38-03 concern about multi-transformer requirements

## Next Phase Readiness

**RuntimeFn assignment complete:**
- All data sources now supported in unified Assign from prop (file, bash, value, env, runtimeFn)
- Success criterion 7 gap closed
- Phase 38 fully complete (4/4 plans)

**Known limitations:**
- Args prop only supports literal values (strings, numbers, booleans)
- Runtime variable refs in args require future enhancement
- Plan explicitly deferred this for scope control

**Maintenance considerations:**
- V1/V3 transformer duplication creates maintenance burden
- Consider consolidating transformers in future refactoring phase

---
*Phase: 38-data-abstraction*
*Completed: 2026-02-02*
