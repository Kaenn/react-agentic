# Phase 2: Core Transpilation - Research

**Researched:** 2026-01-20
**Domain:** ts-morph JSX/TSX parsing and IR transformation
**Confidence:** HIGH

## Summary

This phase requires parsing TSX files using ts-morph to extract JSX AST nodes, then transforming those nodes into the IR types already defined in Phase 1. The existing IR (nodes.ts) and emitter (emitter.ts) provide the target output format.

ts-morph v27.0.2 provides comprehensive JSX support through dedicated classes (`JsxElement`, `JsxSelfClosingElement`, `JsxFragment`, `JsxText`, `JsxExpression`) with built-in methods for traversing children (`getJsxChildren()`), accessing tag names (`getTagNameNode()`), and retrieving attributes (`getAttributes()`, `getAttribute()`). The library handles TypeScript/JSX parsing automatically when files have `.tsx` extension.

**Primary recommendation:** Use ts-morph's `forEachDescendant` with `SyntaxKind` filtering to traverse JSX elements, extract element names and attributes, recursively process children, and build IR nodes. Handle whitespace by filtering `JsxText` nodes using `containsOnlyTriviaWhiteSpaces()` and normalizing remaining text content.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | ^27.0.2 | TypeScript/JSX AST parsing and traversal | Official TypeScript compiler wrapper, comprehensive JSX support, type-safe navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | ^5.9.3 | Already in devDependencies | JSX/TSX language support, type checking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph | Raw TypeScript Compiler API | ts-morph provides simpler API, handles boilerplate; raw API is more verbose but slightly faster |
| ts-morph | @babel/parser | Babel is JavaScript-focused; ts-morph integrates TypeScript types natively |

**Installation:**
```bash
npm install ts-morph
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ir/
│   ├── nodes.ts         # IR type definitions (exists)
│   └── index.ts         # Public exports (exists)
├── parser/
│   ├── parser.ts        # ts-morph project setup, file loading
│   ├── transformer.ts   # JSX AST -> IR node transformation
│   ├── elements.ts      # Element-specific transform handlers
│   └── index.ts         # Public exports
├── emitter/
│   ├── emitter.ts       # IR -> Markdown (exists)
│   ├── utils.ts         # Helpers (exists)
│   └── index.ts         # Public exports (exists)
└── index.ts             # Main entry point
```

### Pattern 1: ts-morph Project Setup
**What:** Initialize ts-morph Project for parsing TSX files
**When to use:** Entry point for all parsing operations
**Example:**
```typescript
// Source: ts-morph.com documentation
import { Project, SyntaxKind } from 'ts-morph';

export function createProject(): Project {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve, // Keep JSX for analysis
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  });
}

export function parseFile(project: Project, filePath: string) {
  const sourceFile = project.addSourceFileAtPath(filePath);
  return sourceFile;
}
```

### Pattern 2: JSX Element Traversal with forEachDescendant
**What:** Traverse JSX AST using ts-morph's descendant iteration
**When to use:** Finding all JSX elements in a file
**Example:**
```typescript
// Source: ts-morph.com/navigation/
import { Node, SyntaxKind } from 'ts-morph';

function findJsxElements(sourceFile: SourceFile) {
  const elements: (JsxElement | JsxSelfClosingElement)[] = [];

  sourceFile.forEachDescendant((node, traversal) => {
    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      elements.push(node);
      traversal.skip(); // Don't traverse children separately
    }
  });

  return elements;
}
```

### Pattern 3: JSX to IR Transformer (Visitor Pattern)
**What:** Transform JSX nodes to IR nodes using type guards and recursion
**When to use:** Converting each JSX element to its IR equivalent
**Example:**
```typescript
// Recommended pattern based on ts-morph API
import { Node, SyntaxKind, JsxElement, JsxSelfClosingElement, JsxText } from 'ts-morph';
import type { BlockNode, InlineNode } from '../ir/index.js';

function transformJsxChild(node: Node): BlockNode | InlineNode | null {
  if (Node.isJsxElement(node)) {
    return transformJsxElement(node);
  }
  if (Node.isJsxSelfClosingElement(node)) {
    return transformSelfClosingElement(node);
  }
  if (Node.isJsxText(node)) {
    return transformJsxText(node);
  }
  if (Node.isJsxExpression(node)) {
    // Handle {expressions} - may need special handling
    return transformJsxExpression(node);
  }
  return null; // Unknown node type
}

function transformJsxElement(node: JsxElement): BlockNode | InlineNode {
  const tagName = node.getOpeningElement().getTagNameNode().getText();
  const children = node.getJsxChildren();

  switch (tagName) {
    case 'h1': return transformHeading(1, children);
    case 'h2': return transformHeading(2, children);
    // ... etc
    case 'p': return transformParagraph(children);
    case 'b':
    case 'strong': return transformBold(children);
    // ... etc
    default:
      throw new Error(`Unsupported element: <${tagName}>`);
  }
}
```

