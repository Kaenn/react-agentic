# Phase 30: Component Composition - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Full support for children and props in custom components — enabling users to create composable TSX functions that can wrap content and receive typed props. This is the infrastructure for custom component authoring.

</domain>

<decisions>
## Implementation Decisions

### Children prop behavior
- Children typed using discriminated union by context (CommandContent vs SubComponentContent)
- Empty/undefined children render as empty string — no output, no error
- Render prop pattern supported — `children` can be a function: `{(ctx) => <...>}`
- Nested components receive parent context via explicit prop drilling: `<Child ctx={ctx} />`

### Props forwarding
- Both TypeScript interface and inline destructuring patterns supported — user's choice
- Default values via destructuring defaults: `function MyComp({ delay = 5 })`
- Spread props fully supported: `<MyComp {...sharedProps} title="x" />`
- Generic type parameters supported: `function MyComp<T>(props: Props<T>)`

### Fragment handling
- Fragments render via direct concatenation — no wrapper elements
- Context-aware separator: inline children get space, block children get newline
- Short syntax only: `<></>` — no `<React.Fragment>` support

### Custom component signatures
- React FC style: `const MyComp: FC<Props> = (props) => ...`
- Components can be defined in same file or separate files — user's choice
- Default exports preferred: `export default MyComp`
- Async components supported: `async function MyComp(props) { await ... }`

### Claude's Discretion
- Keyed fragments — evaluate if they add value for iteration use cases
- Exact implementation of context-aware spacing algorithm
- How static vs runtime transformer paths achieve parity

</decisions>

<specifics>
## Specific Ideas

- Pattern should feel like writing React components — familiar to React developers
- FC<Props> style gives good autocomplete and type inference in editors
- Async support enables build-time data fetching in custom components

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 30-component-composition*
*Context gathered: 2026-01-31*
