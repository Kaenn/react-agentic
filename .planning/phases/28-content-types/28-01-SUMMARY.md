---
phase: 28-content-types
plan: 01
subsystem: type-system
tags: [typescript, discriminated-unions, compile-time-safety, ir-types]

# Dependency graph
requires:
  - phase: 27-baseline-registry
    provides: Baseline snapshot tests and primitive component registry
provides:
  - CommandContent type for typing Command children props
  - AgentContent type for typing Agent children props
  - SubComponentContent type for typing custom component children props with restrictions
  - Compile-time type safety preventing misuse of command-level features in presentation components
affects: [31-content-validation, 32-composite-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [discriminated-union-content-types, extract-based-type-restrictions]

key-files:
  created:
    - src/ir/content-types.ts
    - tests/ir/content-types.test.ts
  modified:
    - src/ir/index.ts

key-decisions:
  - "Use Extract<BaseBlockNode, {...}> for SubComponentContent to explicitly list allowed kinds"
  - "CommandContent and AgentContent identical initially (separate types allow future divergence)"
  - "SubComponentContent excludes SpawnAgent, OnStatus, control flow, runtime features"

patterns-established:
  - "Content type pattern: discriminated unions based on node kind for context-specific restrictions"
  - "Type-level testing pattern: @ts-expect-error directives verify compile-time exclusions"

# Metrics
duration: 1m
completed: 2026-01-31
---

# Phase 28 Plan 01: Content Types Summary

**TypeScript discriminated unions enable compile-time errors when users misuse SpawnAgent, control flow, or runtime features inside presentation components**

## Performance

- **Duration:** 1 min 4 sec
- **Started:** 2026-01-31T16:29:11Z
- **Completed:** 2026-01-31T16:30:15Z
- **Tasks:** 3
- **Files modified:** 2 created, 1 modified

## Accomplishments

- Created CommandContent type (all primitives including SpawnAgent, control flow, runtime)
- Created AgentContent type (all primitives including control flow, runtime, SpawnAgent)
- Created SubComponentContent type (document-level primitives only - excludes 10 node types)
- Exported all content types from react-agentic package root
- Comprehensive test suite with 24 tests validating type assignments and exclusions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create content-types.ts with discriminated union types** - `075fee2` (feat)
2. **Task 2: Export content types from IR and root package** - `8ebd24f` (feat)
3. **Task 3: Add content type tests** - `3e1f8f5` (test)

## Files Created/Modified

- `src/ir/content-types.ts` - Three discriminated union types for context-specific content restrictions
- `src/ir/index.ts` - Re-exports CommandContent, AgentContent, SubComponentContent
- `tests/ir/content-types.test.ts` - 24 tests including 10 @ts-expect-error exclusion tests

## Decisions Made

**1. Extract-based SubComponentContent definition**
- Used `Extract<BaseBlockNode, { kind: 'heading' } | ...>` pattern
- Explicitly lists all 15 allowed node kinds
- Rationale: More maintainable than Exclude (additions to BaseBlockNode won't leak into SubComponentContent)

**2. Separate CommandContent and AgentContent types**
- Both currently identical: `BaseBlockNode | RuntimeBlockNode`
- Separate type aliases allow future divergence
- Rationale: Commands might gain features agents shouldn't have (or vice versa)

**3. SubComponentContent excludes 10 node types**
- Excluded: SpawnAgentNode, OnStatusNode, IfNode, ElseNode, LoopNode, BreakNode, ReturnNode, AskUserNode, RuntimeVarDeclNode, RuntimeCallNode
- Rationale: These are document-level orchestration features, not presentation content

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 31 (Content Validation):**
- Content type foundations complete
- Users can type custom component children props with CommandContent, AgentContent, or SubComponentContent
- TypeScript will reject invalid assignments (e.g., SpawnAgentNode assigned to SubComponentContent)

**Foundation for Phase 32 (Composite Components):**
- Composite components can type their children prop as SubComponentContent
- Compile-time safety ensures users can't nest SpawnAgent inside presentation components

**No blockers or concerns.**

---
*Phase: 28-content-types*
*Completed: 2026-01-31*
