# Phase 3: Full Element Coverage - Research

**Researched:** 2026-01-21
**Domain:** Command frontmatter, XML blocks, Markdown passthrough for Claude Code
**Confidence:** HIGH

## Summary

Phase 3 completes the transpiler's element coverage by adding three specialized components for Claude Code commands: Command (YAML frontmatter generation), XML blocks (div-to-XML transformation), and Markdown passthrough.

The existing codebase already has the IR node types (`XmlBlockNode`, `RawMarkdownNode`, `FrontmatterNode`) defined and partial emitter support in place. The transformer needs extension to recognize these new elements and extract their props/children appropriately.

**Primary recommendation:** Extend the existing `Transformer` class with handlers for `Command`, `div` (with name attribute), and `Markdown` elements, using the established patterns of element name switching and attribute extraction via ts-morph.

## Standard Stack

### Core (Already in Place)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | ^27.0.2 | TSX/JSX parsing | Already in use for Phase 2 parsing |
| gray-matter | ^4.0.3 | YAML frontmatter stringification | Already in use in emitter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| js-yaml | (via gray-matter) | YAML dump with format options | Access via gray-matter's engine for array formatting control |

### No New Dependencies Needed

The existing stack is sufficient. `gray-matter.stringify()` handles YAML frontmatter, and ts-morph's `getAttributeValue()` can extract all prop types (string literals, JSX expressions, arrays).

## Architecture Patterns

### Existing Project Structure (Extend, Don't Reorganize)
```
src/
├── ir/
│   └── nodes.ts        # Already has XmlBlockNode, RawMarkdownNode, FrontmatterNode
├── parser/
│   ├── parser.ts       # getAttributeValue() exists - needs array support
│   └── transformer.ts  # Add Command, div, Markdown handlers
└── emitter/
    └── emitter.ts      # Already has emitXmlBlock, emitFrontmatter (needs array format fix)
```

### Pattern 1: Element Handler Extension
**What:** Add new cases to `transformElement()` method following existing switch pattern
**When to use:** For Command, div, Markdown element handling
**Example:**
```typescript
// Source: Existing transformer.ts pattern
private transformElement(name: string, node: JsxElement | JsxSelfClosingElement): BlockNode | null {
  // ... existing handlers ...

  // Command wrapper - extracts props to frontmatter, children to document body
  if (name === 'Command') {
    return this.transformCommand(node);
  }

  // div with name attribute - becomes XML block
  if (name === 'div') {
    return this.transformDiv(node);
  }

  // Markdown passthrough
  if (name === 'Markdown') {
    return this.transformMarkdown(node);
  }
}
```

### Pattern 2: Attribute Array Extraction
**What:** Extract array attributes from JSX for `allowedTools` prop
**When to use:** Command component allowedTools prop
**Example:**
```typescript
// ts-morph array expression extraction
private getArrayAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string[] | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

  return expr.getElements()
    .filter(Node.isStringLiteral)
    .map(el => el.getLiteralValue());
}
```

### Pattern 3: Document-Level Frontmatter Attachment
**What:** Command props become DocumentNode.frontmatter, children become DocumentNode.children
**When to use:** When Command is the root element
**Example:**
```typescript
// Command transforms to document with frontmatter
transform(node: JsxElement): DocumentNode {
  if (getElementName(node) === 'Command') {
    const frontmatter = this.extractCommandFrontmatter(node);
    const children = this.transformChildrenToBlocks(node);
    return { kind: 'document', frontmatter, children };
  }
  // ... existing logic
}
```

### Anti-Patterns to Avoid
- **Extending IR node types:** XmlBlockNode, RawMarkdownNode, FrontmatterNode already exist - use them as-is
- **Adding attributes to XmlBlockNode:** Per CONTEXT.md, additional div attributes pass through, but the current IR doesn't support attributes. Either extend XmlBlockNode or serialize attributes inline in the emitter
- **Custom YAML serialization:** Use gray-matter with js-yaml options, don't hand-roll YAML string building

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter | String concatenation | gray-matter.stringify() | Handles escaping, quoting, multiline correctly |
| Array to YAML | Manual list building | gray-matter with js-yaml flowLevel option | Controls block vs flow style |
| XML tag validation | Simple regex | Proper XML name regex per spec | Must handle unicode, reserved prefixes |
| Prop extraction | Manual AST traversal | ts-morph getAttributeValue(), isArrayLiteralExpression | Type-safe, handles edge cases |

**Key insight:** The complexity in this phase is in the transformer logic, not in parsing or serialization - the tools are already in place.

## Common Pitfalls

### Pitfall 1: Command Not at Root Level
**What goes wrong:** `<Command>` nested inside other elements produces invalid output
**Why it happens:** Frontmatter must be at document start, not embedded in content
**How to avoid:** Validate that Command is either the root element or the only child of a fragment
**Warning signs:** Frontmatter appearing mid-document, malformed output

### Pitfall 2: YAML Array Flow Style
**What goes wrong:** `allowedTools: [Read, Write]` instead of block style with `-` prefixes
**Why it happens:** js-yaml default flowLevel setting
**How to avoid:** Pass `{ flowLevel: -1 }` to force block style for all arrays
**Warning signs:** Claude Code may still accept it, but inconsistent with examples

