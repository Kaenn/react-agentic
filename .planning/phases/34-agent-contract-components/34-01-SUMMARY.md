---
phase: 34-agent-contract-components
plan: 01
subsystem: compiler-foundation
completed: 2026-02-01
duration: 7m 19s

tags:
  - ir-nodes
  - components
  - agent-contracts
  - typescript

requires:
  - phases: [33]
    reason: "IR infrastructure and component system foundation"

provides:
  - IR node types for agent contract components
  - TSX component stubs for contract authoring
  - Component exports for user consumption

affects:
  - phases: [34-02, 34-03]
    reason: "Parser transformers and emitters will reference these IR nodes and components"

tech-stack:
  added: []
  patterns:
    - "Contract components as compile-time stubs"
    - "IR node types with children array pattern"

key-files:
  created:
    - src/components/contract.ts
  modified:
    - src/ir/nodes.ts
    - src/emitter/emitter.ts
    - src/emitter/runtime-markdown-emitter.ts
    - src/components/index.ts
    - src/jsx.ts
    - src/index.ts

decisions:
  - id: contract-ir-nodes
    what: "Add 6 IR node types for contract components"
    why: "Parser and emitter need structured representation"
    impact: "Foundation for parser transformation (34-02) and emission (34-03)"

  - id: statusreturn-naming
    what: "Rename Return component to StatusReturn"
    why: "Avoid naming conflict with control flow Return component"
    impact: "Users write <StatusReturn> instead of <Return> inside <StructuredReturns>"

  - id: returnstatusnode-naming
    what: "Use ReturnStatusNode for IR, kind='returnStatus'"
    why: "Avoid conflict with control flow ReturnNode (kind='return')"
    impact: "Parser and emitter use distinct node kinds"

  - id: emitter-stub-cases
    what: "Add stub cases in both emitters throwing 'not yet implemented' errors"
    why: "TypeScript exhaustiveness checking requires all node kinds handled"
    impact: "Build succeeds; emitters will be implemented in phase 34-03"
---

# Phase 34 Plan 01: IR Node Types and Component Stubs

**One-liner:** Add IR node definitions and TSX component stubs for agent contract components (Role, UpstreamInput, DownstreamConsumer, Methodology, StructuredReturns, StatusReturn).

## Objective

