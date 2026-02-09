# Phase 30: Component Composition - Research

**Researched:** 2026-01-31
**Domain:** TypeScript compiler transforms, React component patterns, JSX AST manipulation
**Confidence:** HIGH

## Summary

Phase 30 implements full support for children and props in custom components, enabling React-style component composition patterns. The implementation builds on existing runtime component infrastructure (Phase 29) that already handles local and external component inlining with prop substitution.

**Current State:** The runtime transformer (`runtime-component.ts`) already implements:
- Local component extraction and inlining
- External component imports (named and default)
- Prop substitution (destructured and `props.xxx` pattern)
- Children prop support via `{children}` substitution
- Fragment handling that returns arrays of BlockNodes
- Circular reference detection

**What Remains:** This phase ensures feature parity between static (v1) and runtime (v3) transformer paths, adds type safety via discriminated unions, and formalizes fragment composition semantics.

**Primary recommendation:** Extend existing runtime component infrastructure to static transformer, introduce `CommandContent` and `SubComponentContent` discriminated unions for type safety, and formalize context-aware spacing algorithm for fragment composition.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | Current | TypeScript AST manipulation | Industry standard wrapper over TypeScript Compiler API, provides high-level JSX node traversal |
| TypeScript Compiler API | 5.1+ | JSX type checking and parsing | Official TypeScript JSX support with `JSX.ElementChildrenAttribute` for children validation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React type definitions | @types/react 18+ | Type references for React patterns | Import `FC`, `PropsWithChildren`, `ReactNode` types for documentation and examples |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph | Direct TS Compiler API | More control but significantly more boilerplate - ts-morph abstracts 80% of common patterns |
| Runtime-only components | Static transformer composition | Runtime path is more powerful (async, variables), static path is simpler for basic composition |

**Installation:**
```bash
# Already installed in project
npm install ts-morph
npm install --save-dev @types/react
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── parser/
│   ├── transformers/
│   │   ├── runtime-component.ts    # Runtime path (Phase 29 - COMPLETE)
│   │   ├── static-component.ts     # Static path (Phase 30 - NEW)
│   │   └── shared-component.ts     # Shared utilities (extraction, validation)
│   └── utils/
│       └── component-resolution.ts # Component import resolution
├── ir/
│   ├── nodes.ts                    # IR node definitions
│   └── content-types.ts            # CommandContent, SubComponentContent unions (Phase 28)
└── emitter/
    └── emitter.ts                  # Already handles fragment arrays via join('\n\n')
```

### Pattern 1: Children Prop Typing with Discriminated Unions

**What:** Type children based on context - Command/Agent allow full features, SubComponents restrict to document primitives

**When to use:** User-defined custom components that need compile-time safety

**Example:**
```typescript
// Source: Phase 28 content-types.ts implementation
import type { CommandContent, SubComponentContent } from 'react-agentic';

// Full feature set - can use SpawnAgent, If/Else, runtime features
interface WrapperProps {
  children?: CommandContent | CommandContent[];
}

// Restricted subset - only document structure
interface CardProps {
  title: string;
  children?: SubComponentContent | SubComponentContent[];
}

const Wrapper = ({ children }: WrapperProps) => (
  <XmlBlock name="wrapper">
    {children}
  </XmlBlock>
);

const Card = ({ title, children }: CardProps) => (
  <>
    <h2>{title}</h2>
    <div name="card-body">
      {children}
    </div>
  </>
);
```

**Rationale:** Discriminated unions provide compile-time errors when users nest command-level features (SpawnAgent, If/Else) inside presentation components. This prevents runtime errors and enforces architectural boundaries.

### Pattern 2: Props Interface vs Destructuring

**What:** Both TypeScript interface and inline destructuring are supported

**When to use:** User preference - interfaces for complex props, destructuring for simple components

**Example:**
```typescript
// Source: Existing test patterns in local-component.test.ts

// Interface style (better for autocomplete)
interface SectionProps {
  title: string;
  delay?: number;
  children?: CommandContent | CommandContent[];
}

const Section: FC<SectionProps> = (props) => (
  <>
    <h2>{props.title}</h2>
    {props.children}
  </>
);

// Destructuring style (more concise)
const Section = ({ title, delay = 5, children }: SectionProps) => (
  <>
    <h2>{title}</h2>
    {children}
  </>
);
```

