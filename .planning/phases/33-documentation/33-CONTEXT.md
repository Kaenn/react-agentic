# Phase 33: Documentation - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

User-facing documentation for the primitive/composite architecture. Explains the boundary between compiler-owned primitives and user-definable composites, with practical examples. No migration guide needed (product not in production).

</domain>

<decisions>
## Implementation Decisions

### Doc Structure & Flow
- Multiple docs, not one comprehensive file
- Top-level files in docs/: primitives.md, composites.md (no subdirectory)
- No migration.md needed
- Rich cross-linking between docs and to existing docs (command.md, agent.md)
- Update docs index (README.md or docs/README.md) to include new docs

### Explanation Approach
- Concept-first: explain architecture before showing code
- User-focused: only what users need to create composites, hide compiler internals
- Practical/terse tone: minimal explanation, maximum code examples
- No quick reference tables or cheat sheets

### Example Selection
- Mix of wrapper patterns and data-driven patterns
- Progressive examples: start minimal, build to realistic
- Show compiled markdown output alongside TSX for each example
- Three patterns to demonstrate:
  - Conditional wrapper (wrap children only if condition met)
  - Repeated section (render structure for each item)
  - Custom validation (validate and format input)

### Claude's Discretion
- Exact file naming (primitives.md vs primitives-composites.md)
- Which existing docs to link from
- Order of sections within each doc
- Third example specifics if custom validation doesn't fit well

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Migration guide — add when product goes to production and users need to migrate

</deferred>

---

*Phase: 33-documentation*
*Context gathered: 2026-01-31*
