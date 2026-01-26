# Phase 21: Structured Props - Research

**Researched:** 2026-01-26
**Domain:** TypeScript prop validation, Markdown table/list generation, compile-time type safety
**Confidence:** HIGH

## Summary

This phase adds Table and List components that accept structured array props with compile-time TypeScript validation. The research focused on three core domains: (1) Markdown table/list syntax standards, (2) TypeScript tuple-based array length validation for compile-time safety, and (3) string escaping patterns for markdown special characters.

Key findings indicate that markdown tables use colon-based alignment syntax (`:---`, `:---:`, `---:`), while TypeScript tuples provide exact-length array validation at compile time. The existing codebase already handles lists through `<ul>`/`<ol>` elements, so the new List component provides a prop-based alternative. String escaping requires handling pipe characters (`|`) via backslash or HTML entities, and newlines should be stripped/converted since multiline table cells lack universal markdown support.

**Primary recommendation:** Use TypeScript conditional types with tuple validation for compile-time array length checking. Implement TableNode and ListNode as new IR nodes. Emit standard markdown table syntax with alignment control. Strip newlines and escape pipes in cell content.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | Compile-time validation | Built into react-agentic via ts-morph |
| ts-morph | Current | AST parsing and type analysis | Already used for transformer/parser |
| Markdown (CommonMark) | 0.31.2 | Table syntax standard | Universal markdown compatibility |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None needed | N/A | This phase extends existing infrastructure | Use existing IR/emitter patterns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Tuples for length validation | Runtime validation | Lose compile-time safety, defeats phase goal |
| Markdown tables | HTML tables | Lose markdown simplicity, harder for Claude to parse |
| Custom alignment syntax | Standard markdown colons | Break markdown compatibility |

**Installation:**
```bash
# No new dependencies - uses existing TypeScript/ts-morph infrastructure
```

## Architecture Patterns

### Recommended IR Node Structure
```typescript
// src/ir/nodes.ts additions
export interface TableNode {
  kind: 'table';
  headers?: string[];              // Optional headers
  rows: string[][];                // Required rows (can be empty array)
  align?: ('left' | 'center' | 'right')[];  // Optional alignment per column
  emptyCell?: string;              // Optional empty cell content (default: "")
}

export interface ListNode {
  kind: 'list';
  ordered: boolean;                // Already exists - reuse
  items: ListItemNode[];           // Already exists - reuse
  start?: number;                  // Optional start number for ordered lists
}
```

### Pattern 1: Compile-Time Array Length Validation
**What:** Use TypeScript conditional types to validate row/header length matching
**When to use:** Props interface for Table component
**Example:**
```typescript
// Source: https://type-level-typescript.com/arrays-and-tuples
// TypeScript conditional types with tuples for exact length matching

// Validate that all rows have same length as headers
type ValidateRowLength<H extends string[], R extends string[][]> =
  R extends [infer First, ...infer Rest]
    ? First extends string[]
      ? First['length'] extends H['length']
        ? Rest extends string[][]
          ? ValidateRowLength<H, Rest>
          : true
        : false
      : false
    : true;

interface TableProps<H extends string[] = string[], R extends string[][] = string[][]> {
  headers?: H;
  rows: R;
  align?: ('left' | 'center' | 'right')[];
  emptyCell?: string;
}
```

### Pattern 2: Markdown Table Emission
**What:** Emit tables with colon-based alignment syntax
**When to use:** Emitter implementation for TableNode
**Example:**
```typescript
// Source: https://www.markdownguide.org/extended-syntax/
// Standard markdown table with alignment

private emitTable(node: TableNode): string {
  const { headers, rows, align, emptyCell = '' } = node;

  // Empty table
  if (!headers && rows.length === 0) return '';

  const columnCount = headers?.length ?? rows[0]?.length ?? 0;
  const alignments = align ?? Array(columnCount).fill('left');

  const lines: string[] = [];

  // Header row
  if (headers) {
    lines.push('| ' + headers.map(h => escapeCell(h)).join(' | ') + ' |');
  }

  // Separator row with alignment
  const separators = alignments.map(a => {
    switch (a) {
      case 'left': return ':---';
      case 'center': return ':---:';
      case 'right': return '---:';
    }
  });
  lines.push('| ' + separators.join(' | ') + ' |');

  // Data rows
  for (const row of rows) {
    const cells = row.map(c => escapeCell(c));
    lines.push('| ' + cells.join(' | ') + ' |');
  }

  return lines.join('\n');
}

function escapeCell(content: string | number): string {
  const str = String(content);
  // Strip newlines (convert to space)
  const noNewlines = str.replace(/\n/g, ' ');
  // Escape pipe characters
  return noNewlines.replace(/\|/g, '\\|');
}
```

