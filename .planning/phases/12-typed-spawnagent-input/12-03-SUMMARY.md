---
phase: 12-typed-spawnagent-input
plan: 03
subsystem: compiler
tags: [typescript, emitter, spawnagent, prompt-generation, xml]

# Dependency graph
requires:
  - phase: 12-02
    provides: SpawnAgentInput IR nodes with VariableRef and object literal support
provides:
  - Emitter generates XML-structured prompts from typed input
  - VariableRef input emits <input>{var}</input> block
  - Object literal input emits <prop>value</prop> per property
  - extraInstructions appended with double newline separator
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - generateInputPrompt-method: Private method to generate XML prompt from SpawnAgentInput
    - formatInputValue-method: Private method to format InputPropertyValue for output

key-files:
  created: []
  modified:
    - src/emitter/emitter.ts
    - tests/emitter/spawnagent-emitter.test.ts

key-decisions:
  - "xml-input-format: VariableRef wraps in <input> block, object literal creates per-property XML tags"
  - "lowercase-variables: Variable names in output are lowercase for consistency"
  - "prompt-precedence: If both prompt and input exist (shouldn't happen), prompt takes precedence"

patterns-established:
  - "generateInputPrompt: Emitter method to convert SpawnAgentInput to XML prompt"
  - "formatInputValue: Emitter method to format string/variable/placeholder values"

# Metrics
duration: 3min
completed: 2026-01-22
---

# Phase 12 Plan 03: Emitter Input Prompt Generation Summary

**Emitter generates XML-structured prompts from SpawnAgent typed input**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-22T23:36:00Z
- **Completed:** 2026-01-22T23:39:00Z
- **Tasks:** 2
- **Files modified:** 2
- **New tests:** 7

## Accomplishments
- Added `generateInputPrompt` method to generate XML from SpawnAgentInput
- Added `formatInputValue` method to handle string/variable/placeholder values
- Updated `emitSpawnAgent` to use input when prompt is not provided
- VariableRef input emits `<input>\n{var}\n</input>` format
- Object literal input emits `<prop>\nvalue\n</prop>` per property
- extraInstructions appended with double newline separator
- Full backward compatibility with prompt prop
- All 256 tests pass (249 existing + 7 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add prompt generation from input** - `fa5e39a` (feat)
2. **Task 2: Add emitter tests for input-based prompts** - `9ea91de` (test)

## Files Created/Modified
- `src/emitter/emitter.ts` - Added generateInputPrompt, formatInputValue methods; updated emitSpawnAgent
- `tests/emitter/spawnagent-emitter.test.ts` - Added 7 new tests for input-based prompt generation

## Decisions Made
- xml-input-format: VariableRef wraps content in `<input>` block, object literal creates `<propname>` tags per property
- lowercase-variables: All variable names in output are lowercase (CTX -> {ctx})
- prompt-precedence: Emitter checks prompt first, then input (defensive, transformer enforces exclusivity)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 (Typed SpawnAgent Input) is COMPLETE
- Full pipeline: TSX -> IR -> Markdown with typed input support
- Users can now use `input` prop with VariableRef or object literal
- Children become `extraInstructions` appended to generated prompt
- Ready for documentation update or next milestone

---
*Phase: 12-typed-spawnagent-input*
*Completed: 2026-01-22*
