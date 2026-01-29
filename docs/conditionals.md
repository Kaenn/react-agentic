# Conditionals

Conditionals are now part of the unified control flow system using RuntimeVar. This file is kept for backward compatibility - see [Control Flow](./control-flow.md) for the current documentation.

## Migration Notice

The old conditional system using `test` strings and shell expressions has been replaced by RuntimeVar-based conditions.

### Old Pattern (Deprecated)

```tsx
// DON'T use this pattern
import { If, Else, useVariable, Assign } from '../jsx.js';

const result = useVariable("RESULT");
<Assign var={result} bash={`command`} />
<If test="[ $RESULT = 'ok' ]">...</If>
```

### New Pattern (Current)

```tsx
// USE this pattern
import { Command, If, Else, useRuntimeVar, runtimeFn } from 'react-agentic';

interface CheckResult {
  success: boolean;
  error?: string;
}

async function checkStatus(args: {}): Promise<CheckResult> {
  // Implementation
}

const Check = runtimeFn(checkStatus);

export default (
  <Command name="my-command" description="Uses conditionals">
    {() => {
      const result = useRuntimeVar<CheckResult>('RESULT');

      return (
        <>
          <Check.Call args={{}} output={result} />

          <If condition={result.success}>
            <p>Operation succeeded</p>
          </If>
          <Else>
            <p>Error: {result.error}</p>
          </Else>
        </>
      );
    }}
  </Command>
);
```

## If Component

Conditionally render content based on RuntimeVar truthiness.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `condition` | `Condition` | Yes | RuntimeVar to evaluate |
| `children` | `ReactNode` | Yes | Content when true |

### Condition Evaluation

- **Truthy**: Non-empty string, non-zero number, `true`, non-null object
- **Falsy**: Empty string, `0`, `false`, `null`, `undefined`

```tsx
const ctx = useRuntimeVar<{ error?: string; count: number }>('CTX');

<If condition={ctx.error}>        {/* Truthy check on optional string */}
  <p>Error: {ctx.error}</p>
</If>
```

## Else Component

Provides alternative content when the preceding `<If>` is false.

### Rules

1. `<Else>` must immediately follow `</If>` (whitespace allowed)
2. `<Else>` without preceding `<If>` causes compile error
3. `<If>` can exist without `<Else>`

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | Yes | Content when false |

## Nested Conditionals

```tsx
<If condition={ctx.type}>
  <If condition={ctx.type === 'production'}>
    <p>Production mode enabled</p>
  </If>
  <Else>
    <p>Development mode: {ctx.type}</p>
  </Else>
</If>
```

## Related: OnStatus

For status-based conditional rendering after agent execution, see `OnStatus` in [Communication](./communication.md#handling-agent-output).

| Component | Condition Source | Use Case |
|-----------|------------------|----------|
| `<If>/<Else>` | RuntimeVar truthiness | Check computed values |
| `<OnStatus>` | Agent return status | Handle SUCCESS/BLOCKED/ERROR |

## See Also

- [Control Flow](./control-flow.md) - Complete control flow documentation
- [Runtime System](./runtime.md) - useRuntimeVar and runtimeFn
