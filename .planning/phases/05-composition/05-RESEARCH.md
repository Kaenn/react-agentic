# Phase 5: Composition - Research

**Researched:** 2026-01-21
**Domain:** Static props spreading and component composition in TSX-to-Markdown transpilation
**Confidence:** HIGH

## Summary

Phase 5 implements two composition features: props spreading (`{...baseProps}`) and component composition (importing shared TSX fragments). Both features operate at compile-time with static resolution - we parse and extract values from the source AST, not runtime evaluation.

Props spreading requires resolving variable references to their object literal initializers using ts-morph's symbol resolution APIs. Component composition requires following import declarations to their source files, extracting the JSX returned by component functions, and inlining that JSX into the calling context.

**Primary recommendation:** Implement in two separate plans: (1) props spreading with object literal extraction, (2) component composition with import resolution and function body extraction. Both features extend the existing transformer layer without changing the IR or emitter.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | ^27.0.2 | Symbol resolution, import following | Already in use; provides `getSymbol()`, `getModuleSpecifierSourceFile()`, `getExportedDeclarations()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | All functionality covered by ts-morph |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph symbol resolution | Manual AST walking | ts-morph handles edge cases; manual approach error-prone |
| Static-only spreads | Runtime evaluation | Out of scope - we're a static transpiler |

**Installation:**
```bash
# No new dependencies needed - ts-morph already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── parser/
│   ├── parser.ts         # Add: resolveSpreadProps(), resolveComponentReference()
│   └── transformer.ts    # Modify: handle JsxSpreadAttribute, custom components
├── ir/                   # No changes needed
└── emitter/              # No changes needed
```

### Pattern 1: Spread Props Resolution

**What:** When encountering `<Command {...baseProps} name="override">`, resolve `baseProps` to its object literal value and merge with explicit props.

**When to use:** JsxSpreadAttribute found in element attributes

**Example:**
```typescript
// Source: ts-morph documentation
import { Node, SyntaxKind, Identifier, JsxSpreadAttribute } from 'ts-morph';

function resolveSpreadAttribute(
  spreadAttr: JsxSpreadAttribute,
  sourceFile: SourceFile
): Record<string, unknown> | null {
  const expression = spreadAttr.getExpression();

  // Only handle simple identifiers: {...props}
  if (!Node.isIdentifier(expression)) {
    throw new Error('Spread expressions must be simple identifiers');
  }

  // Get the symbol for the identifier
  const symbol = expression.getSymbol();
  if (!symbol) {
    throw new Error(`Cannot resolve '${expression.getText()}'`);
  }

  // Get the declaration (variable declaration)
  const declarations = symbol.getDeclarations();
  const varDecl = declarations.find(d => Node.isVariableDeclaration(d));
  if (!varDecl || !Node.isVariableDeclaration(varDecl)) {
    throw new Error('Spread source must be a variable declaration');
  }

  // Get the initializer (object literal)
  const initializer = varDecl.getInitializer();
  if (!initializer || !Node.isObjectLiteralExpression(initializer)) {
    throw new Error('Spread source must be an object literal');
  }

  // Extract properties
  return extractObjectLiteralProps(initializer);
}
```

### Pattern 2: Object Literal Property Extraction

**What:** Extract key-value pairs from ObjectLiteralExpression for spread resolution

**When to use:** After finding spread source variable's initializer

**Example:**
```typescript
// Source: ts-morph Object Literal Expressions documentation
import { ObjectLiteralExpression, Node, SyntaxKind } from 'ts-morph';

function extractObjectLiteralProps(
  objLiteral: ObjectLiteralExpression
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of objLiteral.getProperties()) {
    // PropertyAssignment: key: value
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const initializer = prop.getInitializer();

      if (Node.isStringLiteral(initializer)) {
        result[name] = initializer.getLiteralValue();
      } else if (Node.isArrayLiteralExpression(initializer)) {
        result[name] = extractArrayLiteral(initializer);
      } else if (Node.isNumericLiteral(initializer)) {
        result[name] = initializer.getLiteralValue();
      } else if (initializer?.getKind() === SyntaxKind.TrueKeyword) {
        result[name] = true;
      } else if (initializer?.getKind() === SyntaxKind.FalseKeyword) {
        result[name] = false;
      }
      // Nested objects, functions, etc. - throw unsupported
    }
    // ShorthandPropertyAssignment: { foo } - needs symbol resolution
    // SpreadAssignment: { ...other } - recursive resolution
  }

  return result;
}
```

### Pattern 3: Component Import Resolution

**What:** Follow import declaration to source file and extract component's returned JSX

**When to use:** Transformer encounters unknown JSX element (not HTML, not Command)

**Example:**
```typescript
// Source: ts-morph Imports documentation
import { SourceFile, Node, ImportDeclaration } from 'ts-morph';

