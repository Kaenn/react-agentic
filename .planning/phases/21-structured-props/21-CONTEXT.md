# Phase 21: Structured Props - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add Table and List components that accept structured array props instead of manual JSX children. These components emit markdown tables and lists from typed props, with TypeScript enforcement at compile time.

</domain>

<decisions>
## Implementation Decisions

### Table rendering
- Per-column alignment via `align` prop: `align={['left', 'center', 'right']}`
- Empty cells: configurable via `emptyCell` prop, defaults to empty string
- Headers are optional (headerless tables allowed)
- No caption/title prop — users add their own heading if needed
- Default alignment is left for all columns when `align` not specified

### List behavior
- Default type is bullet (unordered): `- item`
- Ordered lists via `ordered` prop or similar
- Optional `start` prop for ordered lists (defaults to 1)
- No nesting support — flat lists only
- No custom markers — standard bullet (-) and numbers (1.) only

### Prop ergonomics
- Compile-time TypeScript error if row length doesn't match header count
- Rows accept arrays only, not objects: `rows={[["a", "b"], ["c", "d"]]}`
- Cell content type: `string | number` (numbers auto-convert)
- Alignment array length must match column count (compile-time enforced)

### Edge cases
- Empty arrays render nothing (empty string output)
- Headers-only tables allowed (no rows required)
- Pipe characters (|) auto-escaped in cell content
- Newlines in cells stripped or converted to spaces (no multiline)

### Claude's Discretion
- Exact prop naming (e.g., `ordered` vs `type="ordered"`)
- Internal IR node structure
- Emitter implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 21-structured-props*
*Context gathered: 2026-01-26*
