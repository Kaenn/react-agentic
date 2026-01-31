# Phase 27: Baseline & Registry - Research

**Researched:** 2026-01-31
**Domain:** Snapshot testing (Vitest) and component registry pattern (TypeScript)
**Confidence:** HIGH

## Summary

Phase 27 establishes safety infrastructure before refactoring by creating snapshot tests for all component markdown output and formalizing primitive classification with a registry. This is a foundational phase that enables safe refactoring in later phases.

The research reveals that Vitest provides robust snapshot testing with both inline and external snapshot file support. The project already uses Vitest 4.0.17 with inline snapshots (`toMatchInlineSnapshot`) in existing tests. For component testing, external snapshots stored in `__snapshots__/` directories are the standard approach, offering better organization and diff visibility.

Component registry patterns in TypeScript typically use a central map or Set with type-safe accessors. The compiler already has an implicit primitive classification system in `src/parser/transformers/dispatch.ts` where components are checked via string equality (`name === 'If'`). The registry will formalize this with explicit lists and functions like `isPrimitive()`.

**Primary recommendation:** Use Vitest external snapshots in `tests/components/__snapshots__/` for component output testing, and create a registry module at `src/ir/registry.ts` that exports typed functions for primitive/composite classification.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.0.17 | Test framework | Already in package.json, Jest-compatible API, fast Vite-native execution |
| @vitest/snapshot | (bundled) | Snapshot assertions | Bundled with Vitest, provides toMatchSnapshot() and toMatchInlineSnapshot() |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.9.3 | Type system | Already in use, enables discriminated unions for registry |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| External snapshots | Inline snapshots | Inline is better for small snippets but worse for large markdown output with multiline content |
| Vitest | Jest | Jest has more ecosystem maturity but Vitest is faster and already integrated |

**Installation:**

No new dependencies required — Vitest 4.0.17 is already in devDependencies.

## Architecture Patterns

### Recommended Project Structure

```
tests/
├── components/               # Component snapshot tests
│   ├── __snapshots__/       # Vitest auto-creates this
│   │   ├── Command.test.ts.snap
│   │   ├── Agent.test.ts.snap
│   │   ├── If.test.ts.snap
│   │   └── ...
│   ├── Command.test.ts
│   ├── Agent.test.ts
│   ├── control-flow.test.ts  # If, Else, Loop, Break, Return
│   ├── structured.test.ts     # Table, List
│   ├── runtime.test.ts        # Runtime components
│   └── semantic.test.ts       # ExecutionContext
└── emitter/                  # Existing emitter tests
    └── ...

src/
└── ir/
    ├── nodes.ts
    ├── runtime-nodes.ts
    └── registry.ts           # NEW: Component registry
```

### Pattern 1: Component Snapshot Testing

**What:** Test component markdown output by building IR nodes directly and emitting them
**When to use:** For every primitive component to baseline current behavior
**Example:**

```typescript
// Source: Existing tests/emitter/document.test.ts pattern
import { describe, expect, it } from 'vitest';
import { emit, type IfNode, type BlockNode } from '../../src/index.js';
import { MarkdownEmitter } from '../../src/emitter/emitter.js';

describe('If component', () => {
  it('emits basic if block', () => {
    const ifNode: IfNode = {
      kind: 'if',
      condition: { type: 'ref', ref: { kind: 'runtimeVarRef', varName: 'CTX', path: ['error'] } },
      children: [
        { kind: 'paragraph', children: [{ kind: 'text', value: 'Error occurred' }] }
      ]
    };

    const emitter = new MarkdownEmitter();
    expect(emitter.emitRuntimeBlock(ifNode)).toMatchSnapshot();
  });

  it('emits if with nested spawn agent', () => {
    // Test nesting combination
    const ifNode: IfNode = {
      kind: 'if',
      condition: { type: 'literal', value: true },
      children: [
        {
          kind: 'spawnAgent',
          agent: 'test-agent',
          model: 'claude-sonnet-4-5',
          description: 'Run test',
          outputVar: 'RESULT'
        }
      ]
    };

    expect(emitter.emitRuntimeBlock(ifNode)).toMatchSnapshot();
  });
});
```

### Pattern 2: Component Registry

**What:** Central module that defines which components are primitives vs composites
**When to use:** Replace ad-hoc string checks throughout the codebase
**Example:**

