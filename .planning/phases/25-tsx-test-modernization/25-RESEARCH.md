# Phase 25: TSX Test Modernization - Research

**Researched:** 2026-01-26
**Domain:** Internal codebase — v2.0 component usage in test files
**Confidence:** HIGH (internal features, fully documented)

## Summary

Phase 25 modernizes test files in `src/app/` to use v2.0 TSX syntax features. This is internal codebase work — the v2.0 features already exist and are documented. Test files serve as living documentation demonstrating correct component usage.

**Primary recommendation:** Update existing test files to demonstrate v2.0 features where applicable; keep examples simple and focused on happy paths.

## Standard Stack

No external dependencies. All v2.0 components are defined in `src/jsx.ts` and documented in `docs/`.

### Available v2.0 Components

| Component | Import | Purpose | Documented In |
|-----------|--------|---------|---------------|
| `Table` | `jsx.js` | Markdown tables from arrays | `docs/structured-components.md` |
| `List` | `jsx.js` | Bullet/ordered lists from arrays | `docs/structured-components.md` |
| `ExecutionContext` | `jsx.js` | `<execution_context>` with @ paths | `docs/semantic-components.md` |
| `SuccessCriteria` | `jsx.js` | `<success_criteria>` with checkboxes | `docs/semantic-components.md` |
| `OfferNext` | `jsx.js` | `<offer_next>` navigation routes | `docs/semantic-components.md` |
| `XmlSection` | `jsx.js` | Dynamic XML tag names | `docs/semantic-components.md` |
| `Step` | `jsx.js` | Numbered workflow steps | `docs/semantic-components.md` |
| `Loop` | `jsx.js` | Prose-based iteration | `docs/semantic-components.md` |
| Render props | Pattern | `{(ctx) => ...}` in Command/Agent | `docs/semantic-components.md` |

## Architecture Patterns

### Import Pattern
```typescript
import {
  Command,  // or Agent
  Table,
  List,
  ExecutionContext,
  SuccessCriteria,
  OfferNext,
  Step,
  // ... other components as needed
} from '../jsx.js';  // or '../../jsx.js' depending on depth
```

### Render Props Pattern
```tsx
<Command name="..." description="...">
  {(ctx) => (
    <>
      <p>Name: {ctx.name}</p>
      <p>Output: {ctx.outputPath}</p>
      {/* children */}
    </>
  )}
</Command>
```

### Structured Props Pattern
```tsx
// Instead of manual markdown
<Table
  headers={["Col1", "Col2"]}
  rows={[["a", "b"], ["c", "d"]]}
/>

<List items={["item1", "item2", "item3"]} />
```

### Semantic Sections Pattern
```tsx
<ExecutionContext paths={["file1.md", "file2.md"]} />

<SuccessCriteria items={[
  "Criterion 1",
  "Criterion 2"
]} />

<Step name="Setup" number={1}>
  <p>Step content</p>
</Step>
```

## Don't Hand-Roll

| Instead of | Use |
|------------|-----|
| Manual markdown tables | `<Table headers={...} rows={...} />` |
| Manual bullet lists | `<List items={...} />` |
| Manual `<execution_context>` XML | `<ExecutionContext paths={...} />` |
| Manual checkbox lists | `<SuccessCriteria items={...} />` |

## Common Pitfalls

### Pitfall 1: Wrong Import Path
**What goes wrong:** Component not found errors
**How to avoid:** Use relative path based on file location (`../jsx.js` from src/app/, `../../jsx.js` from src/app/scenarios/)

### Pitfall 2: Mixing Patterns
**What goes wrong:** Inconsistent output, redundant code
**How to avoid:** Use structured components OR manual markdown, not both for the same content

### Pitfall 3: Over-demonstrating
**What goes wrong:** Test files become complex, hard to understand
**How to avoid:** Each file should focus on demonstrating specific features; happy path only

## Code Examples

### Reference Implementation
Source: `src/app/verification/integration-v2.tsx`

This file demonstrates all v2.0 features working together:
- Render props with `{(ctx) => ...}`
- Table and List structured components
- ExecutionContext, SuccessCriteria, OfferNext semantic components
- Step component with different variants
- XmlSection for custom sections
- Loop and If/Else conditionals

### Minimal Table Example
```tsx
<Table
  headers={["Phase", "Status", "Progress"]}
  rows={[
    ["1", "✓", "100%"],
    ["2", "◆", "50%"],
  ]}
/>
```

### Minimal List Example
```tsx
<List items={["Step 1", "Step 2", "Step 3"]} />
<List items={["First", "Second"]} ordered />
```

### Minimal Semantic Example
```tsx
<ExecutionContext paths={[".planning/PROJECT.md"]} />

<SuccessCriteria items={[
  "Tests pass",
  "Code linted"
]} />
```

## Open Questions

None — features are implemented and documented.

## Sources

### Primary (HIGH confidence)
- `docs/structured-components.md` — Table, List usage
- `docs/semantic-components.md` — ExecutionContext, SuccessCriteria, OfferNext, Step, Loop
- `src/app/verification/integration-v2.tsx` — Reference implementation
- `src/app/test-render-props.tsx` — Render props example

### Phase Context
- `.planning/phases/25-tsx-test-modernization/25-CONTEXT.md` — User decisions from discussion

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — internal components, fully documented
- Architecture: HIGH — patterns demonstrated in existing verification files
- Pitfalls: HIGH — common TypeScript/import issues

**Research date:** 2026-01-26
**Valid until:** Indefinite (internal codebase)
