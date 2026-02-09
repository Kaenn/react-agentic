# Phase 32: Composite Library - Research

**Researched:** 2026-01-31
**Domain:** TypeScript library architecture, component composition patterns, subpath exports
**Confidence:** HIGH

## Summary

Phase 32 moves current workflow components (If/Else, Loop/Break, SpawnAgent, Step, Table, List, ExecutionContext) from the primitives layer to a user-definable composite layer. This establishes a clear architecture: primitives are compiler-required building blocks, while composites are convenience wrappers that users can copy, modify, and learn from.

The standard approach in modern TypeScript libraries (2026) is to use package.json subpath exports to provide multiple entry points. Composites will be importable from `react-agentic/composites`, keeping the main package root clean for primitives. Each composite will be a well-documented reference implementation showing how to combine primitives for common patterns.

This pattern follows industry leaders like Radix UI and React Aria Components, which separate low-level primitives (behavior, accessibility) from higher-level composites (common patterns, convenience). The key insight: composites are "batteries included" versions that wrap primitives, adding value through enhanced variants (else handling, break logic, retry behavior) rather than new functionality.

**Primary recommendation:** Implement composites as TypeScript files with rich JSDoc examples, one file per composite, exported via barrel pattern from `src/composites/index.ts`. No separate examples directory needed — inline JSDoc serves as copy-paste-ready reference code.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 | Type-safe component definitions | Already in use, NodeNext module resolution supports subpath exports |
| package.json exports | Node 16+ | Subpath export configuration | Industry standard for multi-entry-point libraries (2026) |
| JSDoc | Built-in | Inline documentation with examples | No additional dependencies, IDE-integrated, supports @example with runnable code |
| ts-morph | 27.0.2 | Component transformation (already in use) | Existing transformer infrastructure handles composites same as user components |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | Composites use existing primitives | Phase 30 component composition support is sufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Subpath exports | Deep imports (`react-agentic/composites/IfElseBlock`) | Subpath exports preferred: simpler for users, better tree-shaking, explicit public API |
| Separate npm package | Monorepo with `@react-agentic/composites` | Single package preferred: simpler installation, no version mismatches, faster iteration |
| Runtime library | Copy-paste like shadcn/ui | Importable library preferred: automatic updates via npm, type checking, but users CAN copy source if they want deep customization |

**Installation:**
```bash
# No new dependencies — composites use existing stack
# Users import from subpath:
import { IfElseBlock, LoopWithBreak } from 'react-agentic/composites'
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── primitives/          # Compiler-required building blocks (existing)
│   ├── control.ts       # If, Else, Loop, Break (stay as primitives)
│   ├── structured.ts    # Table, List (stay as primitives)
│   ├── step.ts          # Step (stays as primitive)
│   └── ...
├── composites/          # User-definable convenience wrappers (NEW)
│   ├── IfElseBlock.tsx  # Wraps If + Else with unified API
│   ├── LoopWithBreak.tsx # Wraps Loop with break condition support
│   ├── SpawnAgentWithRetry.tsx # Wraps SpawnAgent with retry logic
│   ├── StepSection.tsx  # Enhanced Step with rich content support
│   ├── DataTable.tsx    # Enhanced Table with sorting/filtering patterns
│   ├── BulletList.tsx   # Enhanced List with common formatting
│   ├── FileContext.tsx  # Enhanced ExecutionContext with path validation
│   └── index.ts         # Barrel export (only file users import from)
├── components/          # Core workflow components (existing)
├── workflow/            # Agent, Command, sections (existing)
└── index.ts             # Main export (primitives only)
```

**Key structural decision:** Composites live in `src/composites/`, NOT mixed with primitives. This physical separation mirrors the conceptual separation between compiler-required primitives and user-definable composites.

### Pattern 1: Composite Wraps Primitives

**What:** Composites invoke primitives via direct JSX render, adding convenience without new compiler features

**When to use:** When a common pattern combines multiple primitives or adds standard enhancements

