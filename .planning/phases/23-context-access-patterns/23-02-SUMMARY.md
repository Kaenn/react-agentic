---
phase: 23-context-access-patterns
plan: 02
subsystem: primitives
tags: [generics, type-parameters, control-flow, compile-time, typescript]

# Dependency graph
requires:
  - phase: 23-01
    provides: Render props pattern and context interfaces
provides:
  - Generic If<T> component for compile-time type context
  - Generic Loop<T> component for type-safe iteration
  - LoopNode IR type with as, items, typeParam fields
  - Loop transformation and emission support
affects: [23-03, future-type-safe-components]

# Tech tracking
tech-stack:
  added: []
  patterns: [generic-type-parameters, compile-time-only-types]

key-files:
  created: []
  modified:
    - src/primitives/control.ts
    - src/jsx.ts
    - src/ir/nodes.ts
    - src/parser/transformer.ts
    - src/emitter/emitter.ts

key-decisions:
  - "Generic T defaults to unknown for backwards compatibility"
  - "Generics are compile-time only - no runtime overhead or validation"
  - "LoopNode stores items as string representation of expression"
  - "Loop emits as **For each {as} in {items}:** pattern"
  - "typeParam field captures explicit generic for potential future validation"

metrics:
  duration: 5m 38s
  completed: 2026-01-27
---

# Phase 23 Plan 02: Generic Type Parameters Summary

Generic type parameters on If<T> and Loop<T> for compile-time type safety with backwards-compatible defaults.

## Objective

Add explicit generic type parameters to workflow components (If, Loop) enabling TypeScript validation during development while maintaining backwards compatibility for non-generic usage.

## Tasks Completed

| Task | Name | Commit | Status |
| :--- | :--- | :--- | :---: |
| 1 | Add generic to If component | 607e8bf | Done |
| 2 | Create Loop component with generic | c3c6287 | Done |
| 3 | Add LoopNode to IR and transformer | f3ee08e | Done |
| 4 | Add LoopNode emission | (included in 23-03 commits) | Done |
| 5 | Test generic type parameters | (verified, cleaned up) | Done |

## Key Implementation Details

### If<T> Component

```typescript
export interface IfProps<T = unknown> {
  test: string;
  children?: ReactNode;
  // T is compile-time only
}

export function If<T = unknown>(_props: IfProps<T>): null {
  return null;
}
```

Usage: `<If<ProjectConfig> test="[ -f config.json ]">...</If>`

### Loop<T> Component

```typescript
export interface LoopProps<T = unknown> {
  items?: T[];
  as?: string;
  children?: ReactNode;
}

export function Loop<T = unknown>(_props: LoopProps<T>): null {
  return null;
}
```

Usage: `<Loop<User> items={users} as="user">...</Loop>`

### LoopNode IR

```typescript
export interface LoopNode {
  kind: 'loop';
  as?: string;           // Variable name for current item
  items?: string;        // Array expression as string
  typeParam?: string;    // Explicit generic type name
  children: BlockNode[];
}
```

### Emission Pattern

- If: `**If {test}:**`
- Loop: `**For each {as} in {items}:**`

## Decisions Made

1. **Generic defaults to unknown**: Maintains backwards compatibility - existing code without generics continues to work unchanged.

2. **Compile-time only**: Generics are erased at compile time. No runtime overhead, no runtime type validation.

3. **Items as string**: Loop items prop is stored as the string representation of the expression (e.g., "users" or "['a', 'b']") since it's interpreted at Claude runtime.

4. **typeParam captured**: The explicit generic type parameter is stored in IR for potential future validation or documentation generation.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `npm run build` passes without errors
2. TypeScript compiles with generic usage
3. Test command built successfully with both generic and non-generic usage
4. Output contains expected patterns:
   - `**If [ -f config.json ]:**`
   - `**For each user in users:**`
5. Non-generic components work unchanged

## Next Phase Readiness

Ready for 23-03 (Context Interpolation in Output) - provides generic type infrastructure for context-aware components.

## Files Modified

| File | Changes |
| :--- | :--- |
| src/primitives/control.ts | Added IfProps<T>, If<T>, LoopProps<T>, Loop<T> |
| src/jsx.ts | Export Loop, LoopProps |
| src/ir/nodes.ts | Added LoopNode interface, BlockNode union |
| src/parser/transformer.ts | Added Loop to SPECIAL_COMPONENTS, transformLoop method |
| src/emitter/emitter.ts | Added LoopNode import, emitLoop method |
