# Phase 35: Command Orchestration Components - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance existing components for command-level orchestration of agent return handling. The original requirements proposed several new components (Uses, Init, ValidateEnvironment, ParseArguments, HandleReturn/Match) but discussion revealed most are unnecessary — existing patterns handle agent references, initialization, and argument parsing.

**Actual scope:** Add `<OnStatusDefault>` component for catch-all return handling.

</domain>

<decisions>
## Implementation Decisions

### Removed from Requirements
- `<Uses agent={...}>` — SpawnAgent already handles agent references; no value in separate declaration
- `<Init>` — Was simulating runtimeFn in experiments; existing patterns sufficient
- `<ValidateEnvironment>` — Validation logic handled by existing approach
- `<ParseArguments>` — Argument parsing stays markdown + runtimeFn for now (out of scope)
- `<HandleReturn>` / `<Match>` — OnStatus already provides this functionality

### Return Handling Enhancement
- Add `<OnStatusDefault>` as sibling component to `<OnStatus>`
- Provides catch-all for unhandled return statuses
- Separate component rather than special status value (e.g., not `status="*"`)

### Implementation Approach
- Prefer composite components over primitives when possible
- Only add primitive if no other option exists
- `<OnStatusDefault>` should be composite if feasible

### Claude's Discretion
- Exact implementation of OnStatusDefault (composite vs primitive)
- Whether OnStatusDefault requires children or can be empty
- Error behavior when both OnStatus matches and OnStatusDefault exist

</decisions>

<specifics>
## Specific Ideas

- Phase significantly simplified from original 6 requirements to 1 enhancement
- OnStatusDefault follows pattern of sibling components (like Else to If)
- Should feel natural alongside existing OnStatus usage

</specifics>

<deferred>
## Deferred Ideas

- Declarative argument parsing component — future phase when patterns are clearer
- Exhaustive status matching enforcement — potential future enhancement

</deferred>

---

*Phase: 35-command-orchestration*
*Context gathered: 2026-01-31*
