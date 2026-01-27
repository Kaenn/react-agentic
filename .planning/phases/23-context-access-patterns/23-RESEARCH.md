# Phase 23: Context Access Patterns - Research

**Researched:** 2026-01-26
**Domain:** TypeScript compile-time patterns, render props, JSX generic type parameters
**Confidence:** HIGH

## Summary

Phase 23 introduces three compile-time patterns to react-agentic: render props for context access in Command/Agent components, explicit generic type parameters on workflow components (Bash, Loop, If), and a Step component for numbered workflow sections. All patterns leverage TypeScript's type system and ts-morph AST parsing for compile-time validation and transformation.

The render props pattern follows React's established function-as-children pattern but operates purely at compile time. Context is resolved during TSX-to-markdown transformation, with all values static in the output markdown (no runtime shell placeholders). Generic type parameters provide compile-time type checking without runtime overhead, following TypeScript's standard JSX generic syntax with trailing comma disambiguation (`<T,>`).

**Primary recommendation:** Leverage ts-morph's ArrowFunction and type argument parsing capabilities to detect render props children and generic type parameters during AST transformation. Follow React's established render props patterns for API design while maintaining react-agentic's compile-time-only philosophy.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-morph | 23.0+ | TypeScript AST parsing and manipulation | Wrapper around TypeScript Compiler API used throughout react-agentic |
| TypeScript | 5.0+ | Type system and JSX compilation | Required for JSX syntax, generic type parameters, and type checking |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript Compiler API | (via ts-morph) | Low-level AST node access | When ts-morph abstractions insufficient |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-morph | Raw TypeScript Compiler API | More control but significantly more complex - ts-morph already used project-wide |
| Render props | Higher-order components | Less flexible, doesn't fit compile-time pattern |
| Generic syntax `<T,>` | `<T extends unknown>` | Both valid - trailing comma is cleaner and more common |

**Installation:**
```bash
# Already installed in project
npm install ts-morph typescript
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── parser/
│   ├── transformer.ts     # Transform JSX to IR - add render props detection
│   ├── parser.ts          # AST utilities - add arrow function parsing
├── ir/
│   ├── nodes.ts           # IR node types - extend context types
├── jsx.ts                 # Component exports - Step component
├── workflow/
│   ├── Command.ts         # Add render props to CommandProps
│   ├── agents/
│   │   └── Agent.ts       # Add render props to AgentProps
├── primitives/
│   ├── control.ts         # Add generics to If
│   ├── step.ts            # NEW: Step component
└── emitter/
    └── emitter.ts         # Emit markdown from IR
```

### Pattern 1: Render Props Children Detection

**What:** Detect when children prop is an arrow function `(ctx) => ReactNode` instead of regular JSX
**When to use:** During AST transformation of Command/Agent elements
**Example:**
```typescript
// Source: ts-morph documentation and React render props patterns
import { Node, JsxElement, JsxExpression } from 'ts-morph';

function detectRenderPropsChildren(node: JsxElement): {
  isRenderProps: boolean;
  contextParam?: string;
  body?: Node;
} {
  const children = node.getJsxChildren();

  // Look for single JSX expression child
  if (children.length !== 1) return { isRenderProps: false };
  const child = children[0];

  if (!Node.isJsxExpression(child)) return { isRenderProps: false };

  const expr = child.getExpression();
  if (!expr || !Node.isArrowFunction(expr)) return { isRenderProps: false };

  // Extract parameter name
  const params = expr.getParameters();
  if (params.length !== 1) return { isRenderProps: false };

  const paramName = params[0].getName();
  const functionBody = expr.getBody();

  return {
    isRenderProps: true,
    contextParam: paramName,
    body: functionBody,
  };
}
```

### Pattern 2: Context Object Construction

