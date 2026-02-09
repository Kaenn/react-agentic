# Phase 29: Reference Printing - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable composites to print variable and function references in markdown output. RuntimeVar interpolation emits shell variable syntax (`$CTX.data.status`). RuntimeFn provides name, call, input, and output properties. Ref component renders references in JSX context.

</domain>

<decisions>
## Implementation Decisions

### Property syntax
- No `.ref` property — direct interpolation preserves types
- `{ctx.data.status}` in templates emits `$CTX.data.status`
- RuntimeFn has `.name` (identifier) and `.call` (with parens)
- RuntimeFn has `.input` (args list) and `.output` (type schema)

### Output format
- Include `$` prefix: `{ctx}` → `$CTX`
- Array access uses direct notation: `{ctx.items[0]}` → `$CTX.items[0]`
- Never auto-quote — user adds quotes if needed
- No escaping — variable names assumed valid shell identifiers

### Component API
- Prop name: `value` (`<Ref value={ctx.data.status} />`)
- Supports both RuntimeVar and RuntimeFn
- For RuntimeFn, emits name by default (add `call` prop for parens)
- Self-closing only — no children
- Access input/output as properties: `<Ref value={myFn.input} />`, `<Ref value={myFn.output} />`
- Input emits comma-separated parameter names: `arg1, arg2, arg3`
- Output emits type schema as JSON: `{ status: "string", count: "number" }`

### Error behavior
- Invalid property access caught at TypeScript compile time
- Ref value prop typed as `RuntimeVar | RuntimeFn` — anything else is type error
- Untyped RuntimeFn: `.input` → `""`, `.output` → `"unknown"`
- Trust types — no runtime type checks

### Claude's Discretion
- Internal representation of reference metadata
- How to extract parameter names from function signature
- Type schema serialization format details

</decisions>

<specifics>
## Specific Ideas

- Output format should be "self-explainable for Claude to understand he needs to parse it"
- Direct dot notation (`$CTX.data.status`) preferred over jq expressions for simplicity
- RuntimeFn properties mirror what users would manually write in markdown

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-reference-printing*
*Context gathered: 2026-01-31*
