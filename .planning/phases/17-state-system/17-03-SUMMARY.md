---
phase: 17-state-system
plan: 03
subsystem: parser/transformer
tags: [transformer, state, JSX, IR]

dependency-graph:
  requires: ["17-01"]
  provides: ["transformReadState", "transformWriteState", "stateRefs tracking"]
  affects: ["17-04"]

tech-stack:
  added: []
  patterns:
    - "stateRefs Map for tracking useStateRef declarations"
    - "extractStateKey helper for StateRef resolution"
    - "extractVariableName helper for VariableRef resolution"
    - "dual-mode WriteState (field vs merge)"

key-files:
  created: []
  modified:
    - src/parser/transformer.ts

decisions:
  - id: "staterefs-tracking-pattern"
    decision: "Track useStateRef declarations in stateRefs Map (identifier -> key)"
    rationale: "Follows existing outputs Map pattern for useOutput tracking"
  - id: "variable-fallback-literal"
    decision: "Unknown identifiers in WriteState value treated as literal expression"
    rationale: "Allows flexibility for edge cases while tracked variables get proper treatment"

metrics:
  duration: "3m"
  completed: "2026-01-22"
---

# Phase 17 Plan 03: State Transformer Summary

**One-liner:** JSX ReadState/WriteState components transform to IR nodes via stateRefs tracking and dual-mode write handling.

## What Was Built

Added transformer logic to parse `ReadState` and `WriteState` JSX components into IR nodes, following the established `Assign` and `OnStatus` patterns.

### Core Changes

1. **State Reference Tracking**
   - Added `stateRefs` Map to track `useStateRef()` declarations
   - `extractStateRefDeclarations()` scans source file for `useStateRef("key")` calls
   - Maps identifier name to state key string

2. **ReadState Transformer**
   - `transformReadState()` extracts state prop, into prop, optional field prop
   - Uses `extractStateKey()` helper to resolve StateRef identifier to key
   - Uses `extractVariableName()` helper to resolve VariableRef to env name
   - Returns `ReadStateNode` with stateKey, variableName, optional field

3. **WriteState Transformer**
   - `transformWriteState()` handles two modes:
     - **Field mode**: `field="path" value={val}` - single field update
     - **Merge mode**: `merge={partial}` - partial object merge
   - Value detection: tracked variables become `{ type: 'variable' }`, others become `{ type: 'literal' }`
   - Returns `WriteStateNode` with stateKey, mode, field (if field mode), value

4. **Component Routing**
   - Added ReadState/WriteState to SPECIAL_COMPONENTS set
   - Added routing in `transformElement()` to dispatch to new methods

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a272197 | feat | Add ReadState transformer method |
| 9bb952b | feat | Add WriteState transformer method |

## Key Files Modified

- `src/parser/transformer.ts` - All transformer changes

## Decisions Made

1. **staterefs-tracking-pattern**: Track useStateRef declarations in stateRefs Map following outputs Map pattern
2. **variable-fallback-literal**: Unknown identifiers in WriteState value treated as literal expression text

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Plan 17-04 (State Emitter Logic):
- ReadStateNode and WriteStateNode IR nodes are produced by transformer
- Emitter needs `emitReadState()` and `emitWriteState()` methods
- State adapter integration happens at emit time
