---
phase: 03-full-element-coverage
plan: 02
subsystem: parser/emitter
tags: [div, Markdown, XmlBlock, attributes, passthrough]

dependency-graph:
  requires: ["03-01"]
  provides: ["div-transformation", "markdown-passthrough", "xml-attributes"]
  affects: ["04-developer-experience"]

tech-stack:
  added: []
  patterns:
    - XML name validation regex
    - Attribute passthrough on XmlBlockNode

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/parser/transformer.ts
    - src/emitter/emitter.ts
    - tests/parser/transformer.test.ts
    - tests/emitter/document.test.ts

decisions:
  - id: 03-02-01
    choice: "div with name attribute becomes XmlBlock with that name"
    rationale: "Familiar JSX syntax for creating Claude Code's XML sections"
  - id: 03-02-02
    choice: "div without name outputs as <div> unchanged"
    rationale: "Preserve standard HTML div when no custom name specified"
  - id: 03-02-03
    choice: "XML name validation prevents invalid tag names at transpile time"
    rationale: "Compile-time safety - catch errors early rather than at runtime"
  - id: 03-02-04
    choice: "Markdown component passes content through as raw"
    rationale: "Allows inserting pre-formatted markdown without transformation"

metrics:
  duration: "2 min"
  completed: "2026-01-21"
---

# Phase 3 Plan 2: div/Markdown Transformation Summary

Transform `<div name="x">` to XML blocks and `<Markdown>` to raw passthrough content with attribute support.

## What Was Built

**XmlBlockNode attributes support** - Extended XmlBlockNode interface with optional `attributes` field. Updated emitter to serialize attributes on XML blocks as `<name key="value">`.

**div transformation** - Named divs (`<div name="example">`) become `<example>` XML blocks. Plain divs become `<div>`. Additional attributes (id, class) pass through to output. XML name validation prevents invalid tag names (spaces, leading numbers, xml prefix).

**Markdown passthrough** - `<Markdown>` component passes content through unchanged as raw markdown. Supports JSX text content and string literal expressions. Trims outer whitespace while preserving internal structure.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend XmlBlockNode with attributes and update emitter | b867b59 | src/ir/nodes.ts, src/emitter/emitter.ts |
| 2 | Add div and Markdown transformation handlers | 09cbd5a | src/parser/transformer.ts |
| 3 | Add div and Markdown transformation tests | e405038 | tests/parser/transformer.test.ts, tests/emitter/document.test.ts |

## Key Implementation Details

**XML Name Validation:**
```typescript
const XML_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_.\-]*$/;
// Also rejects names starting with 'xml' (case-insensitive)
```

**Attribute Serialization:**
```typescript
const attrs = node.attributes
  ? ' ' + Object.entries(node.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
  : '';
```

## Test Coverage

- 15 new tests added (7 div, 5 Markdown, 2 emitter, 1 E2E)
- Total: 138 tests passing
- Coverage: All success criteria validated

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `npm test` - 138 tests pass
2. `npx tsc --noEmit` - TypeScript compiles without errors
3. E2E test verifies full pipeline with div and Markdown elements

## Next Phase Readiness

Phase 3 (Full Element Coverage) is now complete:
- 03-01: Command component with frontmatter
- 03-02: div/Markdown transformation

Ready for Phase 4 (Developer Experience):
- File system support (reading .tsx files)
- CLI interface
- Watch mode with chokidar
