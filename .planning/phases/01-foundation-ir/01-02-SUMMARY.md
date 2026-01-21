---
phase: 01-foundation-ir
plan: 02
subsystem: ir
tags: [typescript, discriminated-unions, markdown, emitter, ir, gray-matter, vitest]

# Dependency graph
requires:
  - phase: 01-01
    provides: TypeScript project with pnpm, Vitest, ESM configuration
provides:
  - IR node types for all planned node kinds (discriminated unions)
  - Markdown emitter with exhaustiveness checking
  - Comprehensive unit tests for emitter (41 tests)
affects: [02-transformer, all subsequent phases using IR]

# Tech tracking
tech-stack:
  added: []
  patterns: [Discriminated unions with kind property, switch-based emission with assertNever]

key-files:
  created:
    - src/ir/nodes.ts
    - src/ir/index.ts
    - src/emitter/emitter.ts
    - src/emitter/utils.ts
    - src/emitter/index.ts
    - tests/emitter/heading.test.ts
    - tests/emitter/paragraph.test.ts
    - tests/emitter/list.test.ts
    - tests/emitter/code.test.ts
    - tests/emitter/document.test.ts
  modified:
    - src/index.ts

key-decisions:
  - "IR uses discriminated unions with kind property for type-safe switching"
  - "Emitter uses class with listStack for nested list context tracking"
  - "gray-matter used for frontmatter YAML stringification"
  - "Unordered list markers use dash (-) per CONTEXT.md style decisions"

patterns-established:
  - "IR nodes: All have kind property as discriminator"
  - "Emitter pattern: switch with default assertNever for exhaustiveness"
  - "Test pattern: Inline snapshots for simple cases, document tests for complex output"
  - "Export pattern: Module index.ts re-exports all from implementation files"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 1 Plan 02: IR Types and Markdown Emitter Summary

**Discriminated union IR types for all node kinds with switch-based Markdown emitter using gray-matter for frontmatter**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T22:57:00Z
- **Completed:** 2026-01-21T22:59:30Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments
- Defined all IR node types: Block (Heading, Paragraph, List, CodeBlock, Blockquote, ThematicBreak, XmlBlock, Raw), Inline (Text, Bold, Italic, InlineCode, Link, LineBreak), Special (Frontmatter, Document, ListItem)
- Implemented MarkdownEmitter class with exhaustiveness checking on all switch statements
- Created 41 unit tests covering all node types with inline snapshots
- Integrated gray-matter for YAML frontmatter stringification

## Task Commits

Each task was committed atomically:

1. **Task 1: Define IR node types as discriminated unions** - `0c67fc2` (feat)
2. **Task 2: Implement Markdown emitter with switch-based emission** - `b1cd74c` (feat)
3. **Task 3: Create comprehensive emitter unit tests** - `466f650` (test)

## Files Created/Modified
- `src/ir/nodes.ts` - All IR node type definitions with discriminated unions
- `src/ir/index.ts` - IR module re-exports
- `src/emitter/emitter.ts` - MarkdownEmitter class with emit method
- `src/emitter/utils.ts` - assertNever helper for exhaustiveness
- `src/emitter/index.ts` - Emitter module exports
- `src/index.ts` - Main library exports (updated)
- `tests/emitter/heading.test.ts` - Heading level and formatting tests
- `tests/emitter/paragraph.test.ts` - Paragraph and inline formatting tests
- `tests/emitter/list.test.ts` - Ordered, unordered, and nested list tests
- `tests/emitter/code.test.ts` - Code block and inline code tests
- `tests/emitter/document.test.ts` - Full document emission tests

## Decisions Made
- Used discriminated unions with `kind` property (TypeScript handbook recommendation)
- MarkdownEmitter class encapsulates list stack state for nested list handling
- assertNever helper duplicated in utils.ts (emitter-specific) alongside ir/nodes.ts
- All tests use inline snapshots for easy maintenance and review

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed nested list double-indentation**
- **Found during:** Task 3 (running list tests)
- **Issue:** Nested lists were being double-indented (emitList adds indent via stack, emitListItem was adding additional indent)
- **Fix:** Removed extra indentation in emitListItem when handling nested lists - emitList already handles indentation via listStack
- **Files modified:** src/emitter/emitter.ts
- **Verification:** All 7 list tests pass including nested unordered and nested mixed
- **Committed in:** 466f650 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Bug fix was necessary for correct nested list output. No scope creep.

## Issues Encountered
None beyond the auto-fixed nested list bug.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- IR types complete and exported from main library
- Emitter ready to convert IR to Markdown
- All tests pass, ready for Phase 2 (Transformer: TSX to IR)
- Key exports available: `DocumentNode`, `BlockNode`, `InlineNode`, `emit`, `MarkdownEmitter`

---
*Phase: 01-foundation-ir*
*Completed: 2026-01-21*