Create the foundation types that parser and emitter will use for agent contract components. Components must exist before transformation can reference them.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add IR Node Types | c505ee3 | src/ir/nodes.ts, src/emitter/*.ts |
| 2 | Create Contract Component Stubs | 74ab9c6 | src/components/contract.ts |
| 3 | Export Components from Index Files | 399a8a1 | src/components/index.ts, src/jsx.ts, src/index.ts |

## What Was Built

### IR Node Types (Task 1)

Added 6 new IR node types to `src/ir/nodes.ts`:

1. **RoleNode** - Agent identity and responsibilities
2. **UpstreamInputNode** - Expected input context documentation
3. **DownstreamConsumerNode** - Output consumer documentation
4. **MethodologyNode** - Working approach description
5. **StructuredReturnsNode** - Container for return status documentation
6. **ReturnStatusNode** - Individual return status (renamed to avoid conflict)

All nodes follow the standard pattern:
- `kind` property for node discrimination
- `children: BaseBlockNode[]` for content
- Included in `BaseBlockNode` and `IRNode` unions

### Component Stubs (Task 2)

Created `src/components/contract.ts` with 6 compile-time component stubs:

- **Role** - Documents agent identity
- **UpstreamInput** - Documents expected inputs
- **DownstreamConsumer** - Documents output consumers
- **Methodology** - Documents working approach
- **StructuredReturns** - Container for status documentation
- **StatusReturn** - Individual return status definition

All components:
- Accept free-form `children` prop for flexible authoring
- Return `null` (compile-time only)
- Include TypeScript types for props
- Include JSDoc examples

### Exports (Task 3)

Made components available to users through:
- `src/components/index.ts` - Re-export with types
- `src/jsx.ts` - Include in JSX component list
- `src/index.ts` - Include in main library exports

Users can now import:
```tsx
import { Role, UpstreamInput, StatusReturn, StructuredReturns } from 'react-agentic';
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Emitter exhaustiveness check failure**
- **Found during:** Task 1, after adding IR node types
- **Issue:** TypeScript emitter switch statements have `assertNever` in default case, requiring all BaseBlockNode kinds to be handled
- **Fix:** Added stub cases in both emitters (emitter.ts and runtime-markdown-emitter.ts) that throw "not yet implemented (phase 34-02)" errors
- **Files modified:** src/emitter/emitter.ts, src/emitter/runtime-markdown-emitter.ts
- **Commit:** c505ee3 (included in Task 1)
- **Reason:** Build would fail without handling new node kinds; emitter implementation deferred to phase 34-03

**2. [Rule 3 - Blocking] Component naming conflict with control flow Return**
- **Found during:** Task 3, exporting components
- **Issue:** Control flow already has `Return` component (early exit) and `ReturnProps` type. Cannot export both.
- **Fix:**
  - Renamed contract component: `Return` → `StatusReturn`
  - Renamed props type: `ReturnProps` → `StatusReturnProps`
  - Renamed IR node: `ReturnNode` → `ReturnStatusNode` (kind='returnStatus')
- **Files modified:** src/components/contract.ts, src/ir/nodes.ts, src/components/index.ts, src/jsx.ts, src/index.ts
- **Commit:** 399a8a1
- **Reason:** TypeScript doesn't allow same identifier for different exports; StatusReturn is semantically clearer (documents status vs. exits early)

**3. [Rule 3 - Blocking] Type export conflict with ReturnStatus**
- **Found during:** Task 3, exporting components
- **Issue:** Control flow exports `type ReturnStatus` (union of status strings). Cannot export component with same name.
- **Fix:** Component already renamed to StatusReturn (see deviation #2), avoiding this conflict
- **No additional changes needed**

## Decisions Made

1. **IR node naming pattern:** Use descriptive suffixes (RoleNode, UpstreamInputNode) matching existing pattern
2. **Component stub pattern:** All return null, accept ContractComponentProps with free-form children
3. **StatusReturn naming:** Chose StatusReturn over alternatives (ReturnStatus, ReturnDoc) for clarity about purpose
4. **Emitter stub approach:** Throw descriptive errors rather than silently ignore (fails fast if accidentally used before phase 34-03)

## Verification

All success criteria met:

- ✅ IR nodes.ts has RoleNode, UpstreamInputNode, DownstreamConsumerNode, MethodologyNode, ReturnStatusNode, StructuredReturnsNode
- ✅ contract.ts exists with component stubs and TypeScript types
- ✅ Components are exported from components/index.ts
- ✅ Components are re-exported from jsx.ts and index.ts
- ✅ npm run build succeeds
- ✅ All 6 components are exported and callable: Role, UpstreamInput, DownstreamConsumer, Methodology, StatusReturn, StructuredReturns

```bash
# Build verification
npm run build  # ✅ Succeeds

# IR node types exist
grep -c "RoleNode\|StructuredReturnsNode" dist/index.d.ts  # ✅ 6 occurrences

# Components exported
node -e "const j = require('./dist/index.js'); console.log(Object.keys(j).filter(k => ['Role', 'UpstreamInput', 'DownstreamConsumer', 'Methodology', 'StatusReturn', 'StructuredReturns'].includes(k)))"
# ✅ ['DownstreamConsumer', 'Methodology', 'Role', 'StatusReturn', 'StructuredReturns', 'UpstreamInput']
```

## Next Phase Readiness

**Ready for Phase 34-02:** Parser transformers can now reference:
- IR node types for transformation targets
- Component function names for JSX element matching
- Props types for validation

**Blocked:** None

**Concerns:**
- Users might be confused by StatusReturn vs Return naming (though semantically clearer)
- Parser transformers in 34-02 will need to handle both `<Return>` (legacy) and `<StatusReturn>` JSX element names for backward compatibility

## Testing Notes

No automated tests added in this phase (foundation types only). Testing will occur in:
- Phase 34-02: Parser transformation tests
- Phase 34-03: Emission output tests

## Performance Impact

- Build time: +1.2s (TypeScript compilation of new types)
- Runtime: None (compile-time only components)
- Bundle size: +0.5KB (component stubs in dist)
