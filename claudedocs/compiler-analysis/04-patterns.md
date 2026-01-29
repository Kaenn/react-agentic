# Cross-Cutting Patterns

Design decisions and architectural patterns that span the compiler codebase.

## Version Stratification

The compiler supports two major versions of the component model: **V1** (static) and **V3** (runtime).

> **Note on naming**: V2 was an internal iteration that was never released. The version jump from V1 to V3 reflects this development history.

### V1 (Static)

- Build-time only transformation
- No runtime TypeScript execution
- Variables via `useVariable()` → shell assignments
- Simple conditional via `OnStatus`

```tsx
const phaseDir = useVariable('PHASE_DIR', { bash: 'grep ...' });
```

### V3 (Runtime)

- Dual output: Markdown + runtime.js
- TypeScript functions callable at execution time
- Typed runtime variables via `useRuntimeVar<T>()`
- Full control flow: If/Else, Loop, Break, Return

```tsx
const ctx = useRuntimeVar<InitResult>('CTX');
const Init = runtimeFn(init);

<Init.Call args={{ phase: 1 }} output={ctx} />
<If condition={ctx.error}>
  <Return status="ERROR" message="Initialization failed" />
</If>
```

### Version Selection

Files are detected as V3 if they import from `react-agentic/v3` or use runtime markers:

```typescript
function hasRuntimeImports(content: string): boolean {
  return (
    content.includes('useRuntimeVar') ||
    content.includes('runtimeFn') ||
    content.includes('from \'react-agentic/v3\'')
  );
}
```

## Discriminated Unions for Safety

All IR nodes use `kind` as discriminator, enabling:

1. **Exhaustive handling** - TypeScript error if case missing
2. **Type narrowing** - Properties available after switch
3. **Runtime type guards** - `node.kind === 'heading'`

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected node: ${JSON.stringify(x)}`);
}

switch (node.kind) {
  case 'heading': return emitHeading(node);
  case 'paragraph': return emitParagraph(node);
  // ...
  default: return assertNever(node);  // TS error if missing cases
}
```

## Semantic Nodes

Domain concepts get dedicated IR nodes rather than generic structures:

| Node | Purpose | Why Not Generic |
|------|---------|-----------------|
| `ExecutionContextNode` | File path references | Needs @ prefix handling |
| `SuccessCriteriaNode` | Checkbox items | Claude Code convention |
| `OfferNextNode` | Navigation routes | Specific formatting |
| `SpawnAgentNode` | Agent invocation | Complex Task() syntax |
| `StepNode` | Workflow steps | Multiple variants |

Benefits:
- Type-safe properties specific to the concept
- Emission logic encapsulated in one place
- Clear intent in the IR

## Context Threading

State flows through transformation via explicit context objects:

```
createRuntimeContext()
        │
        ▼
   ┌────────────────────────────────────────┐
   │  RuntimeTransformContext               │
   │  - sourceFile                          │
   │  - namespace                           │
   │  - runtimeVars: Map<name, info>       │
   │  - runtimeFunctions: Map<name, info>  │
   │  - localComponents: Map<name, info>   │
   │  - componentExpansionStack: Set       │
   └────────────────────────────────────────┘
        │
        ▼ Passed to every transform function
   transformRuntimeCommand(rootElement, ctx)
        │
        ▼
   transformBlockChildren(children, ctx)
        │
        ▼
   transformToBlock(child, ctx)
```

Why not class instance state:
- Explicit dependencies (testable)
- No hidden shared state
- Easier to reason about

## Code-Split Runtime

For projects with many commands, single-entry bundling creates large files:

```
runtime.js (500KB) = command1 + command2 + ... + commandN
```

Code-split mode generates:

```
runtime.js (2KB)       # Dispatcher only
planPhase.js (50KB)    # Loads on-demand
mapCodebase.js (40KB)  # Loads on-demand
```

Dispatcher dynamically imports:

```javascript
const namespace = fnName.slice(0, underscoreIdx);  // "planPhase"
const fn = fnName.slice(underscoreIdx + 1);        // "init"
const mod = await import(`./${namespace}.js`);
const result = await mod[fn](args);
```

