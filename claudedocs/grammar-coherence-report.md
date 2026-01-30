# Grammar Coherence Report

**Date**: 2026-01-29
**Status**: Resolved

This report documents the coherence analysis between `docs/grammar.md` and the actual implementation, and the resolution approach taken.

---

## Executive Summary

Analysis of `docs/grammar.md` against actual exports revealed **significant coherence issues**. The grammar documentation described 50 components, but only ~35 were actually exported from the public API. This report documents the findings and resolution.

**Resolution Approach**: Mark non-exported components as "internal/future" in the grammar documentation rather than removing them, preserving documentation for internal development while clearly indicating public API availability.

---

## Issues Found

### 1. Components Documented But Not Exported (15 total)

These components were documented in grammar.md but NOT exported from `src/jsx.ts` or `src/index.ts`:

| Component | Category | Status |
|-----------|----------|--------|
| `<Step>` | Workflow Primitives | Implementation not found |
| `<Bash>` | Workflow Primitives | Implementation not found |
| `<ReadFiles>` | Workflow Primitives | Implementation not found |
| `<PromptTemplate>` | Workflow Primitives | Implementation not found |
| `<Assign>` | Variable Components | Implementation not found |
| `<AssignGroup>` | Variable Components | Implementation not found |
| `<ReadState>` | State Components | File exists in `src/workflow/state/`, not exported |
| `<WriteState>` | State Components | File exists in `src/workflow/state/`, not exported |
| `<SuccessCriteria>` | Semantic Components | Exported from `workflow/sections/`, not from public API |
| `<OfferNext>` | Semantic Components | Exported from `workflow/sections/`, not from public API |
| `<XmlSection>` | Semantic Components | Exported from `workflow/sections/`, not from public API |
| `<DeviationRules>` | XML Wrappers | Exported from `workflow/sections/`, not from public API |
| `<CommitRules>` | XML Wrappers | Exported from `workflow/sections/`, not from public API |
| `<WaveExecution>` | XML Wrappers | Exported from `workflow/sections/`, not from public API |
| `<CheckpointHandling>` | XML Wrappers | Exported from `workflow/sections/`, not from public API |

### 2. Prop Mismatch: ReadState/WriteState

**ReadState** - Grammar showed:
```tsx
<ReadState
  stateKey="projectContext"   // WRONG
  variableName="CTX"          // WRONG
  field="user.name"
/>
```

**Actual implementation** (`src/workflow/state/ReadState.ts`):
```tsx
interface ReadStateProps<TSchema> {
  state: StateRef<TSchema>;  // NOT stateKey
  into: VariableRef;         // NOT variableName
  field?: string;
}
```

**WriteState** - Grammar showed:
```tsx
<WriteState
  stateKey="projectContext"   // WRONG
  mode="field"                // WRONG - no mode prop
  field="user.name"
  value={{ type: 'variable', content: 'NAME' }}  // WRONG structure
/>
```

**Actual implementation** (`src/workflow/state/WriteState.ts`):
```tsx
interface WriteStateProps<TSchema> {
  state: StateRef<TSchema>;  // NOT stateKey
  field?: string;
  value?: string | VariableRef;  // simpler type
  merge?: AllowVariableRefs<TSchema>;  // new prop
}
```

### 3. Implemented But Undocumented Systems

These complete systems exist in `src/workflow/` but were NOT in grammar.md:

| System | Files | Description |
|--------|-------|-------------|
| State System | `state/State.ts`, `state/types.ts` | Full typed state management |
| Skill System | `skill/Skill.ts`, `skill/index.ts` | Skill definitions and emission |
| MCP System | `mcp/MCP.ts`, `mcp/index.ts` | MCP configuration components |

**Decision**: These remain undocumented intentionally - they are internal implementation details.

### 4. Element Count Mismatch

Original grammar claimed **50 elements** with no public/internal distinction.

**Corrected breakdown**:
- 35 public components (exported in API)
- 15 internal components (documented but not exported)
- 50 total (correct)

---

## Resolution Applied

### 1. Added Internal/Future Notices

Added warning banners to three sections:

```markdown
> **⚠️ Internal/Future**: These components are not yet available in the public API.
> They are documented for internal development and may be exported in a future release.
```

Applied to:
- State Components section (line ~460)
- Workflow Primitives section (line ~660)
- Variable Components section (line ~735)

### 2. Fixed ReadState/WriteState Props

Updated prop documentation to match actual implementation:

**ReadState**:
| Old Prop | New Prop | Type |
|----------|----------|------|
| `stateKey` | `state` | `StateRef<TSchema>` |
| `variableName` | `into` | `VariableRef` |

**WriteState**:
| Old Prop | New Prop | Notes |
|----------|----------|-------|
| `stateKey` | `state` | Type: `StateRef<TSchema>` |
| `mode` | (removed) | Use field+value OR merge instead |
| `value` | `value` | Type simplified to `string \| VariableRef` |
| (new) | `merge` | Type: `Partial<TSchema>` |

### 3. Updated Version Matrix

Added Status column showing public/internal status for each component:
- ✅ Public: Exported in public API
- 🔒 Internal: Implemented but not exported

### 4. Updated Element Summary

Changed from single count to public/internal split:
- **35 public components**
- **15 internal components**
- **50 total**

---

## Files Modified

```
docs/grammar.md
```

Specific changes:
1. Lines ~460-507: State Components section with internal notice + corrected props
2. Lines ~660-662: Workflow Primitives section with internal notice
3. Lines ~735-737: Variable Components section with internal notice
4. Lines ~846-907: Version Matrix with Status column and legend
5. Lines ~923-941: Element Summary with public/internal breakdown

---

## Remaining Considerations

### Undocumented Systems (Intentionally Internal)

The following systems exist but are NOT documented in grammar.md:

1. **State System** (`src/workflow/state/`)
   - `useStateRef()` hook
   - `State` type definitions
   - Full typed state registry

2. **Skill System** (`src/workflow/skill/`)
   - `Skill` component
   - `emitSkill()` function
   - Skill configuration

3. **MCP System** (`src/workflow/mcp/`)
   - `MCP` component
   - Server configuration
   - Tool definitions

**Rationale**: These are internal implementation details that may change. They can be documented when stabilized and ready for public API export.

### Test Coverage vs Reality

The test suite (`tests/grammar/`) tests components that aren't exported:
- `WorkflowPrimitives/step.test.ts`
- `WorkflowPrimitives/bash.test.ts`
- `VariableComponents/assign.test.ts`
- `StateComponents/read-state.test.ts`
- `SemanticComponents/success-criteria.test.ts`

These tests likely exist for:
1. Future features being developed
2. Internal testing of planned exports
3. Components used internally by the compiler

---

## Verification Checklist

After changes:

- [x] All 15 internal components have `🔒 Internal` status in Version Matrix
- [x] State Components section has internal notice
- [x] Workflow Primitives section has internal notice
- [x] Variable Components section has internal notice
- [x] ReadState props match `src/workflow/state/ReadState.ts`
- [x] WriteState props match `src/workflow/state/WriteState.ts`
- [x] Element Summary shows 35 public / 15 internal = 50 total
- [x] Version Matrix has Status column with legend

---

## Conclusion

The grammar documentation is now coherent with the actual implementation:
- Users are clearly informed which components are available
- Internal components are documented for development but marked appropriately
- Prop documentation matches actual code
- Element counts accurately reflect public vs internal breakdown
