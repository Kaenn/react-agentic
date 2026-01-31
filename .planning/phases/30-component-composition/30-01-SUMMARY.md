---
phase: 30-component-composition
plan: 01
subsystem: parser
tags: [transformer, props, children, fragments, composition]

requires:
  - Phase 26: Parser refactoring (transformer module structure)
  - Phase 27: Component registry

provides:
  - Static transformer with props, children, and fragment support
  - Feature parity between v1 (static) and v3 (runtime) transformer paths
  - Context-based prop/children substitution mechanism

affects:
  - 30-02: Uses updated transformCustomComponent for local component support

tech-stack:
  added: []
  patterns:
    - Context-based prop substitution (componentProps field)
    - Block-level children substitution (componentChildren field)
    - GroupNode wrapping for multi-block fragment returns

key-files:
  created: []
  modified:
    - src/parser/transformers/markdown.ts
    - src/parser/transformers/types.ts
    - src/parser/transformers/dispatch.ts
    - src/parser/transformers/inline.ts

decisions:
  - id: "30-01-context-substitution"
    choice: "Context-based prop/children substitution"
    rationale: "ts-morph AST nodes are immutable; passing props via context allows substitution during transformation without AST modification"

  - id: "30-01-groupnode-fragments"
    choice: "Return multiple blocks from fragments via GroupNode"
    rationale: "Keeps BlockNode | null return type unchanged; emitter already handles GroupNode with tight spacing"

  - id: "30-01-block-level-children"
    choice: "Children substitution at block level in dispatch.ts"
    rationale: "Children are block-level elements, not inline text; spreading into parent's children array is correct approach"

metrics:
  duration: 6.5m
  tests: 795 (all passing)
  completed: 2026-01-31
---

# Phase 30 Plan 01: Static Transformer Props, Children, and Fragments Summary

Extended static transformer to support props, children, and fragments in custom components for feature parity with runtime path.

## One-Liner

Context-based prop substitution and block-level children spreading in static transformer with GroupNode wrapping for fragments.

## What Was Built

### Task 1-2: Prop Extraction and Substitution
- Removed error that blocked props on custom components
- Added `extractPropsFromUsage()` function to extract prop values from usage site (string, number, boolean)
- Added `componentProps` field to `TransformContext` for prop substitution
- Added prop lookup in `transformToInline()` for `{propName}` and `{props.propName}` patterns

### Task 3: Children Support
- Added `componentChildren` field to `TransformContext` for children block storage
- Updated `transformBlockChildren()` in dispatch.ts to handle `{children}` expressions
- Children blocks are spread into parent's children array at substitution point

### Task 4: Fragment Support
- Updated fragment handling in `transformCustomComponent()` to return all blocks
- Single block returned directly, multiple blocks wrapped in `GroupNode`
- Emitter handles GroupNode with tight newline spacing (vs double newlines for regular blocks)

## Key Implementation Details

### Context-Based Substitution Pattern
```typescript
// Save and set context for prop/children substitution
const previousProps = ctx.componentProps;
const previousChildren = ctx.componentChildren;
ctx.componentProps = props;
ctx.componentChildren = childrenBlocks;

// Transform resolved JSX (uses ctx during transformation)
const result = transformToBlock(resolved.jsx, ctx);

// Restore context
ctx.componentProps = previousProps;
ctx.componentChildren = previousChildren;
```

### Prop Substitution in Inline Transformer
```typescript
// Check for component prop substitution: {propName} or {props.propName}
if (ctx.componentProps) {
  if (Node.isIdentifier(expr)) {
    const propName = expr.getText();
    if (ctx.componentProps.has(propName)) {
      return { kind: 'text', value: String(ctx.componentProps.get(propName)) };
    }
  }
}
```

### Children Substitution at Block Level
```typescript
// In transformBlockChildren
if (Node.isJsxExpression(child)) {
  const expr = child.getExpression();
  if (expr) {
    const text = expr.getText();
    if ((text === 'children' || text === 'props.children') && ctx.componentChildren) {
      blocks.push(...ctx.componentChildren);
      continue;
    }
  }
}
```

## Commits

| Hash | Message |
|------|---------|
| 2995731 | feat(30-01): add prop, children, fragment support to static transformer |
| badd7a5 | feat(30-01): add prop substitution and children support |

## Deviations from Plan

None - plan executed exactly as written.

## Known Limitations

1. **Import-based components only**: Current implementation uses `resolveComponentImport` which requires components to be imported. Local component composition (components defined in same file) will be addressed in Plan 30-02.

2. **Static values only**: Props must be static values (string, number, boolean). Runtime expressions not supported in static path.

## Next Phase Readiness

- Types are in place for local component support (`componentProps`, `componentChildren`)
- Pattern established for context-based substitution
- Ready for Plan 30-02 to add local component extraction and resolution
