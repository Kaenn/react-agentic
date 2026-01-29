# Transformer Architecture

The transformer converts JSX AST nodes to IR nodes through a modular dispatch system.

## Goal

Route each JSX element to the appropriate transformer function while:
- Preventing circular imports between modules
- Threading context through the call tree
- Handling special cases like If/Else sibling pairing

## Why

**Circular Import Problem**: Transformer modules need to call each other recursively. For example:
- `control.ts` (If) might contain `XmlBlock` children → needs `semantic.ts`
- `semantic.ts` (XmlBlock) might contain `If` children → needs `control.ts`

Direct imports create cycles: `control.ts → semantic.ts → control.ts`

**Solution**: Central dispatch module that all others import. Modules call `transformBlockChildren()` and `transformToBlock()` from dispatch.ts instead of importing each other directly.

## Central Dispatch

**File:** `src/parser/transformers/dispatch.ts`

The dispatcher provides two main entry points:

```typescript
// Transform single node to BlockNode
export function transformToBlock(node: Node, ctx: TransformContext): BlockNode | null

// Transform array of children with sibling handling
export function transformBlockChildren(jsxChildren: Node[], ctx: TransformContext): BlockNode[]
```

All transformer modules import from dispatch.ts rather than each other:

```
           dispatch.ts
               │
    ┌──────────┼──────────┐
    │          │          │
control.ts  html.ts  semantic.ts ...
```

## Element Routing

The `transformElement()` function routes by tag name:

```typescript
function transformElement(name: string, node: JsxElement | JsxSelfClosingElement, ctx: TransformContext): BlockNode | null {
  // HTML-like elements
  if (name.match(/^h([1-6])$/)) return { kind: 'heading', level, children };
  if (name === 'p') return { kind: 'paragraph', children };
  if (name === 'ul') return transformList(node, false, ctx);
  if (name === 'ol') return transformList(node, true, ctx);
  if (name === 'pre') return transformCodeBlock(node, ctx);

  // Framework components
  if (name === 'XmlBlock') return transformXmlBlock(node, ctx);
  if (name === 'SpawnAgent') return transformSpawnAgent(node, ctx);
  if (name === 'If') return transformIf(node, ctx);
  if (name === 'Loop') return transformLoop(node, ctx);
  if (name === 'Table') return transformTable(node, ctx);

  // Custom components (PascalCase)
  if (isCustomComponent(name)) return transformCustomComponent(name, node, ctx);

  throw ctx.createError(`Unsupported block element: <${name}>`, node);
}
```

## Transform Context

**File:** `src/parser/transformers/types.ts`

V1 context for basic transformation:

```typescript
interface TransformContext {
  sourceFile: SourceFile | undefined;
  visitedPaths: Set<string>;           // Circular import detection
  variables: Map<string, ExtractedVariable>;  // useVariable declarations
  outputs: Map<string, string>;        // useOutput declarations
  stateRefs: Map<string, string>;      // useStateRef declarations
  renderPropsContext: RenderPropsContext | undefined;
  createError: (message: string, node: Node) => Error;
}
```

**File:** `src/parser/transformers/runtime-types.ts`

V3 context extends with runtime tracking:

```typescript
interface RuntimeTransformContext {
  sourceFile: SourceFile | undefined;
  namespace: string;                   // For function prefixing
  visitedPaths: Set<string>;
  runtimeVars: Map<string, RuntimeVarInfo>;      // useRuntimeVar
  runtimeFunctions: Map<string, RuntimeFunctionInfo>;  // runtimeFn
  runtimeImports: Set<string>;         // Paths for extraction
  usedRuntimeFunctions: Set<string>;   // Track usage
  localComponents: Map<string, LocalComponentInfo>;  // Local TSX functions
  componentExpansionStack: Set<string>;  // Prevent infinite recursion
  componentProps: Map<string, unknown> | null;
  componentChildren: BlockNode[] | null;
  createError: (message: string, node: Node) => Error;
}
```

## If/Else Sibling Pairing

Else must immediately follow If as a sibling. `transformBlockChildren()` handles this:

