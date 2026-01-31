---
phase: 29
plan: 01
subsystem: runtime
tags: [runtime-var, runtime-fn, ref-component, shell-variables]

dependency-graph:
  requires: [27, 28]
  provides:
    - Shell variable syntax for RuntimeVar interpolation
    - RuntimeFn reference properties (.name, .call, .input, .output)
    - Ref component for explicit reference printing
  affects: [30, 31, 32]

tech-stack:
  added: []
  patterns:
    - Shell variable syntax ($VAR.path) for runtime values
    - Direct property notation for array indices ($VAR.items[0])

files:
  key-files:
    created:
      - src/components/Ref.ts
      - tests/components/ref.test.ts
      - tests/parser/runtime-inline.test.ts
    modified:
      - src/parser/transformers/runtime-inline.ts
      - src/parser/transformers/runtime-dispatch.ts
      - src/components/runtime-fn.ts
      - src/components/runtime-var.ts
      - src/components/index.ts
      - src/jsx.ts
      - src/index.ts

decisions:
  - key: output-format
    choice: Shell variable syntax ($VAR.path)
    rationale: Simpler, self-explanatory for Claude parsing vs jq expressions
  - key: array-access
    choice: Bracket notation for numeric indices
    rationale: Standard JavaScript array syntax ($VAR.items[0])
  - key: runtimefn-properties
    choice: name, call, input, output as string properties
    rationale: Enable composites to print function references in markdown
  - key: ref-component
    choice: Self-closing Ref with value and call props
    rationale: Explicit reference rendering in JSX context

metrics:
  duration: 7m
  completed: 2026-01-31
---

# Phase 29 Plan 01: Reference Printing Summary

Shell variable syntax for RuntimeVar, reference properties for RuntimeFn, and Ref component for explicit printing.

## What Was Built

### RuntimeVar Shell Variable Syntax

Changed RuntimeVar interpolation output from jq expressions to direct shell variable syntax:

**Before:**
```markdown
Phase $(echo "$CTX" | jq -r '.phaseId'): $(echo "$CTX" | jq -r '.phaseName')
```

**After:**
```markdown
Phase $CTX.phaseId: $CTX.phaseName
```

Key changes in `src/parser/transformers/runtime-inline.ts`:
- `transformPropertyAccess()` - Emits `$VAR.path` instead of jq subshell
- `transformTemplateLiteral()` - Uses shell variable syntax in template spans
- Direct identifier references - Emits `$VAR` for root references
- Array access uses bracket notation: `$VAR.items[0]`

### RuntimeFn Reference Properties

Added new properties to `RuntimeFnComponent` interface:

```typescript
interface RuntimeFnComponent<TArgs, TReturn> {
  // Existing
  Call: RuntimeCallComponent<TArgs, TReturn>;
  fnName: string;
  fn: RuntimeFunction<TArgs, TReturn>;
  __isRuntimeFn: true;

  // New reference properties
  name: string;    // Function identifier (e.g., "initProject")
  call: string;    // Call syntax (e.g., "initProject()")
  input: string;   // Parameter names (e.g., "args")
  output: string;  // "unknown" (type extraction not implemented)
}
```

Added `extractParameterNames()` helper to parse function signature.

### Ref Component

New `<Ref>` component for explicit reference printing:

```tsx
// RuntimeVar reference
<Ref value={ctx.status} />  // Emits: $CTX.status

// RuntimeFn name
<Ref value={myFn} />  // Emits: myFn

// RuntimeFn call syntax
<Ref value={myFn} call />  // Emits: myFn()

// RuntimeFn properties
<Ref value={myFn.name} />   // Emits: myFn
<Ref value={myFn.call} />   // Emits: myFn()
```

Implementation in `src/parser/transformers/runtime-dispatch.ts`:
- `transformRef()` function handles Ref component
- Parses value expression for RuntimeVar or RuntimeFn reference
- Supports call prop for function call syntax
- Handles property access on RuntimeFn (.name, .call, .input, .output)

## Key Files

| File | Changes |
|------|---------|
| `src/parser/transformers/runtime-inline.ts` | Shell variable syntax in interpolation |
| `src/parser/transformers/runtime-dispatch.ts` | transformRef() for Ref component |
| `src/components/runtime-fn.ts` | Reference properties on RuntimeFnComponent |
| `src/components/Ref.ts` | New Ref component with RefProps |
| `src/components/index.ts` | Export Ref, REF_MARKER, RefProps |
| `src/jsx.ts` | Export Ref, REF_MARKER, RefProps |
| `src/index.ts` | Export Ref, REF_MARKER, RefProps |

## Tests Added

- `tests/components/ref.test.ts` - 6 tests for Ref component type safety
- `tests/parser/runtime-inline.test.ts` - 8 tests for shell variable syntax

Total: 14 new tests, 789 tests passing (was 775)

## Decisions Made

1. **Output Format**: Shell variable syntax (`$VAR.path`) instead of jq expressions
   - Simpler for Claude to parse
   - Self-explanatory format
   - No subshell overhead in documentation

2. **Array Access**: Bracket notation for numeric indices
   - `$VAR.items[0]` not `$VAR.items.0`
   - Standard JavaScript-like syntax

3. **RuntimeFn Properties**: String properties, not methods
   - `.name` returns identifier
   - `.call` returns call syntax with parens
   - `.input` extracts from function.toString()
   - `.output` placeholder "unknown" (type extraction future work)

4. **Ref Component**: Self-closing with value and call props
   - `value` accepts RuntimeVar or RuntimeFn
   - `call` boolean prop for call syntax

## Deviations from Plan

None - plan executed exactly as written.

## Commit History

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 103fea5 | Shell variable syntax for RuntimeVar |
| 2 | e461b95 | Reference properties for RuntimeFn |
| 3 | 06235c7 | Create Ref component |
| 4 | fc037f9 | Add Ref transformer |
| 5 | 247274e | Export Ref from package root |
| 6 | ed001e1 | Add tests for reference printing |
| 7 | c16463e | Verify all tests pass |

## Next Phase Readiness

Phase 30 (Loop Counter Variable) can proceed - no blockers identified.
