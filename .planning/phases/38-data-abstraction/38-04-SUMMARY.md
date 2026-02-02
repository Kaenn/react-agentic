---
phase: 38-data-abstraction
plan: 04
subsystem: compiler
tags: [typescript, tsx, ast-transformation, source-helpers, api-cleanup]

# Dependency graph
requires:
  - phase: 38-03
    provides: Integration tests proving new from={source} syntax works
provides:
  - Clean AssignProps interface with only var, from, args, comment props
  - ReadFile component completely removed from codebase
  - All tests migrated to new from={source} syntax
  - Legacy bash=/value=/env= props removed from transformers
affects: [future-assign-usage, file-reading-patterns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified from={source} pattern for all data sources"
    - "Source helper functions (file, bash, value, env) as only way to specify sources"

key-files:
  created: []
  modified:
    - src/primitives/variables.ts
    - src/parser/transformers/variables.ts
    - src/parser/transformer.ts
    - src/ir/nodes.ts
    - src/emitter/emitter.ts
    - src/emitter/runtime-markdown-emitter.ts
    - src/parser/transformers/dispatch.ts
    - src/parser/transformers/runtime-dispatch.ts
    - src/parser/transformers/primitives.ts
    - src/components/meta-prompting.ts
    - src/components/index.ts
    - src/jsx.ts
    - src/index.ts
    - tests/grammar/VariableComponents/assign.test.ts
    - tests/grammar/VariableComponents/assign-group.test.ts
    - tests/grammar/VariableComponents/assign-from.test.ts

key-decisions:
  - "No deprecation period - clean break to new syntax"
  - "ReadFile removed entirely (superseded by Assign + file() helper)"
  - "Legacy prop tests removed (no longer supported)"
  - "Both V1 and V3 transformers updated to require from prop"

patterns-established:
  - "Source helpers as the only data source specification method"
  - "from prop required, no fallback to legacy props"

# Metrics
duration: 12min
completed: 2026-02-02
---

# Phase 38 Plan 04: Legacy Syntax Removal Summary

**Removed legacy Assign props (bash=/value=/env=) and ReadFile component, migrated 41 tests to new from={source} syntax**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-02T12:24:35Z
- **Completed:** 2026-02-02T12:36:53Z
- **Tasks:** 3
- **Files modified:** 28

## Accomplishments
- Clean AssignProps interface with only var, from, args, comment props
- ReadFile component and all related code completely removed
- All 41 variable component tests migrated to new from={} syntax
- Full test suite passing (981 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove legacy Assign props** - `ed30987` (refactor)
   - Updated AssignProps to only accept var, from, args, comment
   - Removed bash, value, env props from interface
   - Updated transformer to require from prop with source helpers
   - Updated JSDoc examples to show new syntax

2. **Task 2: Remove ReadFile component** - `52f121b` (refactor)
   - Removed ReadFileNode from IR nodes
   - Removed emitReadFile from both emitters
   - Removed transformReadFile from V1 and V3 dispatchers
   - Removed ReadFile exports from jsx.ts and index.ts
   - Added migration note in components/meta-prompting.ts

3. **Task 3: Migrate existing tests to new syntax** - `3393e4e` (test)
   - Migrated assign.test.ts to use from={bash/value/env} syntax
   - Migrated assign-group.test.ts to use new syntax
   - Updated assign-from.test.ts to remove legacy compatibility tests
   - Fixed V1 transformer to match V3 (require from prop)

**Test updates:** `e00e511` (test: update tests and snapshots for legacy removal)
- Removed ReadFile test files (3 files)
- Updated state component test to use new syntax
- Updated snapshot tests for new output format

## Files Created/Modified

### Core Changes
- `src/primitives/variables.ts` - Cleaned AssignProps interface
- `src/parser/transformers/variables.ts` - Removed legacy prop handling
- `src/parser/transformer.ts` - Updated V1 transformer to require from prop
- `src/ir/nodes.ts` - Removed ReadFileNode interface
- `src/emitter/emitter.ts` - Removed emitReadFile method
- `src/emitter/runtime-markdown-emitter.ts` - Removed emitReadFile method

### Dispatcher Updates
- `src/parser/transformers/dispatch.ts` - Removed ReadFile case
- `src/parser/transformers/runtime-dispatch.ts` - Removed ReadFile transformation
- `src/parser/transformers/primitives.ts` - Removed transformReadFile

### Export Updates
- `src/components/meta-prompting.ts` - Added migration note
- `src/components/index.ts` - Removed ReadFile exports
- `src/jsx.ts` - Removed ReadFile exports
- `src/index.ts` - Removed ReadFile exports

### Test Migrations
- `tests/grammar/VariableComponents/assign.test.ts` - Migrated to from={} syntax
- `tests/grammar/VariableComponents/assign-group.test.ts` - Migrated to from={} syntax
- `tests/grammar/VariableComponents/assign-from.test.ts` - Removed legacy tests
- `tests/grammar/StateComponents/write-state.test.ts` - Updated to new syntax
- Removed: `tests/parser/meta-prompting.test.ts`, `tests/emitter/meta-prompting.test.ts`, `tests/parser/readfile-templates.test.ts`

## Decisions Made

None - plan executed exactly as written per CONTEXT.md "Removal strategy (no deprecation)".

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - clean removal with comprehensive test updates.

## Next Phase Readiness

- Data abstraction phase complete (38-01 through 38-04)
- Unified from={source} pattern established across codebase
- All legacy syntax removed
- Ready for feature development using new API

---
*Phase: 38-data-abstraction*
*Completed: 2026-02-02*