**Rationale:** The transformer already handles both `props.xxx` and destructured `{xxx}` via `extractPropNames()` and substitution logic. No additional work needed.

### Pattern 3: Fragment Composition with Context-Aware Spacing

**What:** Fragments (`<></>`) return multiple elements without wrapper, using context-aware separator

**When to use:** Composing multiple elements without adding structural noise

**Example:**
```typescript
// Source: React Fragment documentation + existing emitter.ts implementation

const Header = () => (
  <>
    <h1>Main Title</h1>
    <h2>Subtitle</h2>
  </>
);

// Emitter joins with '\n\n' for block elements (emitter.ts:1011)
// Output:
// # Main Title
//
// ## Subtitle
```

**Separator Algorithm:**
- **Block children** (headings, paragraphs, lists): Double newline `\n\n` (standard markdown block separation)
- **Inline children** (bold, code, text): Single space (preserve inline flow)
- **Group node** (div without name): Single newline `\n` (tight spacing, emitter.ts:1011)

**Implementation:** Already exists in `emitter.ts`:
- Line 80: `parts.join('\n\n')` for document blocks
- Line 1011: `node.children.map(...).join('\n')` for Group (tight spacing)
- Fragment transformation returns `BlockNode[]` which emitter handles via standard join logic

### Pattern 4: Generic Type Parameters

**What:** Components can accept generic type parameters for typed props

**When to use:** Reusable components that work with different data shapes

**Example:**
```typescript
// Source: TypeScript handbook + React patterns
interface ListProps<T> {
  items: T[];
  render: (item: T) => SubComponentContent;
}

function DataList<T>(props: ListProps<T>) {
  return (
    <ul>
      {props.items.map(item => (
        <li>{props.render(item)}</li>
      ))}
    </ul>
  );
}

// Usage
<DataList items={users} render={user => <p>{user.name}</p>} />
```

**Rationale:** TypeScript's generic inference works naturally with JSX. The transformer doesn't need special handling - it processes the instantiated component with resolved types.

### Anti-Patterns to Avoid

- **Keyed Fragments in TSX:** The `<Fragment key={...}>` syntax requires importing React.Fragment. Since this is a compile-time transform (not real React), keyed fragments add complexity without benefit. Recommendation: Skip keyed fragment support unless user demand emerges.

- **Deep Component Nesting:** Circular reference detection (runtime-component.ts:389) prevents infinite recursion, but deeply nested components (>5 levels) increase build time. Recommendation: Document best practice of 2-3 levels max.

- **Async Components in Static Path:** Only runtime path supports async components (via render props pattern). Static path components must be synchronous. This is a documented limitation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSX AST traversal | Custom recursive visitors | ts-morph `forEachDescendant`, `getChildren` | ts-morph handles edge cases (parenthesized expressions, type annotations) that manual traversal misses |
| Prop extraction | String parsing of JSX attributes | ts-morph `JsxAttribute.getInitializer()` | Handles complex expressions (object literals, spread, template literals) correctly |
| Fragment handling | Manual array concatenation | Return `BlockNode[]` from transform | Emitter already knows how to join arrays with context-aware spacing (emitter.ts:80, 1011) |
| Children type validation | Runtime checks | TypeScript discriminated unions (`CommandContent` vs `SubComponentContent`) | Compile-time errors prevent invalid nesting, no runtime overhead |

**Key insight:** The TypeScript Compiler API (via ts-morph) has 10+ years of edge case handling for JSX. Custom parsing will miss cases like spread attributes, JSX expression escaping, and whitespace normalization.

## Common Pitfalls

### Pitfall 1: Whitespace Handling in Children

**What goes wrong:** JSX whitespace is context-sensitive. `<a> <b>text</b> </a>` should preserve spaces, but indentation whitespace should be stripped.

**Why it happens:** ts-morph's `JsxText.getText()` returns raw text including formatting whitespace.

**How to avoid:** Use existing `extractMarkdownText()` utility (runtime-utils.ts) which implements correct JSX whitespace rules:
- Strip leading/trailing whitespace on same line as tags
- Preserve significant whitespace between elements
- Collapse multiple spaces to single space

**Warning signs:** Generated markdown has excessive blank lines or missing spaces between inline elements.