**Example:**
```tsx
// Source: Phase 32 context decisions + Radix UI composition pattern
// src/composites/IfElseBlock.tsx

import type { ReactNode } from 'react';
import { If, Else } from '../primitives/control.js';
import type { CommandContent, AgentContent } from '../ir/content-types.js';

/**
 * Enhanced if/else block with unified condition and branches
 *
 * Wraps If and Else primitives with a single component API for common
 * conditional rendering patterns.
 *
 * @example
 * ```tsx
 * import { IfElseBlock } from 'react-agentic/composites';
 *
 * <IfElseBlock
 *   test="[ -f config.json ]"
 *   then={<p>Config found</p>}
 *   otherwise={<p>Config missing</p>}
 * />
 * ```
 */
export interface IfElseBlockProps {
  /** Shell test expression */
  test: string;
  /** Content when condition is true */
  then: CommandContent | AgentContent;
  /** Content when condition is false (optional) */
  otherwise?: CommandContent | AgentContent;
}

export const IfElseBlock = ({ test, then, otherwise }: IfElseBlockProps): ReactNode => {
  return (
    <>
      <If test={test}>{then}</If>
      {otherwise && <Else>{otherwise}</Else>}
    </>
  );
};
```

**Why this works:** Phase 30 component composition support handles props substitution and children spreading. Transformer sees IfElseBlock as a local component, expands it, and processes the If/Else primitives inside.

### Pattern 2: Barrel Export for Clean Imports

**What:** Single `index.ts` re-exports all composites, users import from subpath

**When to use:** Always — enforces public API boundary, enables tree-shaking

**Example:**
```typescript
// src/composites/index.ts
export { IfElseBlock, type IfElseBlockProps } from './IfElseBlock.js';
export { LoopWithBreak, type LoopWithBreakProps } from './LoopWithBreak.js';
export { SpawnAgentWithRetry, type SpawnAgentWithRetryProps } from './SpawnAgentWithRetry.js';
// ... all composites
```

**User imports:**
```typescript
import { IfElseBlock, LoopWithBreak } from 'react-agentic/composites';
```

### Pattern 3: Props Interfaces Exported for User Extension

**What:** Export interface separately so users can extend for custom variants

**When to use:** Always — enables user customization without forking

**Example:**
```typescript
// User extends composite props for custom variant
import type { IfElseBlockProps } from 'react-agentic/composites';

interface MyConditionalProps extends IfElseBlockProps {
  logCondition?: boolean;
}

export const MyConditional = ({ logCondition, ...props }: MyConditionalProps) => {
  // Custom logic here
  return <IfElseBlock {...props} />;
};
```

### Pattern 4: Generic Parameters for Type Safety

**What:** Composites with children use generic parameters to preserve content type constraints

**When to use:** When composite accepts children that should match content type (Command vs Agent vs SubComponent)

**Example:**
```typescript
interface WrapperProps<C extends CommandContent> {
  header: string;
  children: C;
}

export const Wrapper = <C extends CommandContent>({ header, children }: WrapperProps<C>) => {
  return (
    <>
      <h2>{header}</h2>
      {children}
    </>
  );
};
```

### Anti-Patterns to Avoid

- **Mixing primitives and composites in same file:** Breaks conceptual separation, makes it unclear what's compiler-required vs user-definable
- **Composites that bypass primitives:** Composites should ALWAYS use primitives internally, never emit IR nodes directly
- **Deep import paths:** Use barrel export, not `import { X } from 'react-agentic/composites/IfElseBlock'`
- **Stub components:** Every composite must add real value (convenience, common pattern, enhanced variant) — no "just for completeness" composites

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Subpath exports configuration | Custom module resolution hacks | package.json exports field | Built into Node.js 16+, supported by all modern bundlers, TypeScript has native support via moduleResolution: "bundler" |
| Documentation examples | Separate markdown/code files | JSDoc @example tags | IDE-integrated, type-checked, copy-paste ready, no sync issues between docs and code |
| Component composition | Custom macro/template system | Phase 30 component support | Already implemented, tested (828 tests), handles props/children substitution |
| Type constraints for children | Runtime validation | TypeScript discriminated unions (Phase 28) | Compile-time safety, zero runtime cost, automatic IDE errors |

**Key insight:** React-agentic already has all infrastructure needed for composites. Phase 30 component composition + Phase 28 content types + existing primitives = complete foundation. No new compiler features required.

## Common Pitfalls

### Pitfall 1: Forgetting TypeScript moduleResolution for Subpath Exports

**What goes wrong:** Users get "Cannot find module 'react-agentic/composites'" errors even though package is installed

