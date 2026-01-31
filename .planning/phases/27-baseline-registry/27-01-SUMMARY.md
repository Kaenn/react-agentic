---
phase: 27-baseline-registry
plan: 01
subsystem: testing
tags: [snapshot-tests, component-baseline, regression-prevention]
requires:
  - src/ir/nodes.ts
  - src/ir/runtime-nodes.ts
  - src/emitter/emitter.ts
  - src/emitter/runtime-markdown-emitter.ts
provides:
  - tests/components/*.test.ts (5 test files)
  - tests/components/__snapshots__/*.snap (64 snapshots)
affects:
  - 27-02 (registry implementation depends on baseline)
  - Future refactoring phases (28-33)
tech-stack:
  added: []
  patterns:
    - Snapshot testing for markdown output
    - Direct IR node construction in tests
    - V1 emitter for base nodes, V3 emitter for runtime nodes
decisions:
  - Use external snapshots (not inline) for better git diffs
  - Construct IR nodes directly rather than parsing TSX
  - Split tests by component category (control-flow, structured, semantic, runtime, document)
  - Use emitDocument() for runtime nodes, emit() for base nodes, emitAgent() for agents
metrics:
  duration: 5 minutes
  completed: 2026-01-31
---

# Phase 27 Plan 01: Baseline Registry Summary

**One-liner:** 64 snapshot tests capturing current markdown output for all primitive components

## What Was Built

Created comprehensive snapshot test coverage for all component types to establish a safety baseline before refactoring.

**Test Files Created:**
1. `tests/components/control-flow.test.ts` - If, Else, Loop, Break, Return (16 tests)
2. `tests/components/structured.test.ts` - Table, List, Indent (11 tests)
3. `tests/components/semantic.test.ts` - ExecutionContext, XmlBlock, Step (12 tests)
4. `tests/components/runtime.test.ts` - SpawnAgent, AskUser, RuntimeCall, OnStatus (16 tests)
5. `tests/components/document.test.ts` - DocumentNode, AgentDocumentNode (9 tests)

**Coverage by Component:**

| Component | Snapshot Count | Key Variations Tested |
|-----------|---------------|-----------------------|
| If | 4 | Runtime var ref, literal, nested content, equality condition |
| If+Else | 1 | Paired conditional blocks |
| Loop | 3 | Basic max, counter variable, nested If |
| Break | 3 | Standalone, with message, inside loop |
| Return | 4 | Basic, SUCCESS, ERROR with message, BLOCKED |
| Table | 4 | Headers/rows, alignment, empty cells, no headers |
| List | 4 | Unordered, ordered, start number, nested |
| Indent | 3 | Default 2 spaces, 4 spaces, nested blocks |
| ExecutionContext | 3 | Basic paths, custom prefix, with children |
| XmlBlock | 4 | Basic, attributes, nested, mixed content |
| Step | 5 | Heading variant, bold variant, xml variant, sub-steps, complex |
| SpawnAgent | 5 | Prompt, input object, output var, runtime refs, load from file |
| AskUser | 3 | Basic options, multiSelect, with header |
| RuntimeCall | 3 | Literal args, runtime var refs, mixed args |
| OnStatus | 4 | SUCCESS, ERROR, BLOCKED, NOT_FOUND |
| DocumentNode | 5 | Frontmatter, runtime vars, runtime functions, complete, metadata |
| AgentDocumentNode | 4 | Basic frontmatter, typed I/O, all optional fields, no tools |

**Snapshot Files Generated:**
- `__snapshots__/control-flow.test.ts.snap` (129 lines)
- `__snapshots__/structured.test.ts.snap` (78 lines)
- `__snapshots__/semantic.test.ts.snap` (110 lines)
- `__snapshots__/runtime.test.ts.snap` (193 lines)
- `__snapshots__/document.test.ts.snap` (114 lines)
- **Total:** 624 lines of baseline snapshots

## Key Implementation Details

**Test Pattern:**
1. Import IR node types from `src/ir/nodes.ts` or `src/ir/runtime-nodes.ts`
2. Construct IR node directly (no TSX parsing)
3. Wrap in DocumentNode with empty runtimeVars/runtimeFunctions
4. Emit with appropriate emitter and snapshot result

**Emitter Selection:**
- Base block nodes (Table, List, Indent, XmlBlock, Step, ExecutionContext) → `emit()` (V1 emitter)
- Runtime nodes (If, Else, Loop, Break, Return, SpawnAgent, AskUser, RuntimeCall) → `emitDocument()` (V3 emitter)
- Agent status nodes (OnStatus) → `emit()` (V1 emitter, not runtime-specific)
- Agent documents → `emitAgent()` (dedicated agent emitter)

**Key Nesting Combinations Tested:**
- If containing SpawnAgent (control flow + agent spawning)
- Loop containing Break (bounded iteration + early exit)
- Loop with nested If (iteration + conditional)

## Tasks Completed

1. **Task 1:** Created control flow component snapshots (16 tests)
   - Commit: 7ec9a23 - If, Else, Loop, Break, Return
2. **Task 2:** Created structured and semantic component snapshots (23 tests)
   - Commit: ae17156 - Table, List, Indent, ExecutionContext, XmlBlock, Step
3. **Task 3:** Created runtime and document component snapshots (25 tests)
   - Commit: 68d52bc - SpawnAgent, AskUser, RuntimeCall, OnStatus, DocumentNode, AgentDocumentNode

## Deviations from Plan

**None** - Plan executed exactly as written.

## Decisions Made

1. **External snapshots over inline:** Better git diffs for reviewing output changes
2. **Direct IR construction:** Simpler than full TSX parsing, focuses on emission layer
3. **Component category split:** Easier to locate tests by component type
4. **Emitter function selection:** Discovered OnStatus uses V1 emitter, not runtime emitter (fixed during Task 3)

## Testing Strategy

**Regression Prevention:**
- Any change to emitter logic that affects component output will fail snapshots
- Example: Changing Table separator from `|` to `│` would break 4 snapshots
- Developers must explicitly update snapshots with `npm test -- -u`

**Baseline Coverage:**
- 64 total snapshots across all primitive components
- Each component has at least 1 snapshot (most have 3-5)
- Key integration points (If+SpawnAgent, Loop+Break) have dedicated snapshots

**Verification:**
```bash
npm test tests/components/ -- --run
# Result: 5 test files, 64 tests passed
```

## Next Phase Readiness

**Blockers:** None

**Concerns:** None - baseline established successfully

**Dependencies for 27-02 (Registry Implementation):**
- All snapshot tests passing
- Baseline captures current behavior before primitives/composites split
- Future refactors in 28-33 can safely reference these baselines

## Files Modified

**Created:**
- tests/components/control-flow.test.ts
- tests/components/structured.test.ts
- tests/components/semantic.test.ts
- tests/components/runtime.test.ts
- tests/components/document.test.ts
- tests/components/__snapshots__/control-flow.test.ts.snap
- tests/components/__snapshots__/structured.test.ts.snap
- tests/components/__snapshots__/semantic.test.ts.snap
- tests/components/__snapshots__/runtime.test.ts.snap
- tests/components/__snapshots__/document.test.ts.snap

**Modified:** None
