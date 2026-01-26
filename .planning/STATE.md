# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.
**Current focus:** v2.0 TSX Syntax Improvements - Phase 21 (Structured Props)

## Current Position

Phase: 21 of 24 (Structured Props)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-26 — Completed 21-01-PLAN.md

Progress: [####################] v1.8 COMPLETE | [###       ] v2.0: 3/13 plans
Next: Execute 21-02 (parser/emitter implementation)

## Milestone History

- v1.0 MVP: Shipped 2026-01-21 (7 phases, 17 plans)
  See: .planning/MILESTONES.md
- v1.1 Agent Framework: Shipped 2026-01-21 (4 phases, 7 plans)
- v1.2 Type-Safe Communication: Shipped 2026-01-22 (1 phase, 4 plans)
- v1.3 Conditional Logic: Shipped 2026-01-22 (1 phase, 3 plans)
- v1.4 Agent Output Management: Shipped 2026-01-22 (2 phases, 6 plans)
- v1.5 Skill System: Shipped 2026-01-22 (1 phase, 5 plans)
- v1.6 State System: Shipped 2026-01-22 (1 phase, 6 plans)
- v1.7 MCP Configuration: Shipped 2026-01-22 (1 phase, 4 plans)
- v1.8 Scoped State Skills: Shipped 2026-01-26 (1 phase, 4 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 58 (v1.0-v1.8, v2.0 in progress)
- Average duration: ~3m
- Total execution time: ~3 hours

**By Phase (v1.1-v1.8, v2.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8 | 1/1 | 2m 35s | 2m 35s |
| 9 | 2/2 | 7m 32s | 3m 46s |
| 10 | 2/2 | 4m 50s | 2m 25s |
| 11 | 2/2 | 7m 30s | 3m 45s |
| 12 | 4/4 | 12m | 3m |
| 14 | 3/3 | 9m | 3m |
| 15 | 3/3 | 8m 19s | 2m 46s |
| 16 | 5/5 | 11m | 2m 12s |
| 17 | 6/6 | ~12m | ~2m |
| 18 | 4/4 | ~15m | ~3m 45s |
| 19 | 4/4 | 11m 19s | 2m 50s |
| 20 | 2/2 | 5m | 2m 30s |
| 21 | 1/2 | 2m 23s | 2m 23s |

*Updated after each plan completion*

## Accumulated Context

### Decisions

All v1.0-v1.8 decisions logged in PROJECT.md Key Decisions table and previous STATE.md sections.

v2.0 roadmap decisions:
- Phase 20 first: Module restructure enables clean placement of new components
- Structured Props before Semantic: PROP-01/02 simpler, validates pattern before larger SEM batch
- Parser/Emitter last: Integration phase after all components defined

Phase 20 decisions (complete):
- primitives/ uses lowercase filenames (markdown.ts, control.ts) to match html-like primitive naming
- workflow/ uses PascalCase filenames (Command.ts, Agent.ts) to match React component convention
- Command.ts placed at workflow/ level (not in subdirectory) as single top-level entry point
- sections/index.ts created as placeholder with empty export for Phase 22
- jsx.ts uses explicit named re-exports (not export *) for tree-shaking and API control
- Type-only exports marked with type keyword per TypeScript 5.x best practices

Phase 21 decisions (in progress):
- TableNode headers optional: Enables both header+data tables and data-only tables
- ListNode.start property: Enables custom numbered list start (e.g., "5. First item")
- Emitter stub approach: Throw stub instead of TODO ensures explicit code path until Plan 02
- structured.ts location: Follows Phase 20 pattern (primitives/ for basic markdown components)

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) - unrelated to v2.0.

## Session Continuity

Last session: 2026-01-26
Stopped at: Completed 21-01-PLAN.md (TableNode IR and component stubs)
Resume with: Execute 21-02 (parser/emitter implementation)