**Why it happens:** TypeScript defaults to "node" module resolution which doesn't support package.json exports field

**How to avoid:** Document in composites README that users need `moduleResolution: "bundler"` (or `"node16"`/`"nodenext"`)

**Warning signs:** Import errors for subpath when main package imports work fine

### Pitfall 2: Primitives Renamed or Removed

**What goes wrong:** Breaking change — users relying on If primitive suddenly see it's gone

**Why it happens:** Temptation to "clean up" by moving primitives entirely to composites

**How to avoid:** Primitives MUST stay with current names and exports. Composites are ADDITIONS, not replacements. Both coexist.

**Warning signs:** Phase context explicitly states "Primitives keep current names (If, Loop, SpawnAgent) — no renaming"

### Pitfall 3: Composites Without Clear Value Proposition

**What goes wrong:** Users confused about when to use primitive vs composite, or composites feel redundant

**Why it happens:** Creating composites "for completeness" rather than solving real pain points

**How to avoid:** Each composite must have clear enhancement: IfElseBlock (unified API), LoopWithBreak (break condition), SpawnAgentWithRetry (retry logic). Name describes the value-add.

**Warning signs:** Composite is just `return <Primitive {...props} />` with no additional logic or convenience

### Pitfall 4: Missing "types" in Subpath Export Conditions

**What goes wrong:** TypeScript can't find type definitions for `react-agentic/composites` imports

**Why it happens:** Forgetting "types" condition before "default" in exports field

**How to avoid:** Always structure as `{ "types": "./dist/composites/index.d.ts", "default": "./dist/composites/index.js" }`

**Warning signs:** Runtime works but TypeScript shows "any" types for composite imports

### Pitfall 5: Verbose JSDoc That Doesn't Compile

**What goes wrong:** Example code in JSDoc has syntax errors or doesn't match actual API

**Why it happens:** Examples written freehand without validation

**How to avoid:** Write examples as actual `.tsx` files first, verify they compile, then copy into @example tags. Treat JSDoc examples as unit tests.

**Warning signs:** Examples show props that don't exist, or import paths that aren't exported

## Code Examples

Verified patterns from phase context and industry standards:

### Basic Composite Structure
```typescript
// Source: Phase 32 context decisions
import type { ReactNode } from 'react';
import { If, Else } from '../primitives/control.js';
import type { CommandContent } from '../ir/content-types.js';

export interface IfElseBlockProps {
  test: string;
  then: CommandContent;
  otherwise?: CommandContent;
}

export const IfElseBlock = ({ test, then, otherwise }: IfElseBlockProps): ReactNode => {
  return (
    <>
      <If test={test}>{then}</If>
      {otherwise && <Else>{otherwise}</Else>}
    </>
  );
};
```

### Package.json Subpath Export Configuration
```json
// Source: https://hirok.io/posts/package-json-exports
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./composites": {
      "types": "./dist/composites/index.d.ts",
      "default": "./dist/composites/index.js"
    }
  }
}
```

### Rich JSDoc Example
```typescript
// Source: TypeScript JSDoc Reference (2026-01-27)
/**
 * Enhanced table component with sorting and filtering patterns
 *
 * Wraps Table primitive with common data manipulation patterns.
 * Source code serves as reference for building custom table variants.
 *
 * @param props - Component props
 * @param props.headers - Column headers
 * @param props.rows - Data rows
 * @param props.sortable - Enable sorting by column (default: false)
 *
 * @example Basic usage
 * ```tsx
 * import { DataTable } from 'react-agentic/composites';
 *
 * <DataTable
 *   headers={["Name", "Age", "City"]}
 *   rows={[
 *     ["Alice", 30, "NYC"],
 *     ["Bob", 25, "LA"],
 *   ]}
 * />
 * ```
 *
 * @example With sorting
 * ```tsx
 * <DataTable
 *   headers={["Name", "Score"]}
 *   rows={[["Alice", 95], ["Bob", 87]]}
 *   sortable
 * />
 * ```
 *
 * @see {@link Table} for the underlying primitive
 */
```

