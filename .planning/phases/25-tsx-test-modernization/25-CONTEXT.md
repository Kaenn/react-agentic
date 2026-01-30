# Phase 25: TSX Test Modernization - Context

**Gathered:** 2026-01-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Update all TSX test files in `src/app/` to use v2.0 syntax features. Test files become living documentation demonstrating correct usage of Table, List, ExecutionContext, SuccessCriteria, OfferNext, render props, and Step components.

</domain>

<decisions>
## Implementation Decisions

### Feature Coverage
- Natural grouping: related features together (Table+List, semantic components)
- Update existing test files to use v2.0 features where applicable
- Add new files if needed to demonstrate most-used features
- Render props: demonstrate in one Command and one Agent
- Focus on most useful semantic components: ExecutionContext, SuccessCriteria, OfferNext
- Skip XML wrapper components (DeviationRules, CommitRules, etc.) — not priority

### Demonstration Style
- Mix of minimal and realistic examples
- Keep it simple — happy path demonstrations only
- No need to exhaustively show all variants and options
- Focus on features being useful, not feature completeness

### Test File Selection
- Update all existing test files to use v2.0 features where applicable
- Add new test files if necessary to cover most-used features
- Selection criteria: files that benefit most from v2.0 features
- New files follow existing naming pattern (test-*.tsx)

### Documentation Approach
- Light comments pointing out v2.0 features used
- Each file has a header comment listing which v2.0 features it demonstrates
- Code should be self-explanatory with minimal inline comments

### Claude's Discretion
- Which specific files to update vs create new
- How to group features naturally within files
- Exact comment wording and placement

</decisions>

<specifics>
## Specific Ideas

- File header format: list v2.0 features demonstrated (Table, List, etc.)
- Keep examples simple — "happy path only"
- Natural groupings: Table+List together, semantic components together

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 25-tsx-test-modernization*
*Context gathered: 2026-01-27*