### Pattern 4: Attribute Extraction
**What:** Extract attributes from JSX elements (e.g., href from <a>)
**When to use:** Elements with required attributes
**Example:**
```typescript
// Source: ts-morph JsxAttributedNode API
function getHref(element: JsxOpeningElement | JsxSelfClosingElement): string {
  const hrefAttr = element.getAttribute('href');
  if (!hrefAttr || !Node.isJsxAttribute(hrefAttr)) {
    throw new Error('<a> element requires href attribute');
  }

  const initializer = hrefAttr.getInitializer();
  if (!initializer) {
    throw new Error('<a> href attribute requires a value');
  }

  // Handle string literal: href="url"
  if (Node.isStringLiteral(initializer)) {
    return initializer.getLiteralValue();
  }

  // Handle expression: href={url}
  if (Node.isJsxExpression(initializer)) {
    const expr = initializer.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
    throw new Error('href must be a string literal');
  }

  throw new Error('href must be a string');
}
```

### Anti-Patterns to Avoid
- **Mutating AST during traversal:** ts-morph warns that transformed descendant nodes are "forgotten" and using them causes errors. Always collect nodes first, then transform.
- **Using getChildren() for JSX children:** Use `getJsxChildren()` instead - `getChildren()` includes tokens like `<`, `>`, etc.
- **Ignoring whitespace-only JsxText:** Always check `containsOnlyTriviaWhiteSpaces()` to avoid emitting formatting whitespace.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TSX parsing | Custom parser | ts-morph | Handles JSX/TSX syntax, TypeScript types, source maps |
| AST traversal | Manual recursion | `forEachDescendant()` | Provides traversal control (skip, up, stop), handles edge cases |
| Node type checking | `node.kind === ...` | `Node.isJsxElement()` | Type guards narrow types correctly, more readable |
| Attribute access | `getChildren().find(...)` | `getAttribute('name')` | Built-in, handles all attribute syntax variations |
| Whitespace detection | Manual string checking | `containsOnlyTriviaWhiteSpaces()` | Matches TypeScript compiler's own whitespace rules |

**Key insight:** ts-morph provides a high-level API specifically designed for JSX analysis. Using lower-level TypeScript Compiler API methods loses type safety and requires more boilerplate.

## Common Pitfalls

### Pitfall 1: Confusing JsxElement vs JsxOpeningElement
**What goes wrong:** Attempting to get tag name or attributes from `JsxElement` instead of its `openingElement`
**Why it happens:** `JsxElement` is the container; opening element has the name and attributes
**How to avoid:** Always access through `element.getOpeningElement().getTagNameNode()`
**Warning signs:** TypeScript errors about missing methods on JsxElement

### Pitfall 2: Whitespace-only JsxText Nodes
**What goes wrong:** Emitting whitespace between JSX elements as text content
**Why it happens:** JSX preserves formatting whitespace as JsxText nodes with `containsOnlyTriviaWhiteSpaces: true`
**How to avoid:** Filter JsxText nodes: `if (!jsxText.containsOnlyTriviaWhiteSpaces()) { ... }`
**Warning signs:** Extra blank lines or spaces in output

### Pitfall 3: JsxExpression Content Access
**What goes wrong:** Calling `getText()` on `JsxExpression` includes the braces `{}`
**Why it happens:** `getText()` returns source text including delimiters
**How to avoid:** Use `jsxExpression.getExpression()?.getText()` to get inner expression
**Warning signs:** Output contains `{` and `}` characters

### Pitfall 4: Self-Closing vs Regular Elements
**What goes wrong:** Code assumes all elements have `getClosingElement()` or `getJsxChildren()`
**Why it happens:** `JsxSelfClosingElement` has no children or closing element
**How to avoid:** Check with `Node.isJsxSelfClosingElement(node)` first, or use `JsxOpeningLikeElement` type
**Warning signs:** Runtime errors on `<br />`, `<hr />`, or component-style elements

### Pitfall 5: Nested Inline Elements Order
**What goes wrong:** Bold inside italic or vice versa produces incorrect markdown (`*_text_*` invalid)
**Why it happens:** Markdown doesn't allow mixing `*` and `_` for nesting
**How to avoid:** Per CONTEXT.md decision: use combined markers `***bold italic***`
**Warning signs:** Markdown renderers show raw asterisks

### Pitfall 6: Missing Required Attributes
**What goes wrong:** Silent failure when `<a>` lacks `href`
**Why it happens:** `getAttribute()` returns undefined, code continues without value
**How to avoid:** Per CONTEXT.md decision: fail with error on missing required attributes. Use `getAttributeOrThrow()` or explicit checks
**Warning signs:** Links with empty or undefined URLs

### Pitfall 7: Inline Whitespace Normalization
**What goes wrong:** Multiple spaces in source become multiple spaces in output
**Why it happens:** `getText()` preserves source whitespace exactly
**How to avoid:** Per CONTEXT.md decision: normalize inline whitespace (collapse multiple spaces, trim edges)
**Warning signs:** Irregular spacing in output markdown

## Code Examples

Verified patterns from official sources:

