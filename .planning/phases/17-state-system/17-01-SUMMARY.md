---
phase: 17-state-system
plan: 01
subsystem: compiler/ir
tags: [state, ir-nodes, jsx-components, type-system]

dependency-graph:
  requires: []
  provides: [ReadStateNode, WriteStateNode, StateRef, useStateRef, ReadState, WriteState]
  affects: [17-02, 17-03, 17-04]

tech-stack:
  added: []
  patterns: [phantom-types, discriminated-unions]

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/jsx.ts

decisions:
  - id: state-node-modes
    choice: "WriteStateNode uses mode: 'field' | 'merge' to distinguish write patterns"
    rationale: "Explicit mode enables different emitter logic for field vs merge writes"
  - id: phantom-schema-type
    choice: "StateRef<TSchema> uses phantom _schema property for compile-time typing"
    rationale: "Follows established VariableRef<T> pattern for type erasure at runtime"

metrics:
  duration: 1m 30s
  completed: 2026-01-22
---

# Phase 17 Plan 01: State IR Nodes and JSX Components Summary

Foundation layer for typed state system - IR node definitions and JSX component stubs.

## What Was Built

### IR Nodes (src/ir/nodes.ts)

**ReadStateNode** - Represents a state read operation:
- `stateKey`: State key identifier (e.g., 'projectContext')
- `variableName`: Variable to store result (from useVariable)
- `field?`: Optional nested field path (e.g., 'user.preferences.theme')

**WriteStateNode** - Represents a state write operation:
- `stateKey`: State key identifier
- `mode`: 'field' for single field, 'merge' for partial update
- `field?`: For field mode, the nested path
- `value`: Object with `type: 'variable' | 'literal'` and `content: string`

Both types added to `BlockNode` union for exhaustive switch handling.

### JSX Components (src/jsx.ts)

**StateRef<TSchema>** - Reference interface for state keys:
```typescript
interface StateRef<TSchema = unknown> {
  key: string;
  _schema?: TSchema;  // phantom type
}
```

**useStateRef<TSchema>(key)** - Hook to create typed state reference:
```typescript
const projectState = useStateRef<ProjectState>("projectContext");
```

**ReadState<TSchema>** - Component to read state values:
```typescript
<ReadState state={projectState} into={nameVar} field="name" />
```

**WriteState<TSchema>** - Component to write state values:
```typescript
<WriteState state={projectState} field="name" value="my-project" />
<WriteState state={projectState} merge={{ phase: 2, status: "active" }} />
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8bba2a6 | feat | Add ReadStateNode and WriteStateNode IR types |
| 4ffc119 | feat | Add StateRef, useStateRef, ReadState, WriteState exports |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors in target files
- ReadStateNode and WriteStateNode present in nodes.ts BlockNode union
- StateRef, useStateRef, ReadState, WriteState exported from jsx.ts
- All JSDoc documentation with examples included

## Next Phase Readiness

**Plan 17-02 depends on:**
- ReadStateNode and WriteStateNode (this plan provides)
- Transformer logic to detect ReadState/WriteState JSX and emit IR nodes

**Ready to proceed:** Yes - all IR types and JSX components in place.
