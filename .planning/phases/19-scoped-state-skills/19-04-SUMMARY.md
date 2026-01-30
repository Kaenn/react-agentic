---
phase: 19
plan: 04
subsystem: state-skills
tags: [emitter, build-pipeline, multi-file-output, provider-system]

depends:
  requires: [19-02, 19-03]
  provides: [state-emitter, build-routing, public-api]
  affects: [future-providers]

tech-stack:
  patterns: [async-provider-loading, dynamic-import, multi-file-emission]

key-files:
  created:
    - src/emitter/state-emitter.ts
  modified:
    - src/emitter/index.ts
    - src/cli/commands/build.ts
    - src/index.ts
    - src/providers/index.ts

decisions:
  - id: async-provider-loading
    choice: "Use getProviderAsync with dynamic import for lazy initialization"
    reason: "Avoids circular dependency between providers/index.ts and providers/sqlite.ts"
    alternatives: ["Sync import with careful ordering", "Manual registration call"]

metrics:
  duration: 4m 7s
  completed: 2026-01-22
---

# Phase 19 Plan 4: State Emitter Summary

State emitter implemented with async provider loading and multi-file output to .claude/skills/.

## One-Liner

Async emitState generates 4+ skill files per State component using provider templates, with main init.all.md orchestration.

## What Was Built

### State Emitter (src/emitter/state-emitter.ts)

- `emitState(doc: StateDocumentNode): Promise<StateEmitResult>` - generates all skills for a state
- `generateMainInitSkill(stateNames: string[])` - creates orchestration skill for all inits
- Uses `getProviderAsync` to ensure provider is loaded before skill generation
- Returns `StateEmitResult` with skills array and stateName for tracking

### Build Command Integration (src/cli/commands/build.ts)

- Routes `stateDocument` to state emitter
- Tracks `allStateNames` for main init generation
- Generates main `init.all.md` when any states are processed
- Skills output to `.claude/skills/{state}.{op}.md`

### Provider System Fix (src/providers/index.ts)

- Added `getProviderAsync` with lazy dynamic import
- Resolves circular dependency between index.ts and sqlite.ts
- ESM hoisting issue fixed without restructuring entire module

### Public API Exports (src/index.ts)

- `State`, `Operation` components
- `StateProps`, `OperationProps`, `SQLiteConfig` types
- `getProvider`, `getProviderAsync` functions
- `ProviderTemplate`, `GeneratedSkill` types

## Verification Results

1. TypeScript compiles (only pre-existing errors remain)
2. Build test produced 6 files:
   - releases.init.md (CREATE TABLE with schema)
   - releases.read.md
   - releases.write.md
   - releases.delete.md
   - releases.record.md (custom operation)
   - init.all.md (orchestration)

3. **SSTATE-08 verified**: TypeScript interface correctly generates SQL schema:
   - `lastVersion: string` -> `lastVersion TEXT`
   - `bumpType: 'major' | 'minor' | 'patch'` -> `bumpType TEXT CHECK(bumpType IN ('major', 'minor', 'patch'))`
   - `updatedAt: string` -> `updatedAt TEXT`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Circular dependency in provider registry**

- **Found during:** Task 3 verification
- **Issue:** `export { SQLiteProvider } from './sqlite.js'` in providers/index.ts caused sqlite.ts to import before Map was initialized (ESM hoisting)
- **Fix:** Removed synchronous re-export, added `getProviderAsync` with dynamic import for lazy loading
- **Files modified:** src/providers/index.ts, src/emitter/state-emitter.ts, src/cli/commands/build.ts
- **Commit:** b45150c

## Implementation Notes

The async pattern for provider loading is a deliberate choice:
- Avoids complex module restructuring
- Works correctly with ESM module evaluation order
- Providers self-register when dynamically imported
- Build command already runs in async context, so `await` is natural

## Output Generated

- `src/emitter/state-emitter.ts` - New state emitter
- `src/emitter/index.ts` - Export additions
- `src/cli/commands/build.ts` - StateDocumentNode routing
- `src/index.ts` - Public API exports
- `src/providers/index.ts` - Async provider loading

## Next Phase Readiness

Phase 19 is now complete. The Scoped State Skills feature is fully implemented:
- Plan 1: IR nodes for State/Operation
- Plan 2: SQLite provider with skill templates
- Plan 3: State transformer for TSX parsing
- Plan 4: State emitter and build integration

Ready for user testing and documentation updates.