```typescript
export function transformBlockChildren(jsxChildren: Node[], ctx: TransformContext): BlockNode[] {
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < jsxChildren.length) {
    const child = jsxChildren[i];

    if (isJsxElement(child) && getElementName(child) === 'If') {
      // Transform If
      const ifNode = transformIf(child, ctx);
      blocks.push(ifNode);

      // Check for Else sibling (skip whitespace-only text)
      let nextIndex = i + 1;
      while (nextIndex < jsxChildren.length) {
        const sibling = jsxChildren[nextIndex];
        if (isJsxText(sibling) && !extractText(sibling)) {
          nextIndex++;
          continue;
        }
        if (isJsxElement(sibling) && getElementName(sibling) === 'Else') {
          const elseNode = transformElse(sibling, ctx);
          blocks.push(elseNode);
          i = nextIndex;  // Skip past Else in outer loop
        }
        break;
      }
    } else {
      const block = transformToBlock(child, ctx);
      if (block) blocks.push(block);
    }
    i++;
  }
  return blocks;
}
```

Standalone `<Else>` without preceding `<If>` throws an error:

```typescript
if (name === 'Else') {
  throw ctx.createError('<Else> must follow <If> as sibling', node);
}
```

## Custom Component Resolution

**File:** `src/parser/transformers/markdown.ts`

Custom components (PascalCase functions) are resolved and inlined at compile time.

### V1 Context (TransformContext)

V1 resolves components via import resolution. Props are **not supported** - only parameterless composition:

```typescript
function transformCustomComponent(name: string, node, ctx: TransformContext): BlockNode | null {
  // 1. Validate no props (v1 limitation)
  const attributes = openingElement.getAttributes();
  if (attributes.length > 0) {
    throw ctx.createError(`Component props not supported: <${name}>`, node);
  }

  // 2. Resolve via import/file resolution
  const resolved = resolveComponentImport(name, ctx.sourceFile, ctx.visitedPaths);

  // 3. Update visited paths for circular detection
  ctx.visitedPaths = resolved.visitedPaths;

  // 4. Transform the resolved JSX
  return transformToBlock(resolved.jsx, ctx);
}
```

### V3 Context (RuntimeTransformContext)

V3 adds `localComponents` map for in-file component definitions with prop support:

```typescript
// V3 looks up local components first, then falls back to import resolution
const component = ctx.localComponents.get(name);
if (component) {
  // Extract props, set componentProps/componentChildren on context
  // Transform with prop substitution available
}
```

This distinction matters: code using `ctx.localComponents` requires `RuntimeTransformContext`.

## JSX Text Handling

**File:** `src/parser/transformers/dispatch.ts`

Multi-line text preserves newlines via raw source extraction:

```typescript
function extractRawMarkdownText(node: Node): string | null {
  // Use raw source text to bypass JSX whitespace normalization
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText().slice(node.getStart(), node.getEnd());

  // Single-line: standard normalization
  if (!text.includes('\n')) {
    return text.replace(/\s+/g, ' ').trim();
  }

  // Multi-line: preserve newlines, dedent
  const lines = text.split('\n');
  // ... dedent logic ...
  return result;
}
```

## Render Props Context

**File:** `src/parser/transformers/types.ts`

The `RenderPropsContext` interface supports arrow function patterns like:

```tsx
<SpawnAgent>
  {(ctx) => (
    <XmlBlock name="result">{ctx.output}</XmlBlock>
  )}
</SpawnAgent>
```

```typescript
interface RenderPropsContext {
  paramName: string;  // e.g., 'ctx'
  values: Record<string, string>;  // Available interpolation values
}
```

When set on `TransformContext.renderPropsContext`, transformers can substitute `{ctx.output}` with actual values. This is primarily used in V3 for typed agent output handling.

## Transformer Modules

| Module | Handles |
|--------|---------|
| `control.ts` | If, Else, Loop, OnStatus |
| `html.ts` | ul, ol, blockquote, pre, div |
| `semantic.ts` | Table, List, ExecutionContext, XmlSection |
| `markdown.ts` | XmlBlock, Markdown, custom components |
| `spawner.ts` | SpawnAgent |
| `variables.ts` | Assign, AssignGroup |
| `state.ts` | ReadState, WriteState |
| `primitives.ts` | Step, Bash, ReadFiles, PromptTemplate |
| `inline.ts` | strong, em, code, a, br |
| `runtime-*.ts` | V3 runtime-specific transformers |

## Key Files

| File | Purpose |
|------|---------|
| `src/parser/transformers/dispatch.ts` | Central routing and sibling handling |
| `src/parser/transformers/types.ts` | V1 TransformContext |
| `src/parser/transformers/runtime-types.ts` | V3 RuntimeTransformContext |
| `src/parser/transformers/index.ts` | Module re-exports |
