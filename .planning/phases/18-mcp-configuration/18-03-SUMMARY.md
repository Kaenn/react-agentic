---
phase: 18-mcp-configuration
plan: 03
subsystem: emitter
tags: [mcp, json, settings, merge]

# Dependency graph
requires:
  - phase: 18-02
    provides: MCPConfigDocumentNode from transformer
provides:
  - emitSettings function for IR to JSON conversion
  - mergeSettings function for settings.json merge logic
  - Build command routing for MCP config files
affects: [18-04-integration]

# Tech tracking
tech-stack:
  added: []
  patterns: [read-modify-write merge, skipWrite for pre-written files]

key-files:
  created: [src/emitter/settings.ts]
  modified: [src/emitter/index.ts, src/emitter/emitter.ts, src/cli/commands/build.ts, src/cli/output.ts, src/index.ts]

key-decisions:
  - "skipWrite-pattern: BuildResult with skipWrite flag for files already written (settings.json)"
  - "mcpserver-throws: MCPServerNode case in emitter throws - uses settings.ts instead"
  - "tsx-wins-on-conflict: Spread order existing first, then new servers for merge"

patterns-established:
  - "skipWrite pattern: Files pre-written (like merged settings.json) use skipWrite to skip Phase 2 writes"

# Metrics
duration: 8min
completed: 2026-01-22
---

# Phase 18 Plan 03: Emitter Summary

**Settings.json emitter with merge logic - emitSettings converts IR to JSON, mergeSettings preserves existing content**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-01-22
- **Completed:** 2026-01-22
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created settings.ts emitter module with emitSettings and mergeSettings functions
- Integrated MCP config handling into build command with batch merge
- Preserved existing settings.json content (permissions, other servers)
- Dry-run mode correctly skips file writes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create settings.ts emitter module** - `ed6f63e` (feat)
2. **Task 2: Export and build integration** - `9059e10` (feat)

## Files Created/Modified
- `src/emitter/settings.ts` - New emitter for MCP config to JSON conversion
- `src/emitter/index.ts` - Export emitSettings, mergeSettings
- `src/emitter/emitter.ts` - Added mcpServer case (throws, uses settings.ts)
- `src/cli/commands/build.ts` - MCP config routing and merge logic
- `src/cli/output.ts` - Added skipWrite to BuildResult interface
- `src/index.ts` - Comment documenting settings emitter exports

## Decisions Made
- **skipWrite pattern:** Added skipWrite flag to BuildResult for files already written by merge logic, preventing Phase 2 from overwriting merged settings.json
- **mcpServer throws:** MCPServerNode case in markdown emitter throws error since it should use settings.ts emitter
- **TSX wins on conflicts:** Merge order (existing spread first, new second) ensures TSX-defined servers override existing ones with same name

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed settings.json being overwritten after merge**
- **Found during:** Task 2 (Build integration)
- **Issue:** Phase 2 file writing loop overwrote the correctly merged settings.json with just the server configs (missing mcpServers wrapper)
- **Fix:** Added skipWrite property to BuildResult, set it for settings.json, skip in Phase 2 loop
- **Files modified:** src/cli/output.ts, src/cli/commands/build.ts
- **Verification:** Build test shows correct mcpServers wrapper and preserved existing settings
- **Committed in:** 9059e10 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix essential for correct merge behavior. No scope creep.

## Issues Encountered
None - pre-existing TypeScript errors (test-conditional.tsx, build.ts:90) remain but are unrelated to this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Settings emitter complete and integrated
- Ready for 18-04 integration testing and documentation
- Build command now routes MCP config TSX files to .claude/settings.json

---
*Phase: 18-mcp-configuration*
*Completed: 2026-01-22*
