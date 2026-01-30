---
phase: 21
plan: 01
subsystem: primitives
tags: [typescript, ir, components, table, list]
requires:
  - phase: 20
    plan: 02
    provides: primitives/ directory structure
provides:
  - TableNode IR type with headers, rows, align, emptyCell properties
  - ListNode extended with start property
  - Table component with typed props
  - List component with typed props
affects:
  - phase: 21
    plan: 02
    needs: TableNode/ListNode IR and component stubs for transformation
tech-stack:
  added: []
  patterns:
    - Discriminated union IR nodes with kind property
    - Compile-time component stubs that return null
    - Export barrel pattern in jsx.ts
key-files:
  created:
    - src/primitives/structured.ts
  modified:
    - src/ir/nodes.ts
    - src/emitter/emitter.ts
    - src/jsx.ts
decisions:
  - slug: table-ir-design
    what: TableNode accepts headers, rows, align, emptyCell
    why: Provides full markdown table feature set with type safety
    alternatives: Could have made headers required, but optional enables data-only tables
  - slug: list-start-property
    what: Added optional start property to ListNode for ordered list numbering
    why: Enables custom numbered list start (e.g., "5. First item")
    alternatives: Could have left out, but limits markdown expressiveness
  - slug: emitter-stub
    what: Added throw stub for TableNode emission in emitter
    why: Enables IR to compile while deferring implementation to Plan 02
    alternatives: Could have implemented emission now, but plan split keeps changes atomic
  - slug: structured-primitives
    what: Created src/primitives/structured.ts for Table/List components
    why: Follows Phase 20 directory organization (primitives/ for basic markdown)
    alternatives: Could have put in jsx.ts directly, but primitives/ keeps code organized
metrics:
  duration: 2m 23s
  completed: 2026-01-26
---

# Phase 21 Plan 01: TableNode IR and Component Stubs Summary

**One-liner:** Added TableNode IR type and Table/List JSX component stubs with full TypeScript prop types for structured data emission.

## Overview

Created the type foundation for structured props support by adding TableNode to the IR and creating Table/List component stubs with TypeScript interfaces. This enables type-safe authoring of tables and lists from array props instead of manual JSX children.

## What Was Built

### TableNode IR Type (src/ir/nodes.ts)
- Added `TableNode` interface with:
  - `headers?: string[]` - Optional header row
  - `rows: string[][]` - Data rows (required, can be empty)
  - `align?: ('left' | 'center' | 'right')[]` - Per-column alignment
  - `emptyCell?: string` - Empty cell content (default: "")
- Added TableNode to BlockNode union type
- Extended ListNode with `start?: number` for ordered list numbering

### Component Stubs (src/primitives/structured.ts)
- Created `Table` component with `TableProps` interface
- Created `List` component with `ListProps` interface
- Added `TableAlignment` type for column alignment
- Followed primitives/markdown.ts pattern:
  - Components return null (compile-time only)
  - Comprehensive JSDoc with examples
  - TypeScript prop validation

### Exports (src/jsx.ts)
- Added structured data components section
- Exported Table, List, TableProps, ListProps, TableAlignment
- Maintained explicit named export pattern from Phase 20

### Emitter Stub (src/emitter/emitter.ts)
- Added case 'table' in emitBlock switch with throw stub
- Enables compilation while deferring implementation to Plan 02

## Technical Details

**IR Design:**
TableNode uses optional headers to support both header+data tables and data-only tables. The rows property is required but can be empty `[]` for edge cases.

**Type Safety:**
Both components accept `(string | number)[][]` for table rows and `(string | number)[]` for list items, enabling flexible data sources while maintaining type safety.

**Alignment:**
Per-column alignment array enables markdown table syntax:
- `left`: `:---`
- `center`: `:---:`
- `right`: `---:`

## Dependencies

**Requires:**
- Phase 20 Plan 02: primitives/ directory structure established

**Provides for:**
- Phase 21 Plan 02: IR nodes and component stubs ready for parser/emitter implementation

## Verification

**Build Status:**
✅ `npm run build` passes without errors
✅ TypeScript compiles component stubs
✅ TableNode in BlockNode union
✅ Components exported from jsx.ts

**Type Safety:**
- TableProps requires rows: (string | number)[][]
- ListProps requires items: (string | number)[]
- Optional properties have sensible defaults

## Files Changed

**Created:**
- `src/primitives/structured.ts` (88 lines) - Table and List component stubs

**Modified:**
- `src/ir/nodes.ts` (+8 lines) - TableNode interface, ListNode.start property
- `src/emitter/emitter.ts` (+4 lines) - Stub case for TableNode
- `src/jsx.ts` (+9 lines) - Export structured components

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 40fa890 | feat(21-01): add TableNode IR type and extend ListNode |
| 3397b3e | feat(21-01): add Table and List component stubs with TypeScript types |
| cb9484b | feat(21-01): export Table and List components from jsx.ts |

## Next Steps

Phase 21 Plan 02 will:
1. Add parser logic to transform Table/List JSX elements to TableNode/ListNode
2. Implement emitTable() and emitList() in emitter
3. Add test coverage for structured props
4. Verify end-to-end compilation from TSX to markdown

## Lessons Learned

**Pattern Consistency:**
Following Phase 20's directory structure (primitives/ for basic components) made placement obvious and kept code organized.

**Emitter Stub Strategy:**
Adding throw stub instead of TODO comment ensures the code path is explicit and compiler catches missing implementation if Table/List are used before Plan 02.

**Type Design:**
Making headers optional was the right choice - enables both styled data tables and simple data grids without headers.