```typescript
// Source: TypeScript registry pattern best practices
// From: https://techhub.iodigital.com/articles/function-registry-pattern-react
// Adapted for component classification

// src/ir/registry.ts
export const PRIMITIVE_COMPONENTS = new Set([
  // Infrastructure primitives
  'spawnAgent',
  'if',
  'else',
  'loop',
  'break',
  'return',
  'askUser',

  // Presentation primitives (destined for composite in Phase 32)
  'table',
  'list',
  'executionContext',
  'xmlBlock',
] as const);

export type PrimitiveComponent = typeof PRIMITIVE_COMPONENTS extends Set<infer T> ? T : never;

export function isPrimitive(component: { kind: string }): boolean {
  return PRIMITIVE_COMPONENTS.has(component.kind as any);
}

export function getPrimitives(): ReadonlySet<string> {
  return PRIMITIVE_COMPONENTS;
}

export function getComposites(): string[] {
  // Empty for now, populated in Phase 32+
  return [];
}

export interface ComponentInfo {
  kind: string;
  category: 'primitive' | 'composite';
  migrationTarget?: 'composite'; // For presentation primitives
}

export function getComponentInfo(kind: string): ComponentInfo {
  if (PRIMITIVE_COMPONENTS.has(kind as any)) {
    const migrationTarget = ['table', 'list', 'executionContext', 'xmlBlock'].includes(kind)
      ? 'composite' as const
      : undefined;
    return { kind, category: 'primitive', migrationTarget };
  }
  return { kind, category: 'composite' };
}
```

### Pattern 3: External Snapshot Organization

**What:** Vitest automatically creates `__snapshots__/` directories for external snapshots
**When to use:** Component markdown output testing (large multiline strings)
**Example:**

```typescript
// tests/components/Table.test.ts
import { describe, expect, it } from 'vitest';
import type { TableNode } from '../../src/ir/nodes.js';
import { MarkdownEmitter } from '../../src/emitter/emitter.js';

describe('Table component', () => {
  it('emits basic table', () => {
    const table: TableNode = {
      kind: 'table',
      headers: ['Name', 'Type'],
      rows: [['foo', 'string'], ['bar', 'number']],
    };

    const emitter = new MarkdownEmitter();
    const markdown = emitter.emitBlock(table);

    // External snapshot - Vitest creates __snapshots__/Table.test.ts.snap
    expect(markdown).toMatchSnapshot();
  });

  it('emits table with alignment', () => {
    const table: TableNode = {
      kind: 'table',
      headers: ['Name', 'Value'],
      rows: [['foo', '42']],
      align: ['left', 'right'],
    };

    const emitter = new MarkdownEmitter();
    expect(emitter.emitBlock(table)).toMatchSnapshot('table-with-alignment');
  });
});
```

Result in `__snapshots__/Table.test.ts.snap`:

```javascript
// Vitest Snapshot v1, https://vitest.dev/guide/snapshot.html

exports['Table component > emits basic table 1'] = `
"| Name | Type |
|------|------|
| foo | string |
| bar | number |"
`;

exports['Table component > emits table with alignment 1'] = `
"| Name | Value |
|:-----|------:|
| foo | 42 |"
`;
```

### Anti-Patterns to Avoid

- **Inline snapshots for large output:** Inline snapshots make test files huge and diffs hard to read for markdown with 10+ lines
- **Testing full documents:** Snapshot the component output only, not entire Command/Agent documents (too much noise)
- **String checking components:** Don't use `name === 'If'` checks — use `isPrimitive(node)` instead
- **Runtime execution in snapshots:** Runtime components emit templates (with `$VAR` placeholders), not executed results

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Snapshot testing | Custom file comparison | Vitest toMatchSnapshot() | Auto-updates snapshots with -u flag, handles serialization, provides clear diffs |
| Component enumeration | Manual arrays | Set/Map with typed accessors | Sets prevent duplicates, typed accessors ensure exhaustiveness |
| Markdown diffing | Custom string comparison | Vitest snapshot diff viewer | Built-in, colorized, line-by-line comparison |

**Key insight:** Snapshot testing looks simple but handling updates, serialization, and diffing is complex. Vitest solves all edge cases.

## Common Pitfalls

