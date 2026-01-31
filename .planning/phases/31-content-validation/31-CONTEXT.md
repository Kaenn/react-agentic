# Phase 31: Content Validation - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Compile-time TypeScript errors for invalid content nesting. When users put components in wrong places (SpawnAgent inside a composite, control flow where it shouldn't be), TypeScript catches it before build time. Uses Phase 28's content types as the enforcement mechanism.

</domain>

<decisions>
## Implementation Decisions

### Error trigger points
- Use Phase 28 content types (CommandContent, AgentContent, SubComponentContent) as primary mechanism
- Claude decides whether to use children props, context boundaries, or both layers
- Compile-time only — no runtime checks or warnings
- Control flow components (If/Else, Loop/Break) blocked everywhere in SubComponentContent, not just top-level

### Error message design
- Generic context references only ("not allowed in SubComponentContent context"), not specific wrapper names
- No fix suggestions — just report the problem
- No docs links in error messages — keep self-contained
- Claude decides verbosity level based on what TypeScript allows without excessive complexity

### Validation strictness
- No escape hatch — rules are rules, invalid code won't compile
- Breaking change — invalid code fails immediately, users fix or don't upgrade
- Tiered severity: SpawnAgent is hard error, other excluded features are warnings
- All 9 non-SpawnAgent exclusions (control flow, Return, AskUser, etc.) surface as warnings

### IDE experience
- Generic TypeScript language server support — no VS Code-specific features
- Claude decides where red squiggle appears (on invalid component vs parent children prop)
- No enhanced hover info — standard TypeScript hover only
- Autocomplete should filter out invalid components in restricted contexts (SpawnAgent won't appear inside SubComponentContent)

### Claude's Discretion
- Exact type structure for enforcement (children prop types vs context propagation)
- Error message verbosity within TypeScript constraints
- Squiggle location based on natural type error positioning
- Warning implementation mechanism (TypeScript has limited warning support)

</decisions>

<specifics>
## Specific Ideas

- Phase 28 established the content types with explicit allow-lists (Extract-based SubComponentContent pattern)
- 10 command-level features excluded from SubComponentContent: SpawnAgent, If, Else, Loop, Break, Return, AskUser, OnStatus, OutputSchema, and control flow constructs
- SpawnAgent is the critical blocker — users must not be able to spawn agents from inside composites

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 31-content-validation*
*Context gathered: 2026-01-31*