### Complete Transformer Structure
```typescript
// Recommended architecture
import { Project, SourceFile, Node, SyntaxKind, JsxElement, JsxSelfClosingElement, JsxText } from 'ts-morph';
import type { DocumentNode, BlockNode, InlineNode } from '../ir/index.js';

export class Transformer {
  transform(sourceFile: SourceFile): DocumentNode {
    const blocks: BlockNode[] = [];

    // Find root-level JSX elements (typically function return)
    sourceFile.forEachDescendant((node) => {
      if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
        const block = this.transformToBlock(node);
        if (block) blocks.push(block);
      }
    });

    return {
      kind: 'document',
      children: blocks,
    };
  }

  private transformToBlock(node: Node): BlockNode | null {
    // Implementation per element type
  }
}
```

### Element Name Extraction
```typescript
// Source: ts-morph JsxElement API
function getElementName(node: JsxElement | JsxSelfClosingElement): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  return node.getTagNameNode().getText();
}
```

### Children Processing with Whitespace Filtering
```typescript
// Pattern for processing JSX children
function processChildren(children: ReturnType<JsxElement['getJsxChildren']>): InlineNode[] {
  const result: InlineNode[] = [];

  for (const child of children) {
    if (Node.isJsxText(child)) {
      // Skip whitespace-only nodes (formatting between elements)
      if (child.containsOnlyTriviaWhiteSpaces()) continue;

      // Normalize whitespace per CONTEXT.md decision
      const text = normalizeWhitespace(child.getText());
      if (text) {
        result.push({ kind: 'text', value: text });
      }
    } else if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const inline = transformToInline(child);
      if (inline) result.push(inline);
    } else if (Node.isJsxExpression(child)) {
      // Handle {expression} - extract text value if possible
      const expr = child.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        result.push({ kind: 'text', value: expr.getLiteralValue() });
      }
    }
  }

  return result;
}

function normalizeWhitespace(text: string): string {
  // Collapse multiple spaces/newlines to single space, trim edges
  return text.replace(/\s+/g, ' ').trim();
}
```

### Attribute Value Extraction
```typescript
// Handle different attribute value types
function getAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init) return undefined;

  // String literal: attr="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: attr={value} or attr={"value"}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
  }

  return undefined;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-simple-ast | ts-morph | 2019 | Package renamed, same API |
| Manual TS Compiler API | ts-morph wrapper | 2018+ | Simpler API, better DX |
| Babel for JSX parsing | ts-morph for TSX | N/A | ts-morph preferred for TypeScript codebases |

**Deprecated/outdated:**
- `ts-simple-ast`: Renamed to ts-morph, use ts-morph
- Direct `ts.createProgram()` for simple parsing: ts-morph's `Project` is preferred

## Open Questions

Things that couldn't be fully resolved:

1. **JsxFragment handling**
   - What we know: Fragments (`<>...</>`) are supported via `JsxFragment` with `getJsxChildren()`
   - What's unclear: Whether fragments should produce multiple block nodes or be treated as container
   - Recommendation: Treat fragment children as siblings, not wrapped

2. **Expression interpolation depth**
   - What we know: `{variable}` in JSX creates `JsxExpression` nodes
   - What's unclear: How deep to evaluate expressions (string literals only? const references?)
   - Recommendation: For Phase 2, support only string literals. Complex expressions can be deferred.

3. **Error recovery strategy**
   - What we know: CONTEXT.md says "fail with error" for missing required attributes
   - What's unclear: Should all errors throw immediately or collect for batch reporting?
   - Recommendation: Throw immediately with helpful error messages including source location

## Sources

### Primary (HIGH confidence)
- [ts-morph.com](https://ts-morph.com/) - Official documentation, navigation and traversal patterns
- [ts-morph.com/navigation/](https://ts-morph.com/navigation/) - forEachDescendant, traversal control
- [ts-morph.com/manipulation/transforms](https://ts-morph.com/manipulation/transforms) - Transform API reference
- [jsDocs.io/package/ts-morph](https://www.jsdocs.io/package/ts-morph) - Complete API reference for JSX classes
- [GitHub dsherret/ts-morph](https://github.com/dsherret/ts-morph) - JsxElement.ts source code

### Secondary (MEDIUM confidence)
- [facebook/jsx AST.md](https://github.com/facebook/jsx/blob/main/AST.md) - Official JSX AST specification
- [GitHub Gist: Using TS Morph to analyze JSX](https://gist.github.com/souporserious/6b2af0e75ec39e568f5ff914b48bcde5) - Real-world JSX analysis example
- [kimmo.blog AST refactoring](https://kimmo.blog/posts/8-ast-based-refactoring-with-ts-morph/) - Practical ts-morph patterns

### Tertiary (LOW confidence)
- WebSearch results on whitespace handling - Verified against CONTEXT.md decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph is the established choice, verified via official docs
- Architecture: HIGH - Patterns derived from official documentation and examples
- JSX API: HIGH - Verified via ts-morph API reference and source code
- Pitfalls: MEDIUM - Combination of official docs and community patterns
- Whitespace handling: MEDIUM - Based on TypeScript compiler behavior and CONTEXT.md decisions

**Research date:** 2026-01-20
**Valid until:** 2026-02-20 (ts-morph is stable, 30-day validity)
