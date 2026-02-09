# Phase 33: Documentation - Research

**Researched:** 2026-01-31
**Domain:** Technical documentation for TSX component library architecture
**Confidence:** HIGH

## Summary

This phase documents the primitive/composite architecture in react-agentic. The codebase has a clear two-tier system:

1. **Primitives** (in `src/components/` and `src/primitives/`): Compiler-owned components that the build system transforms into markdown. Users import and use these but should not modify them. Examples: `If`, `Else`, `Loop`, `Table`, `List`, `SpawnAgent`.

2. **Composites** (in `src/composites/`): User-definable convenience wrappers that combine primitives into higher-level patterns. Users can import these as-is or copy/modify them. Examples: `IfElseBlock`, `LoopWithBreak`, `DataTable`, `BulletList`.

The existing documentation in `docs/` follows a consistent pattern: concept explanation first, props tables, practical examples with TSX and emitted markdown shown side-by-side, and cross-links to related docs. The tone is practical and terse.

**Primary recommendation:** Create two new docs (`primitives.md` and `composites.md`) following the established documentation patterns, with progressive examples that show TSX alongside compiled markdown output.

## Standard Stack

### Core (Existing Patterns)

| Element | Location | Purpose | Why Standard |
|---------|----------|---------|--------------|
| Markdown docs | `docs/*.md` | User documentation | Consistent with existing docs |
| Props tables | Throughout docs | API reference | Established pattern in command.md, control-flow.md |
| TSX + output examples | Throughout docs | Show what code produces | Key pattern in structured-components.md |
| Cross-linking | Footer of each doc | Navigation | "See Also" sections in philosophy.md, control-flow.md |

### Documentation Structure

| Doc | Purpose | Model After |
|-----|---------|-------------|
| `primitives.md` | Explain compiler-owned components | `structured-components.md` (concise, props + examples) |
| `composites.md` | Explain user-definable patterns | `control-flow.md` (patterns + complete examples) |

### No External Libraries

Documentation is pure markdown. No documentation generators, no JSDoc extraction, no additional tooling needed.

## Architecture Patterns

### Recommended Doc Structure

Based on existing `docs/` patterns:

```
docs/
├── README.md          # Update index to include new docs
├── primitives.md      # NEW: Compiler-owned components reference
├── composites.md      # NEW: User-definable patterns guide
└── [existing docs]    # Cross-link from relevant sections
```

### Pattern 1: Concept-First Explanation

**What:** Start each section/doc with a brief concept explanation before code
**When to use:** All sections
**Example from existing docs (philosophy.md):**

```markdown
## The Core Insight

Claude Code commands are **markdown files with instructions**. They tell Claude
what to do, but Claude executes them--not your code.
```

### Pattern 2: Props Table Format

**What:** Standardized props table with Type, Required, Description columns
**When to use:** Every component reference section
**Example from existing docs (command.md):**

```markdown
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Command identifier (used as `/name`) |
| `description` | string | Yes | Shown in command list |
```

### Pattern 3: TSX + Emitted Output Side-by-Side

**What:** Show TSX code, then "Emits:" followed by the markdown output
**When to use:** Every example
**Example from existing docs (structured-components.md):**

```markdown
### Basic Usage

\`\`\`tsx
<Table
  headers={["Name", "Type"]}
  rows={[["id", "string"], ["name", "string"]]}
/>
\`\`\`

Emits:

\`\`\`markdown
| Name | Type |
| --- | --- |
| id | string |
| name | string |
\`\`\`
```

### Pattern 4: See Also Cross-Links

**What:** Footer section linking related documentation
**When to use:** End of every doc
**Example from existing docs (control-flow.md):**

```markdown
## See Also

- [Runtime System](./runtime.md) - useRuntimeVar and runtimeFn
- [Command](./command.md) - Building slash commands
```

### Anti-Patterns to Avoid

- **Quick reference tables/cheat sheets:** User decision explicitly excludes these
- **One comprehensive file:** User decided on multiple focused docs
- **Compiler internals exposure:** Documentation is user-focused only

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Documentation format | Custom template | Existing doc patterns | Consistency with codebase |
| Example style | New format | TSX + "Emits:" pattern | Proven in existing docs |
| Index update | New structure | Extend existing README.md table | Maintains established navigation |

**Key insight:** The existing documentation style is well-established and consistent. New docs should look like they belong in the same family.

## Common Pitfalls

### Pitfall 1: Exposing Compiler Internals

**What goes wrong:** Documenting how primitives are transformed internally
**Why it happens:** Researcher/writer has access to compiler code
**How to avoid:** Focus only on: "What does the user write?" and "What markdown is produced?"
**Warning signs:** Mentioning IR nodes, transformers, emitters

### Pitfall 2: Over-Explaining Primitives

**What goes wrong:** Primitives section becomes too long, duplicates existing docs
**Why it happens:** Many primitives already have dedicated docs (Table in structured-components.md)
**How to avoid:** `primitives.md` should briefly catalog and link to existing docs, not repeat them
**Warning signs:** Section longer than 200 lines for primitives

### Pitfall 3: Examples Without Output

