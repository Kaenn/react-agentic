# V2 Improvements

## Changes from V1

### 1. Remove `<Markdown>` Wrapper

**Before (v1):**
```tsx
<Markdown>
  ## Planning Phase {ctx.phaseId}

  Directory: `{ctx.phaseDir}`
</Markdown>
```

**After (v2):**
```tsx
## Planning Phase {ctx.phaseId}

Directory: `{ctx.phaseDir}`
```

**How it works:**
- Text content inside `<Command>` is implicitly markdown
- JSX expressions `{var.prop}` interpolate as before
- Components like `<If>`, `<Script>`, `<SpawnAgent>` are recognized
- Everything else = markdown text

**Compiler logic:**
```typescript
// In transformer
if (node.kind === 'JsxText' || node.kind === 'JsxExpression') {
  return createMarkdownNode(node.text);
}
```

### 2. Type-Safe Script Registration

**Before (v1):**
```tsx
// Loose coupling - fn name is a string, no type checking
<Script fn="init" args={{ arguments: "$ARGUMENTS" }} output={ctx} />

// Problems:
// - Typo in fn="innit" not caught
// - args shape not validated
// - output type not connected to function return
```

**After (v2):**
```tsx
// Import typed function from runtime
import { init, getPlanningContext } from './plan-phase.runtime';

// Register creates a typed component
const Init = runtimeFn(init);
const GetPlanningContext = runtimeFn(getPlanningContext);

// Usage - fully typed!
<Init args={{ arguments: "$ARGUMENTS" }} output={ctx} />

// TypeScript errors:
<Init args={{ wrong: "key" }} />  // Error: 'wrong' not in InitArgs
<Init output={wrongType} />        // Error: output must be ScriptVar<PlanPhaseContext>
```

**How `runtimeFn` works:**

```typescript
// Types
type RuntimeFunction<TArgs, TReturn> = (args: TArgs) => Promise<TReturn>;

type FromRuntime<TArgs, TReturn> = {
  (args: TArgs, output: ScriptVar<TReturn>): JSX.Element;
  // Also works as component
  Call: React.FC<{ args: TArgs; output: ScriptVar<TReturn> }>;
};

// Implementation
function runtimeFn<TArgs, TReturn>(
  fn: RuntimeFunction<TArgs, TReturn>
): FromRuntime<TArgs, TReturn> {
  const fnName = fn.name;

  // Return both callable and component forms
  const result = (args: TArgs, output: ScriptVar<TReturn>) => (
    <Script fn={fnName} args={args} output={output} />
  );

  result.Call = ({ args, output }) => (
    <Script fn={fnName} args={args} output={output} />
  );

  return result;
}
```

## Benefits

| Aspect | V1 | V2 |
|--------|----|----|
| Markdown syntax | Wrapped in `<Markdown>` | Direct text |
| Script fn names | String (typo-prone) | Function reference (typed) |
| Script args | Unvalidated object | Typed from function signature |
| Script output | Manual type annotation | Inferred from function return |
| Readability | Good | Excellent |
| Refactoring | Risky | Safe (rename propagates) |

## Usage Patterns

### Pattern 1: Inline Call (for simple scripts)
```tsx
{Init({ arguments: "$ARGUMENTS" }, ctx)}
```

### Pattern 2: Component Call (for clarity)
```tsx
<Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />
```

### Pattern 3: Conditional Script
```tsx
<If condition={needsResearch}>
  <GetResearchContext.Call
    args={{ phaseId: ctx.phaseId }}
    output={researchCtx}
  />
</If>
```

## Edge Cases

### Scripts without output
```tsx
// Runtime function returns void
async function archivePlans(args: { dir: string }): Promise<void> { ... }

const ArchivePlans = runtimeFn(archivePlans);

// Usage - no output prop needed
<ArchivePlans.Call args={{ dir: ctx.phaseDir }} />
```

### Scripts with no args
```tsx
async function initIteration(): Promise<number> { return 0; }

const InitIteration = runtimeFn(initIteration);

// Usage
<InitIteration.Call output={iteration} />
```