function resolveComponentImport(
  componentName: string,
  sourceFile: SourceFile
): JsxElement | JsxFragment | null {
  // Find import declaration for this component
  const importDecl = sourceFile.getImportDeclaration((decl) => {
    const namedImports = decl.getNamedImports();
    return namedImports.some(ni => ni.getName() === componentName);
  });

  if (!importDecl) {
    throw new Error(`Component '${componentName}' not imported`);
  }

  // Resolve to source file
  const componentSourceFile = importDecl.getModuleSpecifierSourceFile();
  if (!componentSourceFile) {
    throw new Error(`Cannot resolve import for '${componentName}'`);
  }

  // Find the function declaration or variable with arrow function
  const exportedDecls = componentSourceFile.getExportedDeclarations();
  const componentDecls = exportedDecls.get(componentName);

  if (!componentDecls || componentDecls.length === 0) {
    throw new Error(`Component '${componentName}' not exported`);
  }

  // Extract JSX from function body
  return extractJsxFromComponent(componentDecls[0]);
}

function extractJsxFromComponent(decl: Node): JsxElement | JsxFragment | null {
  let functionBody: Node | undefined;

  if (Node.isFunctionDeclaration(decl)) {
    functionBody = decl.getBody();
  } else if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      functionBody = init.getBody();
    }
  }

  if (!functionBody) return null;

  // Find return statement with JSX
  let result: JsxElement | JsxFragment | null = null;
  functionBody.forEachDescendant((node, traversal) => {
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (Node.isJsxElement(expr) || Node.isJsxFragment(expr)) {
        result = expr;
        traversal.stop();
      } else if (Node.isParenthesizedExpression(expr)) {
        const inner = expr.getExpression();
        if (Node.isJsxElement(inner) || Node.isJsxFragment(inner)) {
          result = inner;
          traversal.stop();
        }
      }
    }
  });

  return result;
}
```

### Anti-Patterns to Avoid

- **Runtime evaluation attempts:** Do not try to evaluate expressions like `{...getProps()}` or `{...obj.nested.props}` - these require runtime execution
- **Circular import handling:** Do not attempt to resolve circular component references - detect and throw
- **Deep prop merging:** Do not implement complex merge semantics - later props win, simple object spread
- **Component props forwarding:** Do not support dynamic props passed to composed components - only static composition

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Symbol resolution | Manual AST walking | `identifier.getSymbol().getDeclarations()` | Handles scope, imports, re-exports |
| Import resolution | Path manipulation | `importDecl.getModuleSpecifierSourceFile()` | Handles tsconfig paths, node_modules |
| Export resolution | Manual export scanning | `sourceFile.getExportedDeclarations()` | Handles re-exports, namespace merging |
| Object literal parsing | Regex or string manipulation | `objLiteral.getProperties()` | Handles all property types correctly |

**Key insight:** ts-morph already has robust APIs for all symbol resolution tasks. Attempting manual resolution will miss edge cases around scope, imports, and re-exports.

## Common Pitfalls

### Pitfall 1: Spread Props Without Static Source

**What goes wrong:** User writes `<Command {...getConfig()}>` expecting function to be called at transpile time
**Why it happens:** Looks like normal JSX spread syntax
**How to avoid:** Only support simple identifier references (`{...varName}`), throw clear error for expressions
**Warning signs:** Expression.getKind() returns something other than SyntaxKind.Identifier

### Pitfall 2: Component Props Not Supported

**What goes wrong:** User writes `<SharedSection title="Custom">` expecting props to be passed to composed component
**Why it happens:** Natural React pattern expectation
**How to avoid:** Phase 5 only supports parameterless fragments; throw if props found on custom component
**Warning signs:** Custom component element has attributes

### Pitfall 3: Circular Component References

**What goes wrong:** ComponentA imports ComponentB which imports ComponentA - infinite loop
**Why it happens:** Valid pattern in React but problematic for static resolution
**How to avoid:** Track visited files during resolution, throw on cycle detection
**Warning signs:** Same sourceFile.getFilePath() appearing twice in resolution stack

### Pitfall 4: Import Resolution Failure

**What goes wrong:** `getModuleSpecifierSourceFile()` returns undefined for external packages
**Why it happens:** ts-morph can only resolve to files in the project
**How to avoid:** Only support relative imports (`./`, `../`), throw for package imports
**Warning signs:** Module specifier doesn't start with `.`

### Pitfall 5: Spread Order Matters

**What goes wrong:** `<Command {...base} name="a" {...override}>` - unclear which wins
**Why it happens:** JSX spread order is significant (later wins)
**How to avoid:** Process attributes in order, later props overwrite earlier
**Warning signs:** Multiple spread attributes on same element

## Code Examples

Verified patterns from ts-morph documentation:

### Getting JsxSpreadAttribute from Element

```typescript
// Source: ts-morph JSX handling
import { Node, JsxOpeningElement, JsxSpreadAttribute } from 'ts-morph';