### Pitfall 1: Snapshot Bloat from Full Documents

**What goes wrong:** Testing entire Command/Agent documents creates massive snapshots that are hard to review in PRs
**Why it happens:** It's easier to test the full output than isolate components
**How to avoid:** Test individual component IR nodes, not DocumentNode
**Warning signs:** Snapshot files over 100 lines, test diffs that show frontmatter changes

### Pitfall 2: Runtime Component Execution Expectations

**What goes wrong:** Expecting runtime components (If, Loop, etc.) to execute conditions and show real branching
**Why it happens:** Misunderstanding that snapshots test the **emitted template**, not runtime behavior
**How to avoid:** Document that runtime snapshots show the **instructions for Claude**, e.g., `Check if $CTX.error exists`, not actual execution
**Warning signs:** Tests expecting different output based on variable values

### Pitfall 3: Component Kind Typos in Registry

**What goes wrong:** Registry uses string literals that can have typos ('spawnagent' vs 'spawnAgent')
**Why it happens:** No compile-time check for string values in Set
**How to avoid:**
  - Import node kinds from IR definitions as const arrays
  - Use `as const` assertions on the Set values
  - Add a test that verifies all dispatcher checks match registry
**Warning signs:** isPrimitive() returning false for known primitives

### Pitfall 4: Forgetting Snapshot Updates After Component Changes

**What goes wrong:** Making legitimate component output changes but forgetting to update snapshots
**Why it happens:** Tests fail but developer doesn't run `vitest -u` to accept changes
**How to avoid:**
  - Document update workflow in test file comments
  - CI should show clear "run vitest -u to update" message
  - Review snapshot diffs in PR as carefully as code changes
**Warning signs:** Tests failing with "does not match stored snapshot"

## Code Examples

Verified patterns from official sources:

### Basic Component Snapshot Test

```typescript
// Source: https://github.com/vitest-dev/vitest/blob/main/docs/guide/snapshot.md
import { describe, expect, it } from 'vitest';
import type { XmlBlockNode } from '../../src/ir/nodes.js';
import { MarkdownEmitter } from '../../src/emitter/emitter.js';

describe('XmlBlock component', () => {
  it('emits basic xml block', () => {
    const node: XmlBlockNode = {
      kind: 'xmlBlock',
      name: 'example',
      children: [
        { kind: 'paragraph', children: [{ kind: 'text', value: 'Content' }] }
      ]
    };

    const emitter = new MarkdownEmitter();
    const result = emitter.emitBlock(node);

    // First run: creates snapshot
    // Subsequent runs: compares against snapshot
    expect(result).toMatchSnapshot();
  });

  it('emits xml block with attributes', () => {
    const node: XmlBlockNode = {
      kind: 'xmlBlock',
      name: 'section',
      attributes: { id: 'intro', class: 'main' },
      children: [
        { kind: 'paragraph', children: [{ kind: 'text', value: 'Content' }] }
      ]
    };

    const emitter = new MarkdownEmitter();
    expect(emitter.emitBlock(node)).toMatchSnapshot();
  });
});
```

### Runtime Component Snapshot Test

```typescript
// Testing runtime components - they emit TEMPLATES, not execution results
import { describe, expect, it } from 'vitest';
import type { LoopNode } from '../../src/ir/runtime-nodes.js';
import { MarkdownRuntimeEmitter } from '../../src/emitter/runtime-markdown-emitter.js';

describe('Loop component', () => {
  it('emits loop with counter variable', () => {
    const node: LoopNode = {
      kind: 'loop',
      max: 5,
      counterVar: 'i',
      children: [
        { kind: 'paragraph', children: [{ kind: 'text', value: 'Iteration step' }] }
      ]
    };

    const emitter = new MarkdownRuntimeEmitter();
    const result = emitter.emitRuntimeBlock(node);

    // Snapshot will show the TEMPLATE output (instructions for Claude)
    // NOT 5 iterations of "Iteration step"
    expect(result).toMatchSnapshot();
  });

  it('emits nested loop with break', () => {
    const node: LoopNode = {
      kind: 'loop',
      max: 10,
      children: [
        {
          kind: 'if',
          condition: { type: 'literal', value: true },
          children: [
            { kind: 'break', message: 'Done early' }
          ]
        }
      ]
    };

    const emitter = new MarkdownRuntimeEmitter();
    expect(emitter.emitRuntimeBlock(node)).toMatchSnapshot();
  });
});
```

