---
phase: 07-example-validation
plan: 03
subsystem: parser
tags: [jsx, whitespace, list-items, tsx]

# Dependency graph
requires:
  - phase: 07-example-validation
    provides: Example TSX command file
provides:
  - JSX expression handling in list items
  - Space preservation pattern for inline elements
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use {' '} for explicit whitespace between inline JSX elements"
    - "JSX whitespace collapsing requires explicit space expressions"

key-files:
  created: []
  modified:
    - src/parser/transformer.ts
    - src/app/commit-helper.tsx
    - tests/parser/transformer.test.ts

key-decisions:
  - "JSX whitespace collapsing is expected browser/compiler behavior, not a bug to fix"
  - "Solution: Add JSX expression handling in transformListItem instead of changing extractText"
  - "Pattern: Use {' '} for explicit whitespace preservation in JSX"

patterns-established:
  - "JSX whitespace: Use {' '} pattern for spaces between inline elements like <b>label:</b>{' '}value"
  - "List item JSX expressions merged into last paragraph just like text and elements"

# Metrics
duration: 9min
completed: 2026-01-21
---

# Phase 07 Plan 03: Space Preservation in List Items Summary

**JSX expression handling in list items enables {' '} pattern for explicit whitespace preservation between inline elements**

## Performance

- **Duration:** 9 min
- **Started:** 2026-01-21T15:54:18Z
- **Completed:** 2026-01-21T16:03:05Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed space preservation in list items with bold labels (e.g., `**Working directory:** Current git repository`)
- Added JSX expression handling in transformListItem method
- Updated example to use correct JSX whitespace pattern
- Documented JSX whitespace behavior in tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Handle JSX expressions in list items** - `18e2cb2` (fix)
2. **Task 2: Update tests and example** - `21570c1` (test)

## Files Created/Modified
- `src/parser/transformer.ts` - Added JSX expression handling in transformListItem, XmlBlock support
- `src/app/commit-helper.tsx` - Updated to use `{' '}` for explicit spacing
- `tests/parser/transformer.test.ts` - Fixed expectations for JSX whitespace behavior, added space preservation test

## Decisions Made

**Root cause analysis changed the fix approach:**

The original plan assumed `normalizeWhitespace()` was trimming leading spaces. Analysis revealed the actual root cause is JSX whitespace collapsing - whitespace between closing tags and text is stripped by the JSX parser itself, not by our code.

**Decision:** Instead of changing from `extractText` to `extractInlineText` (which would cause regressions with trailing whitespace in nested lists), the fix adds JSX expression handling to `transformListItem` so that `{' '}` patterns work correctly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Identified correct root cause and fixed appropriately**
- **Found during:** Task 1 investigation
- **Issue:** Plan said to use `extractInlineText` but this causes trailing whitespace issues in nested lists
- **Fix:** Instead added JSX expression handling in `transformListItem` to support `{' '}` pattern
- **Files modified:** src/parser/transformer.ts
- **Verification:** All 155 tests pass, example produces correct output
- **Committed in:** 18e2cb2

**2. [Rule 1 - Bug] Example file needed JSX whitespace pattern**
- **Found during:** Task 2
- **Issue:** Example used `<b>label:</b> text` which loses space due to JSX rules
- **Fix:** Updated to `<b>label:</b>{' '}text` for explicit space preservation
- **Files modified:** src/app/commit-helper.tsx
- **Verification:** Transpiled output shows `**label:** text` with space
- **Committed in:** 21570c1

---

**Total deviations:** 2 auto-fixed (2 bugs - plan based on incomplete root cause analysis)
**Impact on plan:** Deviations improved correctness. Original approach would have caused regressions.

## Issues Encountered
- Initial `extractInlineText` change caused 3 test failures (trailing whitespace in nested lists)
- Reverted and investigated JSX parsing behavior to find correct solution
- Discovery: JSX completely strips whitespace between closing tags and subsequent text

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Gap from VERIFICATION.md is closed: criterion 6 now fully verified
- Space preservation works correctly with `{' '}` JSX pattern
- All 155 tests pass
- Example produces correct markdown output

---
*Phase: 07-example-validation*
*Completed: 2026-01-21*