function getSpreadAttributes(opening: JsxOpeningElement): JsxSpreadAttribute[] {
  const spreads: JsxSpreadAttribute[] = [];

  for (const attr of opening.getAttributes()) {
    if (Node.isJsxSpreadAttribute(attr)) {
      spreads.push(attr);
    }
  }

  return spreads;
}
```

### Merging Spread Props with Explicit Props

```typescript
// Application-specific pattern
function mergeCommandProps(
  opening: JsxOpeningElement,
  sourceFile: SourceFile
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const attr of opening.getAttributes()) {
    if (Node.isJsxSpreadAttribute(attr)) {
      // Resolve spread and merge
      const spreadProps = resolveSpreadAttribute(attr, sourceFile);
      Object.assign(merged, spreadProps);
    } else if (Node.isJsxAttribute(attr)) {
      // Explicit prop - use existing getAttributeValue logic
      const name = attr.getNameNode().getText();
      const value = getAttributeValue(opening, name);
      if (value !== undefined) {
        merged[name] = value;
      }
    }
  }

  return merged;
}
```

### Detecting Custom Components

```typescript
// Pattern for transformer integration
const HTML_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span',
  'ul', 'ol', 'li',
  'a', 'b', 'i', 'strong', 'em', 'code',
  'pre', 'blockquote', 'br', 'hr',
]);

const SPECIAL_COMPONENTS = new Set(['Command', 'Markdown']);

function isCustomComponent(tagName: string): boolean {
  if (HTML_ELEMENTS.has(tagName)) return false;
  if (SPECIAL_COMPONENTS.has(tagName)) return false;
  // React convention: custom components start with uppercase
  return /^[A-Z]/.test(tagName);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual import path resolution | ts-morph `getModuleSpecifierSourceFile()` | ts-morph v10+ | Handles tsconfig paths automatically |
| `getSymbolAtLocation()` from TS API | ts-morph `identifier.getSymbol()` | ts-morph inception | Cleaner API, same underlying functionality |

**Deprecated/outdated:**
- TypeGuards module: Replaced by `Node.isXxx()` static methods in ts-morph v15+

## Open Questions

Things that couldn't be fully resolved:

1. **Nested spread resolution**
   - What we know: Simple `{...props}` where props is object literal works
   - What's unclear: Should `{...obj.nested}` property access be supported?
   - Recommendation: Start with simple identifiers only, expand if needed

2. **Component with multiple return statements**
   - What we know: Can find first return with JSX
   - What's unclear: What if component has conditional returns?
   - Recommendation: Take first JSX-returning statement, document limitation

3. **TypeScript as const assertions**
   - What we know: `const props = { name: "x" } as const` creates readonly type
   - What's unclear: Does this affect runtime value extraction?
   - Recommendation: Test during implementation, should work since we read initializer text

## Sources

### Primary (HIGH confidence)
- [ts-morph Imports Documentation](https://ts-morph.com/details/imports) - getModuleSpecifierSourceFile, getNamedImports
- [ts-morph Exports Documentation](https://ts-morph.com/details/exports) - getExportedDeclarations
- [ts-morph Object Literal Expressions](https://ts-morph.com/details/object-literal-expressions) - getProperties, getProperty
- [ts-morph Variables](https://ts-morph.com/details/variables) - getInitializer, getVariableDeclaration

### Secondary (MEDIUM confidence)
- [ts-morph GitHub Issues](https://github.com/dsherret/ts-morph/issues/802) - Symbol resolution patterns
- [TypeScript Compiler API Wiki](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API) - Symbol and Type concepts

### Tertiary (LOW confidence)
- [JSX Spread Attributes Gist](https://gist.github.com/sebmarkbage/07bbe37bc42b6d4aef81) - Original JSX spread proposal

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph already in use, APIs documented
- Architecture: HIGH - Extends existing transformer, no new layers needed
- Pitfalls: HIGH - Based on requirements and prior research (PITFALLS.md documents spread limitation)

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - ts-morph is stable, patterns well-established)
