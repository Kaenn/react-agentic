---
phase: 06-watch-error-handling
plan: 03
subsystem: cli
tags: [chokidar, file-watching, debounce, developer-experience]

# Dependency graph
requires:
  - phase: 06-01
    provides: TranspileError handling in build command
  - phase: 04-cli-interface
    provides: CLI build command structure
provides:
  - Watch mode for automatic rebuilds on file changes
  - Chokidar-based file watcher with debouncing
  - Graceful shutdown on SIGINT/SIGTERM
  - --watch CLI option
affects: [future CLI enhancements, developer workflow]

# Tech tracking
tech-stack:
  added: [chokidar]
  patterns: [debounced file watching, graceful shutdown]

key-files:
  created: [src/cli/watcher.ts]
  modified: [src/cli/commands/build.ts, package.json]

key-decisions:
  - "Chokidar with ignoreInitial:true to prevent double initial build"
  - "awaitWriteFinish with 100ms stability threshold for editor save detection"
  - "200ms default debounce delay to coalesce rapid changes"
  - "Remove stale source files from ts-morph project before rebuild (avoids cached AST)"
  - "--dry-run and --watch mutually exclusive (error on combination)"

patterns-established:
  - "Watcher pattern: createWatcher returns Watcher interface with close() method"
  - "Graceful shutdown: process.on SIGINT/SIGTERM calls watcher.close() before exit"
  - "Build refactor: runBuild function returns counts for reuse in watch mode"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 6 Plan 3: Watch Mode Summary

**Chokidar-based --watch option with 200ms debouncing, terminal clear on rebuild, and graceful Ctrl+C shutdown**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T08:50:00Z
- **Completed:** 2026-01-21T08:54:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Installed chokidar for native file system watching
- Created watcher module with configurable debounce delay
- Added --watch/-w option to build command
- Implemented graceful shutdown with "Stopping watch..." message
- Terminal clears before each rebuild for fresh output

## Task Commits

Each task was committed atomically:

1. **Task 1: Install chokidar and create watcher module** - `f757d29` (feat)
2. **Task 2: Add --watch option to build command** - `a3d614b` (feat)

## Files Created/Modified

- `src/cli/watcher.ts` - NEW: createWatcher function with debounced rebuild callback
- `src/cli/commands/build.ts` - Add --watch option, refactor runBuild function, handle graceful shutdown
- `package.json` - Add chokidar dependency

## Decisions Made

- **Debounce timing:** 200ms default balances responsiveness with avoiding duplicate builds
- **awaitWriteFinish:** 100ms stability threshold handles editors that save incrementally
- **ignoreInitial:** Prevents chokidar from firing on startup (we do explicit initial build)
- **Source file refresh:** Remove and re-add source files to ts-morph project on change (avoids stale AST)
- **Flag conflict:** Reject --dry-run --watch with clear error message

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unknown error type in watcher**
- **Found during:** Task 1 (watcher module creation)
- **Issue:** TypeScript 5.9 strict mode reports chokidar error handler parameter as `unknown`
- **Fix:** Changed `(error: Error)` to `(error: unknown)` with instanceof check
- **Files modified:** src/cli/watcher.ts
- **Verification:** npm run typecheck passes
- **Committed in:** f757d29 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Type safety fix required for TypeScript strict mode. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Watch mode complete and working
- Phase 6 complete (all 3 plans finished)
- Ready for Phase 7 (Example Validation)

---
*Phase: 06-watch-error-handling*
*Completed: 2026-01-21*