### Pitfall 3: Invalid XML Tag Names from div name Prop
**What goes wrong:** `<div name="my section">` produces `<my section>` - invalid XML
**Why it happens:** Spaces, special characters, numbers at start not validated
**How to avoid:** Validate name against XML tag name rules before transformation
**Warning signs:** Output that can't be parsed as XML

### Pitfall 4: Markdown Passthrough Whitespace
**What goes wrong:** Extra blank lines or lost indentation in `<Markdown>` content
**Why it happens:** JSX text normalization stripping/adding whitespace
**How to avoid:** Use raw text extraction (skip normalizeWhitespace), trim only boundaries
**Warning signs:** Code blocks losing indentation, extra blank lines

### Pitfall 5: Missing Required Command Props
**What goes wrong:** Silent generation of invalid commands without name/description
**Why it happens:** No validation during transformation
**How to avoid:** Check for required props, throw with location info on missing
**Warning signs:** Commands that don't work in Claude Code

## Code Examples

### Claude Code Command Frontmatter Format
```yaml
# Source: https://code.claude.com/docs/en/slash-commands
---
name: my-command
description: What this command does and when to use it
allowed-tools:
  - Read
  - Grep
  - Glob
model: claude-3-5-sonnet-20241022
---

Command content here...
```

### gray-matter Stringify with Block Style Arrays
```typescript
// Source: gray-matter npm + js-yaml options
import matter from 'gray-matter';

const data = {
  name: 'my-command',
  description: 'Example command',
  'allowed-tools': ['Read', 'Grep', 'Write']
};

// gray-matter uses js-yaml internally
// Default produces flow style: allowed-tools: [Read, Grep, Write]
// To get block style, need to configure the YAML engine

const result = matter.stringify('content', data);
```

### XML Tag Name Validation
```typescript
// Source: XML 1.0 Specification, simplified for common cases
// Full Unicode support would require more complex pattern
const XML_NAME_REGEX = /^(?!xml)[a-zA-Z_][a-zA-Z0-9_.\-]*$/i;

function isValidXmlName(name: string): boolean {
  if (!name) return false;
  // Check basic pattern
  if (!XML_NAME_REGEX.test(name)) return false;
  // Explicitly reject "xml" prefix (case-insensitive)
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}
```

### ts-morph Array Literal Extraction
```typescript
// Source: ts-morph API
import { Node, JsxExpression, ArrayLiteralExpression } from 'ts-morph';

function extractArrayAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): string[] | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

  const elements: string[] = [];
  for (const el of expr.getElements()) {
    if (Node.isStringLiteral(el)) {
      elements.push(el.getLiteralValue());
    }
  }
  return elements;
}
```

### XmlBlockNode with Attributes (Extended Pattern)
```typescript
// Current IR (nodes.ts) - needs extension for attributes
export interface XmlBlockNode {
  kind: 'xmlBlock';
  name: string;
  attributes?: Record<string, string>;  // ADD THIS
  children: BlockNode[];
}

// Emitter update
private emitXmlBlock(node: XmlBlockNode): string {
  const attrs = node.attributes
    ? ' ' + Object.entries(node.attributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
    : '';
  const innerContent = node.children.map(c => this.emitBlock(c)).join('\n\n');
  return `<${node.name}${attrs}>\n${innerContent}\n</${node.name}>`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual YAML strings | gray-matter stringify | Already in codebase | Proper escaping |
| Individual element checks | Discriminated union switch | Already in codebase | Exhaustive type checking |

**Deprecated/outdated:**
- N/A - the codebase is fresh and uses current patterns

## Open Questions

Things that couldn't be fully resolved:

1. **XmlBlockNode Attributes Support**
   - What we know: CONTEXT.md says attributes should pass through
   - What's unclear: Current IR doesn't have attributes field
   - Recommendation: Extend XmlBlockNode with optional `attributes?: Record<string, string>`

2. **Error Collection Strategy**
   - What we know: CONTEXT.md marks as Claude's discretion
   - What's unclear: Whether to fail-fast or collect all errors
   - Recommendation: Fail-fast (simpler, matches existing error pattern in codebase)

3. **gray-matter Array Format Control**
   - What we know: js-yaml supports flowLevel option
   - What's unclear: Whether gray-matter exposes js-yaml options cleanly
   - Recommendation: Test during implementation - may need direct js-yaml for stringify

## Sources

### Primary (HIGH confidence)
- [Claude Code Slash Commands Docs](https://code.claude.com/docs/en/slash-commands) - Frontmatter format, field names
- Existing codebase files: `src/ir/nodes.ts`, `src/parser/transformer.ts`, `src/emitter/emitter.ts`
- [gray-matter GitHub](https://github.com/jonschlinkert/gray-matter) - stringify API
- [js-yaml GitHub](https://github.com/nodeca/js-yaml) - dump options including flowLevel

### Secondary (MEDIUM confidence)
- XML 1.0 specification for tag name rules
- ts-morph documentation for array literal handling

### Tertiary (LOW confidence)
- N/A - all claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing dependencies verified, no new packages needed
- Architecture: HIGH - patterns established in Phase 2, extending them
- Pitfalls: HIGH - derived from codebase analysis and spec requirements

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (stable domain, no fast-moving dependencies)