Trade-offs:
- Startup: Fast (only loads dispatcher)
- First call: Slightly slower (module load)
- Disk: More files but similar total size

## Circular Import Prevention

Transformer modules could easily form cycles:

```
control.ts imports semantic.ts for XmlBlock
semantic.ts imports control.ts for nested If
```

Solution: Central dispatch module that all others import:

```typescript
// dispatch.ts exports
export function transformToBlock(node, ctx): BlockNode | null
export function transformBlockChildren(children, ctx): BlockNode[]

// Other modules import from dispatch.ts only
import { transformBlockChildren } from './dispatch.js';
```

## JSX Whitespace Preservation

JSX normalizes whitespace, but markdown needs newlines preserved.

Solution: Extract raw source text when multiline:

```typescript
function extractRawMarkdownText(node: Node): string | null {
  const sourceFile = node.getSourceFile();
  // Bypass JSX normalization - get raw text from source
  const text = sourceFile.getFullText().slice(node.getStart(), node.getEnd());

  if (!text.includes('\n')) {
    // Single line: use standard normalization
    return text.replace(/\s+/g, ' ').trim();
  }

  // Multi-line: preserve newlines, dedent
  // ... dedent and clean up ...
}
```

## Error Messages with Location

Every transformer function receives `createError`:

```typescript
interface TransformContext {
  createError: (message: string, node: Node) => Error;
}

// Usage
throw ctx.createError(`<Else> must follow <If> as sibling`, node);

// Output
// Error: <Else> must follow <If> as sibling
//   at src/app/my-command.tsx:42
```

## Error Handling Patterns

### Error Categories

| Category | Source | Example |
|----------|--------|---------|
| **Transform errors** | Invalid JSX structure | `<Else>` without `<If>` |
| **Resolution errors** | Import/component lookup | Circular import detected |
| **Config errors** | Invalid JSON | Malformed `react-agentic.config.json` |
| **Validation errors** | Invalid prop values | Invalid XML name in `<XmlBlock>` |

### Error Propagation

Errors are thrown immediately when detected - no error accumulation:

```typescript
// In transformXmlBlock
if (!isValidXmlName(nameAttr)) {
  throw ctx.createError(
    `Invalid XML tag name '${nameAttr}' - must start with letter...`,
    node
  );
}
```

This fail-fast approach ensures:
- Clear error messages with exact location
- No cascading errors from invalid state
- Simpler debugging (first error is root cause)

### Performance Notes

- **ts-morph overhead**: Initial Project creation is expensive (~100-500ms). Reusing the Project instance across files amortizes this cost.
- **esbuild speed**: Runtime bundling is fast (<50ms for most projects). esbuild's Go implementation handles tree-shaking efficiently.
- **Watch mode**: Full rebuilds on each change. With fast tooling, incremental complexity isn't worth it for typical project sizes.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  build.ts → config.ts → watcher.ts                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Build Pipeline                               │
│  runtime-build.ts                                               │
│  - createRuntimeContext()                                       │
│  - extract*Declarations()                                       │
│  - transform*Command()                                          │
│  - emitDocument()                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Transformer   │  │       IR        │  │     Emitter     │
│   dispatch.ts   │  │   nodes.ts      │  │   emitter.ts    │
│   control.ts    │  │   runtime-      │  │   runtime-      │
│   semantic.ts   │  │   nodes.ts      │  │   markdown-     │
│   ...           │  │                 │  │   emitter.ts    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                                  │
                                                  ▼
                              ┌─────────────────────────────────┐
                              │        Runtime Bundler          │
                              │     esbuild-bundler.ts          │
                              │  - bundleSingleEntryRuntime()   │
                              │  - bundleCodeSplit()            │
                              └─────────────────────────────────┘
```

## Key Files Reference

| Layer | Files |
|-------|-------|
| CLI | `src/cli/commands/build.ts`, `config.ts`, `watcher.ts` |
| Pipeline | `src/cli/runtime-build.ts` |
| Transformer | `src/parser/transformers/*.ts` |
| IR | `src/ir/nodes.ts`, `runtime-nodes.ts` |
| Emitter | `src/emitter/emitter.ts`, `runtime-markdown-emitter.ts` |
| Bundler | `src/emitter/esbuild-bundler.ts` |