### Pitfall 2: Props Substitution with Template Literals

**What goes wrong:** Template literals like `` `${props.title}` `` need special handling - can't just string-replace the text.

**Why it happens:** Template literals are AST nodes (`TemplateExpression`), not plain strings.

**How to avoid:** Use existing `extractJsonValue()` utility (runtime-utils.ts:extractJsonValue) which handles:
- String literals → string value
- Numeric literals → number value
- Template expressions → string with substituted values
- Object literals → parsed object

**Warning signs:** Props render as `[object Object]` or template syntax appears in output.

### Pitfall 3: Static vs Runtime Transformer Parity

**What goes wrong:** Features work in runtime path but fail in static path (or vice versa).

**Why it happens:** Two separate code paths with slightly different implementations.

**How to avoid:**
1. Extract shared component utilities to `shared-component.ts`
2. Both transformers call same extraction functions
3. Test coverage for both paths (see existing test structure)

**Warning signs:** Tests pass for runtime commands but fail when using static export pattern.

### Pitfall 4: Fragment Array Flattening

**What goes wrong:** Nested fragments create `BlockNode[][]` instead of flat `BlockNode[]`.

**Why it happens:** Each fragment returns an array, and children of fragments also return arrays.

**How to avoid:** Use array spreading when processing fragment children:
```typescript
// Source: runtime-component.ts:482-487
if (Node.isJsxFragment(jsx)) {
  const blocks: BlockNode[] = [];
  for (const child of jsx.getJsxChildren()) {
    const block = transformComponentChild(child, ...);
    if (Array.isArray(block)) {
      blocks.push(...block); // SPREAD to flatten
    } else if (block) {
      blocks.push(block);
    }
  }
  return blocks;
}
```

**Warning signs:** TypeScript errors about `BlockNode[][]` type mismatches.

## Code Examples

Verified patterns from existing implementation:

### Extract Props from Component Declaration

```typescript
// Source: runtime-component.ts:186-200
function extractPropNames(fn: ArrowFunction | FunctionExpression): string[] {
  const params = fn.getParameters();
  if (params.length === 0) return [];

  const firstParam = params[0];
  const bindingName = firstParam.getNameNode();

  // Destructured: ({ title, count, children }) => ...
  if (Node.isObjectBindingPattern(bindingName)) {
    return bindingName.getElements().map(el => el.getName());
  }

  // Simple: (props) => ...
  return [firstParam.getName()];
}
```

### Transform Fragment Children

```typescript
// Source: runtime-component.ts:476-490
function transformComponentJsx(
  jsx: JsxElement | JsxSelfClosingElement | JsxFragment,
  props: Map<string, unknown>,
  childrenBlocks: BlockNode[] | null,
  propNames: string[],
  ctx: RuntimeTransformContext
): BlockNode | BlockNode[] | null {
  // For fragments, transform all children and return as array
  if (Node.isJsxFragment(jsx)) {
    const blocks: BlockNode[] = [];
    for (const child of jsx.getJsxChildren()) {
      const block = transformComponentChild(child, props, childrenBlocks, propNames, ctx);
      if (block) {
        if (Array.isArray(block)) {
          blocks.push(...block); // Flatten nested arrays
        } else {
          blocks.push(block);
        }
      }
    }
    return blocks.length > 0 ? blocks : null;
  }

  // For single elements, transform directly
  return dispatchTransform(jsx, ctx);
}
```

### Extract Children from Component Usage

```typescript
// Source: runtime-component.ts:431-458
function extractChildrenFromUsage(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext,
  transformChildren: (parent: JsxElement, ctx: RuntimeTransformContext) => BlockNode[]
): BlockNode[] | null {
  // Self-closing elements have no children
  if (Node.isJsxSelfClosingElement(node)) return null;

  // Get JSX children and transform them
  const jsxChildren = node.getJsxChildren();
  if (jsxChildren.length === 0) return null;

  // Check if there's any meaningful content
  const hasContent = jsxChildren.some(child => {
    if (Node.isJsxText(child)) {
      return child.getText().trim().length > 0;
    }
    return true; // Any non-text child counts as content
  });

  if (!hasContent) return null;

  // Transform children using existing transformers
  return transformChildren(node, ctx);
}
```

