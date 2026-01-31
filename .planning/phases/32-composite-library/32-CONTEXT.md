# Phase 32: Composite Library - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Create composite components that wrap primitives to provide enhanced variants. Primitives (If, Loop, SpawnAgent, etc.) remain as-is — composites are higher-level components users can copy, modify, and learn from. All composites importable from `react-agentic/composites`.

</domain>

<decisions>
## Implementation Decisions

### Import Structure
- Named imports from subpath: `import { IfElseBlock, LoopWithBreak } from 'react-agentic/composites'`
- Not re-exported from package root — keeps root clean for primitives
- One file per composite: `src/composites/IfElseBlock.tsx`, etc.
- Barrel export only — no deep imports for individual composites

### Component Signature Patterns
- Explicit interfaces for all props: `export interface IfElseBlockProps { ... }`
- Props interfaces exported for users to extend
- Generic parameter for children: `function Wrapper<C extends CommandContent>({ children }: { children: C })`
- Arrow const declarations: `export const IfElseBlock = (props: IfElseBlockProps) => { ... }`

### Primitive Wrapping Strategy
- Primitives keep current names (If, Loop, SpawnAgent) — no renaming
- Composites are enhanced variants with descriptive suffixes: `IfElseBlock`, `LoopWithBreak`, `SpawnAgentWithRetry`
- Composites invoke primitives via direct JSX render: `return <If condition={...}>{children}</If>`
- Composites add value beyond raw primitive (else handling, break logic, retry behavior)

### Documentation
- Rich JSDoc with @param, @example, @see
- Examples must be runnable TSX that compiles — copy-paste ready
- No separate examples directory — JSDoc inline examples are sufficient
- No "how to customize" comments — well-structured code is self-explanatory

### Claude's Discretion
- Exact composite variants to create (based on common enhancement patterns)
- Internal helper functions within composites
- Error message wording

</decisions>

<specifics>
## Specific Ideas

- Composites should feel like "batteries included" versions of primitives
- Users who want raw control use primitives; users who want convenience use composites
- Source code quality matters — users will read and copy these

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 32-composite-library*
*Context gathered: 2026-01-31*
