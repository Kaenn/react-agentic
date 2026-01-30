# Runtime System

The runtime system enables TypeScript functions to execute at runtime while maintaining compile-time type safety. This bridges the gap between static prompt generation and dynamic execution.

## Overview

| Component | Purpose |
|-----------|---------|
| `useRuntimeVar<T>()` | Declare typed runtime variable references |
| `runtimeFn()` | Wrap TypeScript functions for runtime extraction |

## useRuntimeVar

Creates a typed reference to a shell variable that will be populated at runtime.

```tsx
import { useRuntimeVar } from 'react-agentic';

interface Context {
  success: boolean;
  error?: string;
  data: { count: number };
}

const ctx = useRuntimeVar<Context>('CTX');
```

### Property Access Tracking

The proxy tracks property access paths for jq expression generation:

```tsx
ctx                  // → $CTX
ctx.error            // → $(echo "$CTX" | jq -r '.error')
ctx.data.count       // → $(echo "$CTX" | jq -r '.data.count')
```

### Usage in Components

RuntimeVar works seamlessly in JSX:

```tsx
// In conditions
<If condition={ctx.error}>
  <p>Error occurred</p>
</If>

// In interpolation
<p>Count: {ctx.data.count}</p>
```

### Naming Convention

Use `UPPER_SNAKE_CASE` for variable names:

```tsx
const ctx = useRuntimeVar<Context>('CTX');        // Good
const result = useRuntimeVar<Result>('RESULT');   // Good
const myVar = useRuntimeVar<Data>('myVar');       // Avoid
```

## runtimeFn

Wraps TypeScript functions for extraction to `runtime.js`. The function executes in Node.js at runtime, not in Claude's context.

```tsx
import { runtimeFn, useRuntimeVar } from 'react-agentic';

// Define types
interface InitArgs {
  projectPath: string;
}

interface InitResult {
  success: boolean;
  error?: string;
}

// Define the function (must be named, not anonymous)
async function initProject(args: InitArgs): Promise<InitResult> {
  const fs = await import('fs/promises');
  try {
    await fs.stat(args.projectPath);
    return { success: true };
  } catch {
    return { success: false, error: 'Path not found' };
  }
}

// Wrap for runtime use
const Init = runtimeFn(initProject);
```

### The .Call Component

Each wrapped function provides a `.Call` component for JSX invocation:

```tsx
export default (
  <Command name="setup">
    {() => {
      const result = useRuntimeVar<InitResult>('RESULT');

      return (
        <>
          <Init.Call
            args={{ projectPath: "." }}
            output={result}
          />

          <If condition={result.error}>
            <p>Error: {result.error}</p>
          </If>
        </>
      );
    }}
  </Command>
);
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `args` | `AllowRuntimeVars<TArgs>` | Arguments passed to the function |
| `output` | `RuntimeVarProxy<TReturn>` | Variable to store the result |

### Function Requirements

- Must be a **named function** (not anonymous)
- Must be **async** and return a Promise
- Must accept a single **object argument**

```tsx
// Good - named async function with object arg
async function processData(args: { input: string }): Promise<Result> { ... }

// Bad - anonymous function
const process = async (args: Args) => { ... };

// Bad - non-object argument
async function process(input: string): Promise<Result> { ... }
```

## Complete Example

```tsx
import { Command, useRuntimeVar, runtimeFn, If, Else } from 'react-agentic';

interface CheckArgs {
  path: string;
}

interface CheckResult {
  exists: boolean;
  isDir: boolean;
  error?: string;
}

async function checkPath(args: CheckArgs): Promise<CheckResult> {
  const fs = await import('fs/promises');
  try {
    const stat = await fs.stat(args.path);
    return { exists: true, isDir: stat.isDirectory() };
  } catch {
    return { exists: false, isDir: false, error: 'Not found' };
  }
}

const Check = runtimeFn(checkPath);

export default (
  <Command name="validate" description="Validate project structure">
    {() => {
      const result = useRuntimeVar<CheckResult>('CHECK');

      return (
        <>
          <h2>Validation</h2>

          <Check.Call args={{ path: "." }} output={result} />

          <If condition={result.error}>
            <p>Validation failed: {result.error}</p>
          </If>
          <Else>
            <If condition={result.isDir}>
              <p>Valid project directory found</p>
            </If>
            <Else>
              <p>Path exists but is not a directory</p>
            </Else>
          </Else>
        </>
      );
    }}
  </Command>
);
```

## Build Output

When you build a command with runtime functions, two files are generated:

```
.claude/commands/
├── validate.md      # Claude-readable prompt
└── validate.runtime.js  # Node.js runtime functions
```

The markdown references the runtime file for function execution.

## Type Safety

The system provides full type safety:

- `args` are validated against the function's input type
- `output` must match the function's return type
- Property access on RuntimeVar is validated against the type parameter

```tsx
const result = useRuntimeVar<{ count: number }>('R');

result.count    // OK - number property exists
result.name     // TypeScript error - 'name' doesn't exist
```

## See Also

- [Control Flow](./control-flow.md) - If/Else, Loop, conditionals
- [Command](./command.md) - Building slash commands
- [Agent](./agent.md) - Building spawnable agents