### Substitute Children in Component Body

```typescript
// Source: runtime-component.ts:496-520
function transformComponentChild(
  child: Node,
  props: Map<string, unknown>,
  childrenBlocks: BlockNode[] | null,
  propNames: string[],
  ctx: RuntimeTransformContext
): BlockNode | BlockNode[] | null {
  // Handle JSX expressions that might be {children}
  if (Node.isJsxExpression(child)) {
    const expr = child.getExpression();
    if (expr) {
      const text = expr.getText();
      // Check for {children} or {props.children}
      if (text === 'children' || text === 'props.children') {
        return childrenBlocks; // Returns array or null
      }
    }
  }

  // For other nodes, use standard transformation
  return dispatchTransform(child, ctx);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String template components | Full JSX component inlining | Phase 29 (v3.0) | Users can write real React-style components with type safety |
| Manual prop interpolation | TypeScript-aware prop extraction | Phase 29 (v3.0) | Handles destructuring, spread, defaults automatically |
| Single content type | Discriminated unions (CommandContent vs SubComponentContent) | Phase 28 (v3.0) | Compile-time errors for invalid component nesting |
| `<React.Fragment>` import | `<></>` shorthand only | Phase 30 (v3.0) | Simpler syntax, no React runtime dependency |

**Deprecated/outdated:**
- **FC with implicit children (React <18):** React 18+ removed children from FC type. Must explicitly type children prop.
- **JSX pragma comments:** Modern TypeScript uses tsconfig `jsx` setting, not per-file `/** @jsx */` comments.

## Open Questions

1. **Keyed Fragments**
   - What we know: React supports `<Fragment key={id}>` for iteration
   - What's unclear: Is there a use case for keyed fragments in markdown generation?
   - Recommendation: Skip for v3.0, add only if users request (low priority)

2. **Async Components in Static Path**
   - What we know: Runtime path supports async via render props, static path is synchronous
   - What's unclear: Should static path support async components with top-level await?
   - Recommendation: No - adds complexity, runtime path already solves this

3. **Fragment vs Group Spacing**
   - What we know: Group uses single newline (tight), Fragment uses double newline (standard)
   - What's unclear: Should fragments have different spacing based on parent context?
   - Recommendation: Current algorithm (always double newline) is correct - fragments should behave like unwrapped blocks

## Sources

### Primary (HIGH confidence)

- **ts-morph documentation** - https://github.com/dsherret/ts-morph - JSX node traversal, prop extraction patterns (790+ code examples)
- **TypeScript JSX Handbook** - https://www.typescriptlang.org/docs/handbook/jsx.html - Updated January 27, 2026 - Official JSX transform documentation
- **React Fragment Documentation** - https://react.dev/reference/react/Fragment - Official React docs on fragment composition and shorthand syntax
- **Existing codebase** - `/src/parser/transformers/runtime-component.ts` (Phase 29) - Complete working implementation of component composition

### Secondary (MEDIUM confidence)

- [Type-Safe React: Discriminated Unions](https://dev.to/gboladetrue/type-safe-react-harnessing-the-power-of-discriminated-unions-158m) - Pattern examples for children typing
- [Advanced TypeScript for React - Discriminated Unions](https://www.developerway.com/posts/advanced-typescript-for-react-developers-discriminated-unions) - Component API patterns
- [Expressive Component APIs with Discriminated Unions](https://blog.andrewbran.ch/expressive-react-component-apis-with-discriminated-unions/) - Real-world examples from Andrew Branch (TS team)
- [How to Type React Children in TypeScript](https://blog.logrocket.com/react-children-prop-typescript/) - Children prop typing patterns
- [How to Type React Props with TypeScript](https://oneuptime.com/blog/post/2026-01-15-type-react-props-state-hooks-typescript/view) - January 2026 article on modern React TypeScript patterns

### Tertiary (LOW confidence)

None - all critical information verified through official docs or existing codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph and TypeScript Compiler API are verified through existing usage
- Architecture: HIGH - Patterns extracted from working Phase 29 implementation
- Pitfalls: HIGH - Observed in actual codebase (whitespace handling, template literals, array flattening)

**Research date:** 2026-01-31
**Valid until:** ~60 days (stable domain - TypeScript/React patterns don't change rapidly)