**What:** Build context object with command/agent metadata at compile time
**When to use:** When transforming Command/Agent with render props pattern
**Example:**
```typescript
// Context shape determined by component type
interface CommandContext {
  name: string;
  description: string;
  skill?: string;
  outputPath: string;    // Resolved at build time
  sourcePath: string;    // Resolved at build time
}

interface AgentContext extends CommandContext {
  tools?: string[];
  model?: string;
}

// Build context during transformation
function buildCommandContext(
  node: JsxElement,
  sourcePath: string,
  outputPath: string
): CommandContext {
  const openingElement = node.getOpeningElement();

  return {
    name: getAttributeValue(openingElement, 'name') || '',
    description: getAttributeValue(openingElement, 'description') || '',
    skill: getAttributeValue(openingElement, 'skill'),
    outputPath,    // Known at build time
    sourcePath,    // Known at build time
  };
}
```

### Pattern 3: Generic Type Parameters on JSX Elements

**What:** Parse explicit generic type arguments like `<Bash<string>>` or `<Loop<User>>`
**When to use:** During AST transformation of workflow components
**Example:**
```typescript
// Source: TypeScript JSX documentation, ts-morph type argument extraction
import { Node, JsxElement, TypeArgumentedNode } from 'ts-morph';

function extractGenericTypeArgument(node: JsxElement | JsxSelfClosingElement): string | undefined {
  const tagNode = Node.isJsxElement(node)
    ? node.getOpeningElement().getTagNameNode()
    : node.getTagNameNode();

  // Check if tag has type arguments
  if (!Node.isTypeArgumentedNode(tagNode)) return undefined;

  const typeArgs = tagNode.getTypeArguments();
  if (typeArgs.length === 0) return undefined;

  // Get first type argument text
  return typeArgs[0].getText();
}
```

### Pattern 4: Step Component Variant Rendering

**What:** Single component with multiple output formats controlled by variant prop
**When to use:** For numbered workflow sections that need different markdown representations
**Example:**
```typescript
interface StepProps {
  name: string;
  number: number;
  variant?: 'heading' | 'bold' | 'xml';  // Default: TBD
  children?: ReactNode;
}

// Emission examples:
// variant="heading" → ## Step 1: Setup
// variant="bold" → **Step 1: Setup**
// variant="xml" → <step number="1" name="Setup">...</step>
```

### Anti-Patterns to Avoid

- **Runtime context resolution:** Context values must be static at build time, not deferred to shell execution
- **Auto-increment numbering:** Step numbers must be explicit - no magic state tracking across components
- **Runtime generic validation:** Generics are compile-time only for TypeScript type checking
- **Implicit type inference everywhere:** Require explicit generics when type can't be reliably inferred from props
- **Mixing render props with regular children:** Either use render function OR regular children, not both

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSX arrow function parsing | Custom regex or string parsing | ts-morph `Node.isArrowFunction()` | Handles edge cases, parameter destructuring, type annotations |
| Generic type argument parsing | String manipulation of `<Type>` | ts-morph `getTypeArguments()` | Handles complex types, nested generics, constraints |
| React render props pattern | Invent new API | Standard function-as-children pattern | Well-understood by TypeScript developers |
| Type inference from props | Runtime type checking | TypeScript's built-in inference | No runtime overhead, compile-time safety |

**Key insight:** The TypeScript Compiler API (via ts-morph) already handles all JSX parsing complexity. Don't try to parse JSX syntax manually - leverage the AST nodes.

## Common Pitfalls

### Pitfall 1: Attempting Runtime Context Resolution

**What goes wrong:** Trying to defer context values to shell runtime via placeholders like `{buildDate}`
**Why it happens:** Confusion between compile-time (TSX transformation) and runtime (Claude execution)
**How to avoid:** Resolve all context values during build process - use `new Date()` at build time, not shell placeholders
**Warning signs:** Context fields containing `{variable}` syntax, attempts to use shell environment variables in context

### Pitfall 2: Arrow Function Ambiguity in TSX

**What goes wrong:** TypeScript compiler confuses `<T>` with JSX opening tag in arrow functions
**Why it happens:** JSX syntax conflicts with generic type parameter syntax
**How to avoid:** Always use trailing comma for arrow function generics in `.tsx` files: `<T,>` or constraint syntax: `<T extends unknown>`
**Warning signs:** TypeScript errors about "JSX element T has no corresponding closing tag"

