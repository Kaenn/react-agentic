---
phase: 27-baseline-registry
plan: 02
subsystem: compiler-core
tags: [ir, registry, introspection, classification, primitives]

# Dependency graph
requires:
  - phase: 26
    provides: Parser refactored to use dispatch pattern
provides:
  - Formal primitive component registry with classification API
  - isPrimitive() function for component type checking
  - getComponentInfo() with layer and migration tracking
  - Type-safe component introspection for metaprogramming
affects: [28-composite-pattern, 32-primitive-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Component registry pattern for primitive classification"
    - "Layer-based component categorization (infrastructure/presentation/document)"
    - "Migration target tracking for presentation primitives"

key-files:
  created:
    - src/ir/registry.ts
    - tests/ir/registry.test.ts
  modified:
    - src/ir/index.ts

key-decisions:
  - "Registry tracks 22 primitive components across 3 layers"
  - "Presentation primitives marked for Phase 32 composite migration"
  - "Registry exported for user introspection and metaprogramming"
  - "Classification based on component purpose: plumbing vs presentation"

patterns-established:
  - "Infrastructure primitives remain primitives (agents, control flow, runtime)"
  - "Presentation primitives destined for composite layer (table, list, xmlBlock, etc.)"
  - "Document primitives handle root structure (document, frontmatter)"

# Metrics
duration: 4min
completed: 2026-01-31
---

# Phase 27 Plan 02: Registry Summary

**Primitive component registry with 22 classified components across 3 layers, migration tracking for Phase 32 composite pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-31T15:56:42Z
- **Completed:** 2026-01-31T16:00:19Z
- **Tasks:** 3
- **Files modified:** 2 created, 1 modified

## Accomplishments

- Created formal registry with all 22 primitive components
- Classification API with layer tracking (infrastructure/presentation/document)
- Migration target tracking for 8 presentation primitives
- Comprehensive test coverage (43 tests, all passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create primitive registry module** - `2b847ce` (feat)
2. **Task 2: Export registry from IR and root index** - `236ca12` (feat)
3. **Task 3: Add registry tests** - `62dff44` (test)

## Files Created/Modified

- `src/ir/registry.ts` - Primitive component registry with PRIMITIVE_COMPONENTS set and classification functions
- `tests/ir/registry.test.ts` - Comprehensive test suite with 43 test cases covering all registry functions
- `src/ir/index.ts` - Added registry re-exports for package accessibility

## Component Classification

### Infrastructure Primitives (10)
Will remain primitives - handle plumbing, agents, control flow:
- spawnAgent, if, else, loop, break, return, askUser
- runtimeVarDecl, runtimeCall
- onStatus

### Presentation Primitives (8)
Destined for composite layer in Phase 32:
- table, list, indent
- executionContext, successCriteria, offerNext
- xmlBlock, step

All marked with `migrationTarget: 'composite'` in getComponentInfo()

### Document Primitives (4)
Root structure primitives:
- document, agentDocument
- frontmatter, agentFrontmatter

## Decisions Made

1. **Registry exported to package root** - Enables user introspection and metaprogramming use cases
2. **Layer-based classification** - Components classified by purpose: infrastructure (plumbing), presentation (formatting), document (structure)
3. **Migration target tracking** - Presentation primitives tagged with `migrationTarget: 'composite'` to guide Phase 32 migration
4. **Mental model formalized** - "Primitives handle plumbing (agents, control flow), composites handle presentation"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Registry infrastructure complete and tested. Ready for:
- Phase 27-03: Snapshot tests for all component markdown output
- Phase 28: Composite pattern design
- Phase 32: Migration of presentation primitives to composite layer

## Registry API

**Exported functions:**
- `isPrimitive(node: { kind: string }): boolean` - Check if component is primitive
- `getPrimitives(): ReadonlySet<string>` - Get all primitive kinds (22 total)
- `getComposites(): string[]` - Get composite kinds (empty for now, populated in Phase 32)
- `getComponentInfo(kind: string): ComponentInfo` - Get category, layer, migration target

**Success criteria verified:**
1. isPrimitive({ kind: 'if' }) returns true ✓
2. isPrimitive({ kind: 'unknown' }) returns false ✓
3. getComponentInfo('table').migrationTarget equals 'composite' ✓
4. getPrimitives().size is 22 (exceeds required 17) ✓
5. All 43 tests pass ✓

---
*Phase: 27-baseline-registry*
*Completed: 2026-01-31*