### Component Registry Usage

```typescript
// Source: TypeScript registry pattern adapted from function registry pattern
// https://techhub.iodigital.com/articles/function-registry-pattern-react
import { isPrimitive, getComponentInfo, PRIMITIVE_COMPONENTS } from '../../src/ir/registry.js';
import type { BlockNode } from '../../src/ir/runtime-nodes.js';

// BEFORE (in dispatcher):
if (name === 'If') {
  return transformIf(node, ctx);
}

// AFTER (using registry):
if (isPrimitive({ kind: name })) {
  // Handle primitive component
}

// Check if presentation primitive is destined for composite layer:
const info = getComponentInfo('table');
if (info.migrationTarget === 'composite') {
  console.log('This primitive will move to composite layer in Phase 32');
}

// List all primitives for documentation:
console.log('Primitives:', Array.from(PRIMITIVE_COMPONENTS));
```

### Snapshot Update Workflow

```bash
# Source: https://github.com/vitest-dev/vitest/blob/main/docs/api/expect.md

# Run tests (will fail if snapshots don't match)
npm run test

# Update all snapshots
npm run test -- -u

# Update snapshots for specific file
npm run test -- -u tests/components/If.test.ts

# Interactive update mode (review each change)
npm run test -- -u --reporter=verbose
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest snapshots | Vitest snapshots | Vitest 1.0 (2022) | Faster execution, Vite integration, same API |
| Inline snapshots everywhere | External snapshots for large output | Ongoing best practice | Better PR review, cleaner test files |
| Ad-hoc component checks | Registry pattern | Recent pattern (2024+) | Type safety, centralized classification |

**Deprecated/outdated:**
- **Jest for Vite projects**: Vitest is the standard for Vite-based projects (faster, native ESM)
- **Manual snapshot file management**: Vitest auto-creates and manages __snapshots__/ directories

## Open Questions

None — research is complete with high confidence. All questions resolved:

1. **Snapshot organization:** External snapshots in `tests/components/__snapshots__/` (HIGH confidence from Vitest docs)
2. **Component classification:** Registry at `src/ir/registry.ts` with Set-based storage (HIGH confidence from TypeScript patterns)
3. **Runtime component testing:** Test emitted templates, not execution (HIGH confidence from phase context)
4. **Test coverage scope:** Key variations + important nesting combinations (MEDIUM confidence — determined by planner)

## Sources

### Primary (HIGH confidence)

- [Vitest v4.0.17 Documentation](https://github.com/vitest-dev/vitest) - Snapshot testing API and best practices
- [Vitest Snapshot Guide](https://github.com/vitest-dev/vitest/blob/main/docs/guide/snapshot.md) - External vs inline snapshots
- [Vitest expect.toMatchSnapshot](https://github.com/vitest-dev/vitest/blob/main/docs/api/expect.md) - API reference
- Project codebase at `/Users/glenninizan/workspace/react-agentic/react-agentic/` - Existing test patterns in `tests/emitter/document.test.ts`

### Secondary (MEDIUM confidence)

- [Function Registry Pattern in React](https://techhub.iodigital.com/articles/function-registry-pattern-react) - TypeScript registry pattern
- [Type Registry Pattern - Frontend Masters](https://frontendmasters.com/courses/typescript-v4/type-registry-pattern/) - TypeScript type-safe registries
- [Building a Component Registry in React](https://medium.com/front-end-weekly/building-a-component-registry-in-react-4504ca271e56) - Component classification patterns

### Tertiary (LOW confidence)

- [Registry Pattern - GeeksforGeeks](https://www.geeksforgeeks.org/system-design/registry-pattern/) - General registry pattern overview
- [TypeScript Best Practices 2026](https://johal.in/typescript-best-practices-for-large-scale-web-applications-in-2026/) - Recent TypeScript patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vitest 4.0.17 already in package.json, well-documented API
- Architecture: HIGH - Existing test patterns in codebase provide clear model
- Pitfalls: MEDIUM - Based on general snapshot testing experience and runtime component understanding

**Research date:** 2026-01-31
**Valid until:** 2026-03-02 (30 days - stable technology)
