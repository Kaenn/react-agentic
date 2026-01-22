---
phase: 19
plan: 01
subsystem: ir-jsx
tags: [state, operation, ir-nodes, jsx-components, sqlite]

dependency-graph:
  requires: []
  provides:
    - StateDocumentNode IR type
    - StateNode IR type
    - OperationNode IR type
    - StateSchema type
    - State JSX component
    - Operation JSX component
  affects:
    - 19-02 (transformer)
    - 19-03 (emitter)

tech-stack:
  added: []
  patterns:
    - phantom-type-generic: TSchema phantom type for compile-time type checking
    - document-node-pattern: StateDocumentNode follows SkillDocumentNode pattern

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/jsx.ts

decisions:
  - key: state-node-modes
    choice: StateNode uses provider and config for SQLite-specific configuration
    rationale: Extensible for future providers while keeping SQLite specifics clear

metrics:
  duration: 1m 25s
  completed: 2026-01-22
---

# Phase 19 Plan 01: IR and JSX Foundation Summary

**One-liner:** StateDocumentNode/StateNode/OperationNode IR types and State<TSchema>/Operation JSX components with SQLite configuration

## What Was Built

### IR Types (src/ir/nodes.ts)

Added new "State Document Nodes" section with:

1. **StateSchemaField** - Represents a single flattened SQL column:
   - `name`: Column name (e.g., "config_debug")
   - `tsType`: TypeScript type (string, number, boolean, Date)
   - `sqlType`: SQL type (TEXT, INTEGER)
   - `defaultValue`: Default value for init SQL
   - `enumValues`: Optional enum values for CHECK constraint

2. **StateSchema** - Parsed TypeScript interface:
   - `interfaceName`: Original interface name
   - `fields`: Array of StateSchemaField

3. **OperationNode** - Custom operation child:
   - `kind: 'operation'` discriminator
   - `name`: Operation name (becomes skill suffix)
   - `sqlTemplate`: SQL with $variable placeholders
   - `args`: Inferred argument names

4. **StateNode** - Parsed State component:
   - `kind: 'state'` discriminator
   - `name`: State name (becomes skill prefix)
   - `provider: 'sqlite'` (extensible)
   - `config.database`: Database file path
   - `schema`: Parsed StateSchema
   - `operations`: Array of OperationNode

5. **StateDocumentNode** - Document root:
   - `kind: 'stateDocument'` discriminator
   - `state`: The StateNode definition

Added `StateDocumentNode` to `IRNode` union type.

### JSX Components (src/jsx.ts)

Added new "Scoped State Skills" section with:

1. **SQLiteConfig** - Provider-specific configuration interface:
   - `database`: Database file path

2. **StateProps<TSchema>** - State component props:
   - `name`: State name (skill prefix)
   - `provider: 'sqlite'`
   - `config`: SQLiteConfig
   - `children`: Operation children
   - `_schema`: Phantom type marker

3. **OperationProps** - Operation component props:
   - `name`: Operation name (skill suffix)
   - `children`: SQL template content

4. **State<TSchema>** - Compile-time component with full JSDoc and example

5. **Operation** - Compile-time component with JSDoc

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| phantom-type-generic | TSchema phantom type | Matches existing patterns (StateRef<TSchema>) |
| state-provider-config | Separate config object | Extensible for future providers |
| operation-not-in-blocknode | OperationNode internal to StateDocumentNode | Operations only valid inside State |

## Commits

| Hash | Description |
|------|-------------|
| a52f9c9 | feat(19-01): add State IR types to nodes.ts |
| 4fb32f5 | feat(19-01): add State and Operation JSX components |

## Next Phase Readiness

Ready for 19-02: Transformer implementation to convert State TSX to StateDocumentNode IR.

### Verified Working

- TypeScript compiles without new errors (pre-existing errors unrelated)
- StateDocumentNode in IRNode union
- State and Operation components exported from jsx.ts
- Full JSDoc documentation with examples