### Pitfall 3: Holding Compiler Nodes Across Manipulations

**What goes wrong:** Stale node references after AST modifications cause crashes or incorrect behavior
**Why it happens:** ts-morph regenerates AST tree after each manipulation
**How to avoid:** Don't store compiler nodes in variables across transformation steps - re-query the AST
**Warning signs:** "Node not found" errors, stale data from node properties

### Pitfall 4: Type-Only Imports in Generated Output

**What goes wrong:** Trying to reference TypeScript types in markdown output
**Why it happens:** Forgetting that generics/types are compile-time only, markdown is runtime
**How to avoid:** Use generics for validation during transformation, emit only runtime values to markdown
**Warning signs:** Attempting to emit type names or generic parameters to markdown

### Pitfall 5: Complex Context Propagation Logic

**What goes wrong:** Building elaborate context inheritance/merging systems
**Why it happens:** Over-engineering the context flow between nested components
**How to avoid:** Keep context simple - parent context is passed as-is to render function, no merging
**Warning signs:** Context "providers", "consumers", inheritance chains

## Code Examples

Verified patterns from official sources and existing codebase:

### Detecting Render Props Children

```typescript
// Source: ts-morph navigation documentation + react-agentic patterns
import { Node, JsxElement, JsxExpression, ArrowFunction } from 'ts-morph';

interface RenderPropsInfo {
  isRenderProps: boolean;
  paramName?: string;
  arrowFunction?: ArrowFunction;
}

function analyzeChildren(element: JsxElement): RenderPropsInfo {
  const children = element.getJsxChildren();

  // Filter out whitespace-only text nodes
  const nonWhitespace = children.filter(child => {
    if (Node.isJsxText(child)) {
      return child.getText().trim().length > 0;
    }
    return true;
  });

  // Must have exactly one child that's a JSX expression
  if (nonWhitespace.length !== 1) {
    return { isRenderProps: false };
  }

  const child = nonWhitespace[0];
  if (!Node.isJsxExpression(child)) {
    return { isRenderProps: false };
  }

  const expr = child.getExpression();
  if (!expr || !Node.isArrowFunction(expr)) {
    return { isRenderProps: false };
  }

  // Extract parameter (should be exactly one)
  const params = expr.getParameters();
  if (params.length !== 1) {
    return { isRenderProps: false };
  }

  return {
    isRenderProps: true,
    paramName: params[0].getName(),
    arrowFunction: expr,
  };
}
```

### Extracting Generic Type Arguments

```typescript
// Source: TypeScript JSX specification + ts-morph type APIs
import { Node, JsxSelfClosingElement, JsxElement } from 'ts-morph';

function getExplicitGenericType(
  node: JsxElement | JsxSelfClosingElement
): string | undefined {
  // Get the tag name node
  const tagNameNode = Node.isJsxElement(node)
    ? node.getOpeningElement().getTagNameNode()
    : node.getTagNameNode();

  // Check if it has type arguments (e.g., <Bash<string>>)
  const typeArgs = tagNameNode.getType().getTypeArguments();

  // For explicit syntax like <Bash<string>>, we need to check
  // the source text directly as type arguments on JSX elements
  // are handled specially
  const sourceText = tagNameNode.getText();
  const typeArgMatch = sourceText.match(/<([^>]+)>$/);

  return typeArgMatch ? typeArgMatch[1] : undefined;
}
```

### Transforming Render Props Body