**What goes wrong:** Showing TSX without the emitted markdown
**Why it happens:** Writer assumes user understands transformation
**How to avoid:** Every TSX example MUST show "Emits:" followed by markdown output
**Warning signs:** Code blocks without corresponding output blocks

### Pitfall 4: Abstract Pattern Names

**What goes wrong:** Using jargon like "decorator pattern" or "factory"
**Why it happens:** Developer perspective vs user perspective
**How to avoid:** Name patterns by what they do: "Conditional wrapper", "Repeated section"
**Warning signs:** Design pattern terminology

## Code Examples

### Example 1: Conditional Wrapper (from IfElseBlock.tsx)

**TSX:**
```tsx
import { IfElseBlock } from 'react-agentic/composites';
import { useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ error?: string }>('CTX');

<IfElseBlock
  condition={ctx.error}
  then={<p>Error: {ctx.error}</p>}
  otherwise={<p>Success!</p>}
/>
```

**Emits (conceptually):**
```markdown
**If `$CTX.error` is truthy:**

Error: $CTX.error

**Otherwise:**

Success!
```

### Example 2: Repeated Section (from DataTable.tsx)

**TSX:**
```tsx
import { DataTable } from 'react-agentic/composites';

<DataTable
  caption="Test Results"
  headers={["Test", "Status"]}
  rows={[
    ["Unit", "Pass"],
    ["E2E", "Pass"],
  ]}
  emptyMessage="No tests found"
/>
```

**Emits:**
```markdown
**Test Results**

| Test | Status |
| --- | --- |
| Unit | Pass |
| E2E | Pass |
```

### Example 3: Custom Enhancement (from BulletList.tsx)

**TSX:**
```tsx
import { BulletList } from 'react-agentic/composites';

<BulletList
  title="Prerequisites"
  items={["Node.js 18+", "npm or yarn", "Git"]}
/>
```

**Emits:**
```markdown
**Prerequisites**

- Node.js 18+
- npm or yarn
- Git
```

## State of the Art

| Aspect | Current State | Notes |
|--------|---------------|-------|
| Primitives | Stable, fully documented across existing docs | Well-covered in command.md, control-flow.md, structured-components.md |
| Composites | Code exists, exported, tested | 7 composites in src/composites/, tests in tests/composites/ |
| Architecture docs | Missing | This phase fills the gap |

**Existing coverage:**

- `Table`, `List` primitives: Documented in `structured-components.md`
- `If`, `Else`, `Loop`, `Break`, `Return`, `AskUser`: Documented in `control-flow.md`
- `Command`, `Agent`, `SpawnAgent`: Documented in `command.md`, `agent.md`, `communication.md`

## Three Required Example Patterns

Per CONTEXT.md decisions:

### 1. Conditional Wrapper Pattern

**Example:** `IfElseBlock` composite
**What it demonstrates:** Wrapping children only if condition is met
**Source file:** `src/composites/IfElseBlock.tsx`

### 2. Repeated Section Pattern

**Example:** `DataTable` or custom "for each item" composite
**What it demonstrates:** Rendering structure for each item in a collection
**Source file:** `src/composites/DataTable.tsx` (or create custom example)

### 3. Custom Validation Pattern

**Example:** Create a `ValidatedInput` or similar composite
**What it demonstrates:** Validating input and formatting/rendering based on validation
**Note:** No existing composite shows this pattern well; may need a new example

**Alternative for third example:** `FileContext` composite shows "enhancement wrapper" pattern (adding title, transforming input before passing to primitive)

## Open Questions

1. **Third example pattern**
   - What we know: CONTEXT.md specifies "custom validation" pattern
   - What's unclear: No existing composite demonstrates pure validation
   - Recommendation: Use `FileContext` as "enhancement/transform wrapper" or create a simple validation example inline in docs

2. **Exact primitive list**
   - What we know: Primitives are spread across `src/components/` and `src/primitives/`
   - What's unclear: Which components to categorize as "primitives" vs "internal"
   - Recommendation: List only user-facing primitives exported from main index.ts

## Sources

### Primary (HIGH confidence)

- **Codebase inspection:** `src/composites/`, `src/components/`, `docs/`
- **Existing documentation:** `docs/structured-components.md`, `docs/control-flow.md`, `docs/philosophy.md`
- **Test files:** `tests/composites/*.test.ts` (verified exports and props)
- **Index exports:** `src/index.ts`, `src/composites/index.ts` (verified public API)

### Secondary (MEDIUM confidence)

- [Theneo API Documentation Best Practices](https://www.theneo.io/blog/api-documentation-best-practices-guide-2025) - General documentation principles
- [Write the Docs Style Guides](https://www.writethedocs.org/guide/writing/style-guides/) - Style guide fundamentals

## Metadata

**Confidence breakdown:**
- Documentation patterns: HIGH - Direct observation of existing docs
- Architecture understanding: HIGH - Full codebase access and inspection
- Example selection: HIGH - CONTEXT.md provides explicit decisions
- Third example specifics: MEDIUM - May need creative interpretation

**Research date:** 2026-01-31
**Valid until:** 60+ days (documentation patterns are stable)
