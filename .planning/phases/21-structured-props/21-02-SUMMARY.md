---
phase: 21
plan: 02
subsystem: primitives
tags: [typescript, transformer, emitter, table, list, markdown]
requires:
  - phase: 21
    plan: 01
    provides: TableNode IR and component stubs
provides:
  - Table transformation from JSX to TableNode IR
  - List transformation from JSX to ListNode IR
  - Markdown table emission with headers, alignment, escaping
  - Markdown list emission with start property support
affects:
  - phase: 21
    plan: 03
    needs: Working Table/List components for user documentation
tech-stack:
  added: []
  patterns:
    - Numeric literal parsing for JSX attributes
    - Nested array parsing for table rows
    - Markdown table generation with alignment markers
    - Pipe character escaping in table cells
key-files:
  created: []
  modified:
    - src/parser/transformer.ts
    - src/emitter/emitter.ts
decisions:
  - slug: numeric-literal-parsing
    what: Added custom parsing for numeric start attribute instead of using getAttributeValue
    why: getAttributeValue only handles string literals, not numeric literals (start={5})
    alternatives: Could have extended getAttributeValue to handle all literal types, but that's broader scope
  - slug: pipe-escaping
    what: Escape pipe characters as \| in table cell content
    why: Prevents pipe characters from breaking markdown table syntax
    alternatives: Could have used HTML entities, but \| is more readable and standard
  - slug: newline-handling
    what: Convert newlines in table cells to spaces
    why: Markdown tables don't support multi-line cells; spaces preserve readability
    alternatives: Could have stripped newlines entirely, but space preserves word separation
metrics:
  duration: 5m 22s
  completed: 2026-01-26
---

# Phase 21 Plan 02: Table and List Transformation and Emission Summary

**One-liner:** Implemented full JSX-to-markdown pipeline for Table and List components with array prop parsing, markdown table generation, and ordered list start property support.

## Overview

Completed the Table and List structured props implementation by wiring transformation (JSX → IR) and emission (IR → markdown) through the parser and emitter. This enables type-safe table and list authoring from array props instead of manual markdown or JSX children.

## What Was Built

### Transformer (src/parser/transformer.ts)
- **Table transformation (transformTable):**
  - Parses headers, rows, align, emptyCell props
  - Converts align strings to typed array
  - Handles nested array parsing for rows
- **List transformation (transformPropList):**
  - Parses items, ordered, start props
  - Custom numeric literal parsing for start attribute
  - Creates ListItemNode[] from items array
- **Rows parsing (parseRowsAttribute):**
  - Extracts nested string[][] from JSX array literal
  - Handles string literals, numeric literals, and expressions
- **Added Table and List to SPECIAL_COMPONENTS set**
- **Added transformation cases in transformElement**

### Emitter (src/emitter/emitter.ts)
- **Table emission (emitTable):**
  - Generates markdown table with `| ... |` syntax
  - Emits header row if present
  - Emits separator row with alignment markers (`:---`, `:---:`, `---:`)
  - Emits data rows with proper cell escaping
  - Pads rows to column count
- **Cell escaping (escapeTableCell):**
  - Escapes pipe characters as `\|`
  - Converts newlines to spaces
  - Replaces empty cells with emptyCell value
- **List start property:**
  - Updated emitList to respect start property
  - Defaults to 1 if start not provided

## Technical Details

**Numeric Literal Parsing:**
The start attribute uses numeric syntax (`start={5}`), not string syntax (`start="5"`). The existing `getAttributeValue` helper only handles string literals, so we added custom parsing:
```typescript
const startAttr = opening.getAttribute('start');
if (startAttr && Node.isJsxAttribute(startAttr)) {
  const init = startAttr.getInitializer();
  if (init && Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && Node.isNumericLiteral(expr)) {
      start = expr.getLiteralValue();
    }
  }
}
```

**Markdown Table Format:**
```markdown
| Header1 | Header2 |
| :--- | :---: |
| Cell1 | Cell2 |
```
- Left align: `:---`
- Center align: `:---:`
- Right align: `---:`

**Pipe Escaping:**
Table cells containing `|` characters are escaped as `\|` to prevent breaking the table syntax. Example: `cat file | grep` becomes `cat file \| grep`.

## Dependencies

**Requires:**
- Phase 21 Plan 01: TableNode IR type and component stubs

**Provides for:**
- Phase 21 Plan 03: Documentation and examples (if planned)
- Future phases: Working structured props pattern for other components

## Verification

**Test Cases (all passing):**
1. ✅ Basic table with headers
2. ✅ Table with column alignment (left, center, right)
3. ✅ Pipe character escaping in cells
4. ✅ Headerless table (data-only)
5. ✅ Bullet list
6. ✅ Ordered list
7. ✅ Ordered list with start=5 (outputs "5. 6. 7.")

**Build Status:**
✅ `npm run build` passes without errors
✅ TypeScript compiles all changes
✅ Test command generates correct markdown

## Files Changed

**Modified:**
- `src/parser/transformer.ts` (+115 lines) - Table/List transformation
- `src/emitter/emitter.ts` (+89 lines) - Table emission and cell escaping

## Deviations from Plan

**Deviation: Numeric literal parsing**
- **Rule:** Auto-fix blocking issue (Rule 3)
- **Issue:** getAttributeValue doesn't handle numeric literals, breaking start={5}
- **Fix:** Added custom numeric literal parsing in transformPropList
- **Why auto-fix:** Without this, List start property would never work - it's a blocking issue for task completion

## Commits

| Hash | Message |
|------|---------|
| cbcd671 | feat(21-02): add Table and List transformation logic |
| 459943e | feat(21-02): implement Table emission and List start property |
| e2db6bb | fix(21-02): handle numeric literal for List start attribute |

## Next Steps

Phase 21 is complete (2/2 plans done). Next phase could be:
- Phase 22: Semantic props (if in roadmap)
- Phase 23: Parser/emitter improvements (if in roadmap)
- Document structured props pattern for future components

## Lessons Learned

**TypeScript Literal Types:**
JSX attribute parsing must handle different literal types. `getAttributeValue` is designed for strings only. When adding props that accept numbers, booleans, or other types, custom parsing is needed.

**Markdown Table Syntax:**
- Alignment markers must appear in separator row
- Pipe characters in cell content must be escaped
- Multi-line cells are not supported (convert newlines to spaces)

**Test-Driven Verification:**
Creating a test command that exercises all features (alignment, escaping, start property) caught the numeric literal bug immediately. Building test commands before finalizing implementation is valuable.

## Success Criteria Met

✅ `<Table headers={...} rows={...} />` emits valid markdown table
✅ `<List items={...} />` emits bullet list
✅ `<List items={...} ordered />` emits numbered list
✅ `<List items={...} ordered start={5} />` starts numbering at 5
✅ Pipe characters in cell content are escaped as `\|`
✅ Newlines in cell content are converted to spaces
✅ Empty arrays render nothing (empty string output)
✅ TypeScript enforces prop types at compile time