```typescript
// Source: Existing react-agentic transformer patterns
import { Node, ArrowFunction } from 'ts-morph';

function transformRenderPropsBody(
  arrowFn: ArrowFunction,
  context: Record<string, unknown>,
  transformer: Transformer
): BlockNode[] {
  const body = arrowFn.getBody();

  // Handle different arrow function body types
  if (Node.isBlock(body)) {
    // { return <div>...</div>; }
    const returnStmt = body.getStatements()
      .find(stmt => Node.isReturnStatement(stmt));

    if (returnStmt && Node.isReturnStatement(returnStmt)) {
      const returnExpr = returnStmt.getExpression();
      if (returnExpr) {
        return transformer.transformToBlockArray(returnExpr);
      }
    }
  } else {
    // Direct expression: (ctx) => <div>...</div>
    return transformer.transformToBlockArray(body);
  }

  return [];
}
```

### Step Component Emission

```typescript
// Source: Existing emitter patterns for variant-based components
function emitStepNode(node: StepNode): string {
  const { number, name, variant, children } = node;

  switch (variant) {
    case 'heading':
      // ## Step 1: Setup
      return `## Step ${number}: ${name}\n\n${emitChildren(children)}`;

    case 'bold':
      // **Step 1: Setup**
      return `**Step ${number}: ${name}**\n\n${emitChildren(children)}`;

    case 'xml':
      // <step number="1" name="Setup">...</step>
      return `<step number="${number}" name="${name}">\n${emitChildren(children)}\n</step>`;

    default:
      // Default to heading (or bold, or xml - TBD in planning)
      return `## Step ${number}: ${name}\n\n${emitChildren(children)}`;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String interpolation for context | Render props with typed context | This phase | Type-safe context access, better DX |
| Inferred generics only | Explicit generic type parameters | This phase | More control, clearer intent in complex scenarios |
| Manual step numbering in text | Step component with explicit numbering | This phase | Structured, variant-based output |
| N/A | Children can be functions | This phase | Enables context access pattern |

**Deprecated/outdated:**
- None - this is a new feature addition, no deprecation

## Open Questions

1. **Step Component Default Variant**
   - What we know: Three variants supported (heading, bold, xml)
   - What's unclear: Which should be the default when variant prop omitted
   - Recommendation: Use `heading` as default (most common in markdown docs), document in planning phase

2. **Generic Type Inference Strategy**
   - What we know: Should infer from props when possible (e.g., Loop items prop)
   - What's unclear: Exact heuristics for when to require explicit generic vs auto-infer
   - Recommendation: Start with explicit-only for Phase 23, add inference in future phase if needed

3. **Context Propagation to Nested Components**
   - What we know: Inner components (SpawnAgent, If) can accept render props with parent context
   - What's unclear: Implementation strategy - pass context down transformer call stack or use other mechanism
   - Recommendation: Pass context object through transformer methods as optional parameter

## Sources

### Primary (HIGH confidence)

- **ts-morph documentation** - https://ts-morph.com/navigation/ - Navigation and AST traversal patterns
- **ts-morph GitHub** - https://github.com/dsherret/ts-morph - ArrowFunction class implementation
- **TypeScript JSX** - https://www.typescriptlang.org/docs/handbook/jsx.html - Generic type parameters in JSX
- **React render props patterns** - https://www.patterns.dev/react/render-props-pattern/ - Established render props architecture
- **TypeScript Generics in React Components** - https://mariusschulz.com/blog/passing-generics-to-jsx-elements-in-typescript - Generic JSX syntax

### Secondary (MEDIUM confidence)

- **React TypeScript Cheatsheets** - https://react-typescript-cheatsheet.netlify.app/docs/advanced/patterns_by_usecase/ - Render props typing patterns
- **TypeScript Generics for React** - https://www.developerway.com/posts/typescript-generics-for-react-developers - Generic component patterns
- **Functions as Children** - https://learn.react-js.dev/advanced-concepts/render-props-and-functions-as-a-child - Render props vs function-as-children

### Tertiary (LOW confidence)

- None - all core patterns verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ts-morph already used throughout project
- Architecture: HIGH - Patterns based on existing transformer infrastructure and official TypeScript/React docs
- Pitfalls: HIGH - Based on ts-morph documentation warnings and TypeScript JSX known issues

**Research date:** 2026-01-26
**Valid until:** ~30 days (TypeScript/ts-morph are stable, patterns unlikely to change)