### Composite Using Generic for Type Safety
```typescript
// Source: Phase 28 content types + React Aria composition patterns
import type { ReactNode } from 'react';
import type { CommandContent } from '../ir/content-types.js';

/**
 * Section wrapper with header and body content
 *
 * Generic preserves content type constraints for children.
 */
export interface SectionProps<C extends CommandContent> {
  title: string;
  children: C;
}

export const Section = <C extends CommandContent>({
  title,
  children
}: SectionProps<C>): ReactNode => {
  return (
    <>
      <h2>{title}</h2>
      {children}
    </>
  );
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single package root export | Subpath exports for multiple entry points | Node 16+ (2021), mainstream 2024+ | Enables clean separation: primitives at root, composites at `/composites` |
| Separate docs site | Inline JSDoc @example tags | TSDoc standardization 2020+, IDE adoption 2023+ | Examples are type-checked, version-locked, copy-paste ready |
| Monolithic component libraries | Primitives + composites layers | Radix UI 2021, React Aria 2022, widespread 2024+ | Users choose raw control (primitives) vs convenience (composites) |
| Deep imports (`lib/components/X`) | Barrel exports with subpath (`lib/composites`) | Package.json exports 2020+, TypeScript support 2022+ | Explicit public API, better tree-shaking, simpler imports |

**Deprecated/outdated:**
- **"main" field only in package.json:** Use "exports" field for multi-entry-point packages (since Node 16)
- **Separate examples directory:** Use JSDoc @example for in-code, type-checked examples (current standard 2026)
- **Component libraries as "install and use":** Copy-paste pattern (shadcn/ui) shows users want control, not black boxes (trend 2024-2026)

## Open Questions

1. **Should composites be .ts or .tsx files?**
   - What we know: Both work; .tsx allows JSX syntax in file; .ts requires React.createElement
   - What's unclear: Which feels more natural for reference implementations users will read
   - Recommendation: Use .tsx for consistency with user components in `src/app/`, clearer JSX syntax for learning

2. **How many composite variants to create initially?**
   - What we know: Phase context lists If/Else, Loop/Break, SpawnAgent, Step, Table, List, ExecutionContext as candidates
   - What's unclear: Optimal balance between "batteries included" and overwhelming choice
   - Recommendation: Start with 5-7 core composites (IfElseBlock, LoopWithBreak, SpawnAgentWithRetry required; others based on common pain points), add more based on user feedback

3. **Should composites re-export their underlying primitives?**
   - What we know: Users might want to use both composite and primitive in same file
   - What's unclear: Whether `import { IfElseBlock, If } from 'react-agentic/composites'` should work
   - Recommendation: NO — composites import from primitives, users import primitives from main package. Keeps separation clean, no duplicate exports

## Sources

### Primary (HIGH confidence)
- [Organize your library with subpath exports](https://dev.to/receter/organize-your-library-with-subpath-exports-4jb9) - Package.json exports configuration
- [Guide to the package.json exports field | Hiroki Osame](https://hirok.io/posts/package-json-exports) - Subpath export patterns and TypeScript types
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html) - Official JSDoc documentation (updated 2026-01-27)
- [Radix Primitives Composition](https://www.radix-ui.com/primitives/docs/guides/composition) - Primitive vs composite architecture pattern
- [React Aria Components RFC](https://github.com/adobe/react-spectrum/blob/main/rfcs/2023-react-aria-components.md) - Component composition patterns
- Phase 30 verification report (local) - Component composition support with props/children
- Phase 28 verification report (local) - Content type constraints (CommandContent, AgentContent, SubComponentContent)

### Secondary (MEDIUM confidence)
- [shadcn/ui](https://www.shadcn.io/) - Copy-paste component library pattern
- [Components vs. Primitives | Ariane Maze](https://ariane.maze.co/latest/components/primitives/components-vs-primitives-3k72xXs9) - Definition and separation rationale
- [Builder.io: 15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026) - Industry trends (primitives vs composites, copy-paste patterns)

### Tertiary (LOW confidence)
- WebSearch results on TypeScript composite patterns - General trends, no specific technical validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing TypeScript 5.9.3 + package.json exports (Node 16+ standard)
- Architecture: HIGH - Verified by Radix UI, React Aria, shadcn/ui patterns; Phase 30 component composition already implemented
- Pitfalls: MEDIUM - Based on common TypeScript subpath export issues (forums, GitHub issues) and phase context constraints

**Research date:** 2026-01-31
**Valid until:** 60 days (2026-03-31) — TypeScript/Node.js ecosystem stable, patterns mature
