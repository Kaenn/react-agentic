# Phase 24: Parser/Emitter Integration - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire all new v2.0 components (Phases 20-23) through the transformer and emitter pipeline. Add unit tests for each component, create an integration test demonstrating all components together, and update documentation for the new components.

</domain>

<decisions>
## Implementation Decisions

### Test strategy
- Dedicated test file per component (Table, List, ExecutionContext, SuccessCriteria, OfferNext, etc.)
- Test both layers separately: transformer → IR validation, then emitter → markdown validation
- Cover happy path plus 2-3 key edge cases per component
- Follow existing test organization pattern in the project

### Documentation scope
- Update existing user guides (command.md, agent.md, etc.) where new components fit
- Show minimal syntax examples — just component usage and props
- Include TSX → markdown pairs so users see what each component emits
- Add new components to docs/README.md index table

### Integration test design
- Purpose: functional coverage (every new component appears and works)
- Test fixture lives in tests/, not a real command in src/app/
- Assert generated markdown matches expected output (not just compile success)
- Include all Phase 21-23 components: Table, List, semantic components, render props, Step

### Error handling
- Invalid props (e.g., wrong row lengths) cause build-time error with clear message
- Error message style matches existing patterns in codebase
- Always include source location (file:line) in error messages
- Unrecognized components pass through as literal text (don't fail build)

### Claude's Discretion
- Exact test file naming within existing conventions
- Which edge cases are "key" for each component
- How to integrate new components into existing doc sections
- Technical implementation of source location tracking

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 24-parser-emitter-integration*
*Context gathered: 2026-01-26*
