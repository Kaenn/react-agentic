---
phase: 34-agent-contract-components
plan: 02
subsystem: parser
tags: [transformers, contract-components, parser, agent]
requires: [34-01]
provides: [contract-transformers, parser-integration]
affects: [34-03]

tech-stack:
  added: []
  patterns: [transformer-pattern, validation-pattern]

key-files:
  created:
    - src/parser/transformers/contract.ts
  modified:
    - src/parser/transformers/dispatch.ts
    - src/parser/transformers/index.ts
    - src/components/contract.ts
    - src/components/index.ts
    - src/jsx.ts
    - src/index.ts

decisions:
  - name: "Rename Return to StatusReturn"
    rationale: "Avoid conflict with control flow Return component"
    alternatives: ["Namespace components", "Use different IR node names"]
    tradeoffs: "Slightly longer name but clearer distinction"
  - name: "Support both ReturnStatus and StatusReturn names"
    rationale: "Backwards compatibility during transition"
    alternatives: ["Single canonical name"]
    tradeoffs: "More validation logic but smoother migration"

metrics:
  duration: "7m"
  completed: "2026-02-01"
---

# Phase 34 Plan 02: Parser Transformers for Contract Components Summary

Parser transformers for agent contract components (Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns, StatusReturn).

## What Was Built

Created parser transformation layer that converts contract component JSX elements to their corresponding IR nodes:

1. **Contract Transformer Module** (`src/parser/transformers/contract.ts`):
   - `transformRole` → RoleNode
   - `transformUpstreamInput` → UpstreamInputNode
   - `transformDownstreamConsumer` → DownstreamConsumerNode
   - `transformMethodology` → MethodologyNode
   - `transformStructuredReturns` → StructuredReturnsNode (validates StatusReturn children)
   - `transformReturn` → ReturnStatusNode (internal, called by StructuredReturns)
   - `isContractComponent` helper for detection

2. **Dispatch Integration**:
   - Registered all contract components in dispatch router
   - Added validation: StatusReturn/ReturnStatus only inside StructuredReturns
   - Error handling for misplaced components

3. **Component Naming Fix**:
   - Renamed contract Return → StatusReturn to avoid conflict with control flow Return
   - Updated all exports and transformers
   - Support both ReturnStatus and StatusReturn for compatibility

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create Contract Transformers | f1ae758 | contract.ts |
| 2 | Register Transformers in Dispatch | 99cd9ad | dispatch.ts |
| 3 | Update Transformer Index Export | 44c2812 | transformers/index.ts |
| Fix | Rename Return to StatusReturn | 399a8a1 | contract.ts, index.ts, jsx.ts, dispatch.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate identifier 'Return' blocking build**
- **Found during:** Task 3 verification
- **Issue:** Control flow Return and contract Return had naming conflict
- **Fix:** Renamed contract component to StatusReturn, updated all references
- **Files modified:** contract.ts, index.ts, jsx.ts, dispatch.ts, contract transformers
- **Commits:** 399a8a1

**2. [Rule 1 - Bug] Linter renamed ReturnStatus to StatusReturn**
- **Found during:** Naming fix
- **Issue:** Auto-formatter preferred StatusReturn over ReturnStatus
- **Fix:** Accepted StatusReturn as canonical name, support both for compatibility
- **Files modified:** isContractComponent helper, StructuredReturns validator
- **Commit:** 399a8a1 (same commit)

## Technical Details

**Transformer Pattern:**
- All container components (Role, UpstreamInput, etc.) follow same pattern: extract children, transform via dispatch
- StructuredReturns validates children are StatusReturn/ReturnStatus only
- transformReturn is internal helper, not exposed in dispatch (only called by StructuredReturns)

**Validation:**
- StatusReturn/ReturnStatus outside StructuredReturns throws compile error
- StructuredReturns requires at least one StatusReturn child
- Non-empty text inside StructuredReturns is error (must be StatusReturn elements)

**IR Nodes Used:**
- RoleNode (kind: 'role')
- UpstreamInputNode (kind: 'upstreamInput')
- DownstreamConsumerNode (kind: 'downstreamConsumer')
- MethodologyNode (kind: 'methodology')
- StructuredReturnsNode (kind: 'structuredReturns', contains returns array)
- ReturnStatusNode (kind: 'returnStatus', has status + children)

## Testing Strategy

Manual verification:
- TypeScript compilation succeeds
- Build succeeds with no errors
- Contract transformers exported from transformers/index.ts
- Dispatch routes all 6 component names correctly

Future testing (Plan 34-04):
- End-to-end TSX → IR → Markdown test with all contract components
- Validation error tests (StatusReturn outside StructuredReturns)
- Empty StructuredReturns error test

## Next Phase Readiness

**Unblocked:**
- Plan 34-03: Emitter Implementation - can emit RoleNode, UpstreamInputNode, etc. as XML blocks
- Plan 34-04: Integration Testing - can test full pipeline

**Dependencies resolved:**
- IR nodes exist (from 34-01)
- Component stubs exist (from 34-01)
- Transformers route correctly

**No blockers identified.**

## Files Changed

**Created:**
- `src/parser/transformers/contract.ts` (208 lines) - Contract component transformers

**Modified:**
- `src/parser/transformers/dispatch.ts` (+30 lines) - Dispatch routing
- `src/parser/transformers/index.ts` (+14 lines) - Module exports
- `src/components/contract.ts` (~10 modifications) - Renamed Return → StatusReturn
- `src/components/index.ts` (~5 modifications) - Updated exports
- `src/jsx.ts` (~3 modifications) - Updated type exports
- `src/index.ts` (+11 lines) - Export contract components

## Lessons Learned

**Component Naming:**
- Must check for naming conflicts across all domains (control flow vs contract)
- StatusReturn clearer than Return for agent contract context
- Auto-formatter preferences should guide canonical names

**Transformer Validation:**
- Early validation in transformers prevents runtime errors
- Clear error messages help TSX authors understand restrictions
- Validating children composition (StructuredReturns → StatusReturn) catches misuse

**Backwards Compatibility:**
- Supporting multiple names (ReturnStatus + StatusReturn) eases transition
- Detection helpers (isContractComponent) should include all aliases
