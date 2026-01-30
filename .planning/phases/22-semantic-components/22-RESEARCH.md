# Phase 22: Semantic Components - Research

**Researched:** 2026-01-26
**Domain:** Internal codebase patterns (TSX-to-Markdown compiler)
**Confidence:** HIGH

## Summary

Phase 22 adds semantic components for Claude Code patterns to the react-agentic compiler. This is an internal codebase phase — no external library research needed. All patterns derive from existing codebase conventions.

Key insight: `XmlBlockNode` already exists in the IR. Semantic components are convenience wrappers that emit specific XmlBlockNode instances with structured children.

**Primary recommendation:** Follow existing component patterns (`Table`, `List`) — define props interface, stub function, transformer logic, emitter case.

## Standard Stack

No new dependencies — this phase extends existing codebase patterns.

### Core Patterns Reference

| File | Role | Pattern |
|------|------|---------|
| `src/primitives/structured.ts` | Component stubs | Interface + function returning null |
| `src/ir/nodes.ts` | IR definitions | Discriminated unions with `kind` |
| `src/parser/transformer.ts` | TSX→IR | Switch on JSX element name |
| `src/emitter/emitter.ts` | IR→Markdown | Switch on `node.kind` |

### Existing XmlBlockNode

```typescript
// src/ir/nodes.ts:146-154
export interface XmlBlockNode {
  kind: 'xmlBlock';
  name: string;
  attributes?: Record<string, string>;
  children: BlockNode[];
}
```

Semantic components emit XmlBlockNode with:
- `name` = snake_case tag (e.g., `execution_context`)
- `children` = structured content specific to each component

## Architecture Patterns

### Component Definition Pattern

From `src/primitives/structured.ts`:

```typescript
// 1. Props interface with JSDoc
export interface TableProps {
  headers?: string[];
  rows: (string | number)[][];
  align?: TableAlignment[];
  emptyCell?: string;
}

// 2. Component stub (returns null - compile-time only)
export function Table(_props: TableProps): null {
  return null;
}
```

### Transformer Pattern

From `src/parser/transformer.ts`:

```typescript
case 'Table': {
  const headers = evaluateProp<string[]>(props.headers);
  const rows = evaluateProp<(string | number)[][]>(props.rows);
  // ... validation ...
  return createTableNode(headers, rows, align, emptyCell);
}
```

### Emitter Pattern

From `src/emitter/emitter.ts`:

```typescript
case 'table': {
  const result: string[] = [];
  // ... build markdown lines ...
  return result.join('\n');
}
```

## Implementation Approach

### New Components → XmlBlockNode Mapping

| Component | XML Tag | Content |
|-----------|---------|---------|
| `ExecutionContext` | `<execution_context>` | `@`-prefixed paths, one per line |
| `SuccessCriteria` | `<success_criteria>` | Checkbox list `- [ ]` items |
| `OfferNext` | `<offer_next>` | Route bullet list |
| `DeviationRules` | `<deviation_rules>` | Children passthrough |
| `CommitRules` | `<commit_rules>` | Children passthrough |
| `WaveExecution` | `<wave_execution>` | Children passthrough |
| `CheckpointHandling` | `<checkpoint_handling>` | Children passthrough |
| `XmlSection` | `<{name}>` | Generic wrapper, children passthrough |

### Props Interfaces (from CONTEXT.md decisions)

```typescript
// ExecutionContext
interface ExecutionContextProps {
  paths: string[];
  prefix?: string;  // Default: '@'
  children?: ReactNode;  // Optional, Claude's discretion
}

// SuccessCriteria
interface SuccessCriteriaItem {
  text: string;
  checked?: boolean;
}
interface SuccessCriteriaProps {
  items: (string | SuccessCriteriaItem)[];
}

// OfferNext
interface Route {
  name: string;
  description?: string;
  path: string;
}
interface OfferNextProps {
  routes: Route[];
}

// XML Wrappers (all same pattern)
interface XmlSectionProps {
  name: string;
  children: ReactNode;
}
```

### Output Examples

**ExecutionContext:**
```
<execution_context>
@/path/to/file1.md
@/path/to/file2.md
</execution_context>
```

**SuccessCriteria:**
```
<success_criteria>
- [ ] First criterion
- [x] Pre-checked item
- [ ] Third criterion
</success_criteria>
```

**OfferNext:**
```
<offer_next>
- **Route Name**: Optional description
  `/path/to/command`
</offer_next>
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| XML wrapping | Custom tag handling | Existing `XmlBlockNode` |
| Checkbox lists | String concatenation | Generate proper `ListNode` items |

## Common Pitfalls

### Pitfall 1: Missing snake_case Normalization
**What goes wrong:** Component name `DeviationRules` emits `<DeviationRules>` instead of `<deviation_rules>`
**How to avoid:** Apply snake_case transform in transformer, not emitter

### Pitfall 2: Children vs Props Content Mixing
**What goes wrong:** ExecutionContext paths mixed with children incorrectly
**How to avoid:** Clear IR structure — paths become specific child nodes first

### Pitfall 3: Checkbox State
**What goes wrong:** All items emit as unchecked `- [ ]`
**How to avoid:** Check for object items with `checked: true` property

## Code Examples

### Component Stub Pattern
```typescript
// src/primitives/semantic.ts
export interface ExecutionContextProps {
  paths: string[];
  prefix?: string;
}

export function ExecutionContext(_props: ExecutionContextProps): null {
  return null;
}
```

### Transformer Pattern
```typescript
case 'ExecutionContext': {
  const paths = evaluateProp<string[]>(props.paths);
  const prefix = evaluateProp<string>(props.prefix) ?? '@';

  // Build content: one path per line with prefix
  const content = paths.map(p => `${prefix}${p}`).join('\n');

  // Emit as XmlBlockNode with raw content child
  return {
    kind: 'xmlBlock',
    name: 'execution_context',
    children: [{ kind: 'raw', content }]
  };
}
```

## Open Questions

None — CONTEXT.md provides all needed decisions.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/primitives/structured.ts`, `src/ir/nodes.ts`
- User decisions: `.planning/phases/22-semantic-components/22-CONTEXT.md`

## Metadata

**Confidence breakdown:**
- Implementation patterns: HIGH - existing codebase provides clear templates
- Props design: HIGH - user decisions in CONTEXT.md
- Edge cases: MEDIUM - checkbox state handling needs validation

**Research date:** 2026-01-26
**Valid until:** N/A (internal codebase patterns, stable)