### Pattern 3: Prop-Based List Generation
**What:** Generate ListNode IR from items array prop
**When to use:** Transformer implementation for List component
**Example:**
```typescript
// Transform List component to ListNode IR
private transformList(node: JsxElement | JsxSelfClosingElement): ListNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Parse props
  const items = getArrayAttributeValue(opening, 'items') ?? [];
  const ordered = getAttributeValue(opening, 'ordered') === 'true';
  const start = getAttributeValue(opening, 'start');

  // Convert string array to ListItemNode[]
  const listItems: ListItemNode[] = items.map(item => ({
    kind: 'listItem',
    children: [{
      kind: 'paragraph',
      children: [{ kind: 'text', value: item }]
    }]
  }));

  return {
    kind: 'list',
    ordered,
    items: listItems,
    start: start ? parseInt(start, 10) : undefined
  };
}
```

### Anti-Patterns to Avoid
- **Runtime-only validation:** Don't validate array lengths at runtime - defeats compile-time safety goal
- **Multiline cell content:** Don't attempt `<br>` tags or preserve newlines - markdown table multiline support is inconsistent across parsers
- **Complex alignment validation:** Don't enforce alignment array length at compile time (too complex) - validate at parse time instead
- **Nested ListNode structures:** Don't create nested lists from flat items array - phase context specifies "no nesting support"

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown table escaping | Custom escaper | Backslash escape + newline stripping | Edge cases: empty cells, special chars, multiline content |
| Array length validation | Runtime checks | TypeScript tuples + conditional types | Compile-time safety is the phase goal |
| List IR generation | Custom list structure | Existing ListNode/ListItemNode | Already implemented and tested in Phase 20 |
| Column count inference | Manual tracking | `headers?.length ?? rows[0]?.length` | Handles headerless tables and empty arrays |

**Key insight:** TypeScript's type system provides powerful compile-time validation for structured data. Leverage tuples and conditional types rather than runtime checks, since the phase explicitly requires "TypeScript enforces prop types at compile time."

## Common Pitfalls

### Pitfall 1: Alignment Array Length Mismatch
**What goes wrong:** User provides 3 headers but 2 alignment values - which columns get aligned?
**Why it happens:** No runtime validation between headers/align array lengths
**How to avoid:** Document that alignment defaults to 'left' for missing columns. Validate at parse time, not just compile time.
**Warning signs:** Tests with mismatched alignment arrays pass silently

### Pitfall 2: Pipe Characters in Cell Content
**What goes wrong:** Cell content containing `|` breaks table parsing (creates extra columns)
**Why it happens:** Pipe is markdown table column delimiter
**How to avoid:** Always escape pipe characters in cell content via `\|` or HTML entity `&#124;`
**Warning signs:** Tables with unexpected column counts, garbled content

### Pitfall 3: Newlines in Cell Content
**What goes wrong:** Cell content with `\n` renders as broken table or creates multiple rows
**Why it happens:** Markdown table cells don't universally support multiline content
**How to avoid:** Strip newlines or convert to spaces. Document that cells must be single-line.
**Warning signs:** Table breaks after certain rows, invisible content

### Pitfall 4: Empty Array Rendering
**What goes wrong:** Unclear whether empty headers/rows should emit nothing or partial table
**Why it happens:** Spec says "empty arrays render nothing" but headerless tables are allowed
**How to avoid:** Define clear rules: `headers=[]` OK, `rows=[]` OK, but `!headers && rows=[]` emits empty string
**Warning signs:** Tests with empty arrays fail inconsistently

### Pitfall 5: Number Auto-Conversion Type Confusion
**What goes wrong:** Cell content type is `string | number`, but number formatting (decimals, locale) unclear
**Why it happens:** JavaScript number-to-string conversion has implicit behavior
**How to avoid:** Use `String(content)` explicitly, document that numbers use default toString() (no locale/precision control)
**Warning signs:** Decimals render unexpectedly, scientific notation appears

## Code Examples

Verified patterns from official sources:

