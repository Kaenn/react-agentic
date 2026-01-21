---
phase: 06-watch-error-handling
plan: 01
subsystem: cli
tags: [typescript, error-handling, ts-morph, picocolors, developer-experience]

# Dependency graph
requires:
  - phase: 04-cli-interface
    provides: CLI build command and output utilities
  - phase: 05-composition
    provides: Transformer with component resolution
provides:
  - TranspileError class with source location tracking
  - TypeScript-style error formatting with code snippets
  - getNodeLocation helper for ts-morph AST nodes
  - logTranspileError for formatted CLI error output
affects: [06-02 watch mode, future error handling enhancements]

# Tech tracking
tech-stack:
  added: []
  patterns: [source-located errors, TypeScript-style error formatting]

key-files:
  created: [src/cli/errors.ts]
  modified: [src/parser/transformer.ts, src/cli/output.ts, src/cli/commands/build.ts]

key-decisions:
  - "TranspileError extends Error with location/sourceCode properties"
  - "Error format follows TypeScript: file:line:col - error: message"
  - "Code snippets show line number and caret pointing to error position"
  - "picocolors used for consistent colored output (cyan path, red error, dim line numbers)"

patterns-established:
  - "createError pattern: transformer methods use this.createError(msg, node) for consistent location capture"
  - "Error formatting: header line + blank + code line + caret line"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 6 Plan 1: Source-Located Errors Summary

**TranspileError class with TypeScript-style formatting showing file:line:col, code snippets, and red caret indicators**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T14:46:29Z
- **Completed:** 2026-01-21T14:50:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created TranspileError class that captures source location and code context
- Implemented TypeScript-style error formatting with colored output
- Updated all transformer error sites to include node position
- Integrated error handling into build command for formatted CLI output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create error utilities with source location support** - `de467c2` (feat)
2. **Task 2: Update transformer to throw TranspileError with source location** - `41efb6c` (feat)

## Files Created/Modified

- `src/cli/errors.ts` - NEW: TranspileError class, SourceLocation interface, formatTranspileError, getNodeLocation
- `src/parser/transformer.ts` - Import TranspileError, add createError helper, update all throw statements
- `src/cli/output.ts` - Add logTranspileError function
- `src/cli/commands/build.ts` - Detect TranspileError and use formatted output, pass sourceFile to transform()

## Decisions Made

- **TranspileError design:** Extends Error with optional location and sourceCode properties for flexible error creation
- **Error format:** TypeScript-style `file:line:col - error: message` followed by code snippet with caret
- **Color scheme:** cyan for file path, dim for line numbers, red for "error:" and caret, default for message and code
- **Location extraction:** Use ts-morph's `getLineAndColumnAtPos(node.getStart())` for accurate 1-based positions

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Error handling foundation complete for watch mode implementation
- All existing tests pass (154 tests)
- TranspileError can be caught and formatted by any CLI command

---
*Phase: 06-watch-error-handling*
*Completed: 2026-01-21*
