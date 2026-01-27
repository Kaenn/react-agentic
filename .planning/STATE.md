# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-26)

**Core value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.
**Current focus:** v2.0 TSX Syntax Improvements - Phase 25 (TSX Test Modernization)

## Current Position

Phase: 25 of 25 (TSX Test Modernization)
Plan: 2 of ? in current phase
Status: In progress
Last activity: 2026-01-27 — Completed 25-02-PLAN.md

Progress: [####################] v1.8 COMPLETE | [################] v2.0: 16/16+ plans
Next: Plan 03 or phase completion

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
- Total plans completed: 66 (v1.0-v1.8, v2.0 in progress)
- Average duration: ~3m
- Total execution time: ~3.5 hours

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
| 21 | 2/2 | 7m 45s | 3m 52s |
| 22 | 4/4 | 15m | 3m 45s |
| 23 | 3/3 | 15m | 5m |
| 24 | 3/3 | 7m 36s | 2m 32s |
| 25 | 2/? | 5m 8s | 2m 34s |

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

Phase 21 decisions (complete):
- TableNode headers optional: Enables both header+data tables and data-only tables
- ListNode.start property: Enables custom numbered list start (e.g., "5. First item")
- Emitter stub approach: Throw stub instead of TODO ensures explicit code path until Plan 02
- structured.ts location: Follows Phase 20 pattern (primitives/ for basic markdown components)
- Numeric literal parsing: Custom parsing for start={5} since getAttributeValue only handles strings
- Pipe escaping: Use \| in table cells to prevent markdown table syntax breakage
- Newline handling: Convert newlines to spaces in table cells (markdown tables don't support multi-line)

Phase 22 decisions (complete):
- XmlSection reuses XmlBlockNode: Dynamic tag name needs no new IR node type
- ExecutionContext prefix prop: Allows customization (default '@') for different reference syntax
- SuccessCriteria flexible input: String shorthand or {text, checked} objects for checkbox state
- XML wrapper components use XmlBlockNode: DeviationRules, CommitRules, WaveExecution, CheckpointHandling
- OfferNext route structure: name (required), path (required), description (optional)
- toSnakeCase helper at module level: Enables reuse across transformer
- AST parsing pattern for object arrays: follow parseRowsAttribute style with manual property traversal
- Boolean literal detection via getKind() for checked property
- ExecutionContext prefix deduplication: Avoid double-prefixing when paths already start with prefix

Phase 23 decisions (complete):
- CommandContext includes name, description, skill, outputPath, sourcePath
- AgentContext extends CommandContext with tools, model
- Single parameter required for render props pattern detection
- Support both block body and expression body for arrow functions
- If<T> and Loop<T> use unknown as default generic for backwards compatibility
- LoopNode emits as **For each {as} in {items}:** pattern
- Step component supports heading/bold/xml variants with heading as default
- Numeric literal parsing extended for Step number prop

Phase 24 decisions (complete):
- Created src/app/verification/ for test commands - permanent verification infrastructure
- Each test file covers multiple edge cases and variants
- Tests verify markdown output correctness, not TypeScript types
- Control flow test focuses on Loop/OnStatus (If/Else already covered in scenarios)
- Integration test includes at least one example of every v2.0 component
- All three Step variants (heading/bold/xml) verified in dedicated test
- Separate documentation files for structured vs semantic components
- TSX → markdown transformation pairs throughout all docs
- Render props documented as optional pattern (progressive disclosure)

Phase 25 decisions (in progress):
- Replace manual ul/ol with List component in scenario tests
- Maintain original manual tests for comparison in 2.4-lists-rendering.tsx
- Step bold variant for dependent steps in sequential chains
- ExecutionContext placed after introductory paragraph
- SuccessCriteria placed at end before any final YAML output

### Roadmap Evolution

- Phase 25 added: TSX Test Modernization - update all src/app/ test files to use v2.0 syntax features

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) - unrelated to v2.0.

## Session Continuity

Last session: 2026-01-27
Stopped at: Completed 25-02-PLAN.md
Resume with: Plan 03 or phase completion review