### Markdown Table with Alignment
```markdown
| Left | Center | Right |
| :--- | :----: | ----: |
| A    | B      | C     |
| 1    | 2      | 3     |
```
**Source:** [Markdown Guide - Extended Syntax](https://www.markdownguide.org/extended-syntax/)

### TypeScript Tuple Length Validation
```typescript
// Compile-time enforcement of exact array lengths
type Tuple3 = [string, string, string];

// Valid
const headers: Tuple3 = ['A', 'B', 'C'];

// Error: Type '[string, string]' is not assignable to type 'Tuple3'
const invalid: Tuple3 = ['A', 'B'];
```
**Source:** [Better Stack - Tuple Types in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/typescript-tuple-types/)

### Conditional Type for Row Validation
```typescript
// Validate all rows have same length as headers
type SameLength<T extends unknown[], U extends unknown[]> =
  T['length'] extends U['length'] ? true : false;

type ValidRows<H extends string[]> = {
  [K in keyof H]: H[K] extends string ? string : never;
}[];

interface TableProps<H extends string[]> {
  headers: H;
  rows: ValidRows<H>[];  // All rows must match header length
}
```
**Source:** [Type-Level TypeScript - Arrays & Tuples](https://type-level-typescript.com/arrays-and-tuples)

### Escaping Pipes in Markdown Tables
```typescript
function escapeMarkdownPipes(content: string): string {
  // Backslash escape is most portable
  return content.replace(/\|/g, '\\|');

  // Alternative: HTML entity (less portable)
  // return content.replace(/\|/g, '&#124;');
}
```
**Source:** [Designcise - How to Escape Pipe Character](https://www.designcise.com/web/tutorial/how-to-escape-the-pipe-character-in-a-markdown-table)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual JSX children for tables | Structured props with arrays | Phase 21 (2026) | Enables compile-time validation, simpler syntax |
| `<ul><li>` JSX for lists | `<List items={[...]} />` prop-based | Phase 21 (2026) | Both approaches supported - prop-based for simple cases |
| Runtime prop validation | Compile-time tuple validation | TypeScript 4.0+ (2020) | Catch errors before execution |
| HTML `<br>` for table newlines | Strip newlines entirely | 2024+ (multiline inconsistent) | Universal markdown compatibility |

**Deprecated/outdated:**
- HTML entities for all special chars: Modern markdown parsers support backslash escaping (simpler, more readable)
- Complex multiline table hacks: No universal standard - strip newlines instead

## Open Questions

Things that couldn't be fully resolved:

1. **Exact TypeScript tuple validation complexity**
   - What we know: Conditional types can validate tuple lengths
   - What's unclear: How complex should the type be? Full recursive validation vs simple tuple matching?
   - Recommendation: Start simple (document length requirement), add compile-time validation if feasible

2. **Alignment array partial specification**
   - What we know: User may provide fewer alignment values than columns
   - What's unclear: Should this be compile-time error or runtime default?
   - Recommendation: Runtime default to 'left', document the behavior

3. **Headerless table separator syntax**
   - What we know: User context says "headers optional (headerless tables allowed)"
   - What's unclear: Does separator row still use alignment syntax without headers?
   - Recommendation: Yes - emit separator with alignment even without headers (standard markdown)

## Sources

### Primary (HIGH confidence)
- [Markdown Guide - Extended Syntax](https://www.markdownguide.org/extended-syntax/) - Table alignment syntax
- [TypeScript Handbook - Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) - Type validation patterns
- [Better Stack - Tuple Types in TypeScript](https://betterstack.com/community/guides/scaling-nodejs/typescript-tuple-types/) - Tuple length enforcement
- [Designcise - Escape Pipe Character](https://www.designcise.com/web/tutorial/how-to-escape-the-pipe-character-in-a-markdown-table) - Markdown escaping

### Secondary (MEDIUM confidence)
- [Type-Level TypeScript - Arrays & Tuples](https://type-level-typescript.com/arrays-and-tuples) - Advanced tuple patterns
- [2ality - Computing with Tuple Types](https://2ality.com/2025/01/typescript-tuples.html) - 2025 tuple techniques
- [W3Schools - Markdown Tables](https://www.w3schools.io/file/markdown-table/) - Basic table syntax

### Tertiary (LOW confidence)
- Various Stack Overflow discussions on TypeScript tuple validation (unverified, marked for validation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TypeScript/ts-morph already in use, markdown tables well-documented
- Architecture: HIGH - Existing IR patterns (ListNode) and emitter methods provide clear template
- Pitfalls: HIGH - Official docs explicitly cover pipe escaping, multiline limitations

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable domain, markdown/TypeScript standards slow-moving)
