# Control Flow

Control flow components enable conditional logic, iteration, and early exit in commands and agents.

## Overview

| Component | Purpose |
|-----------|---------|
| `If` / `Else` | Conditional rendering based on RuntimeVar |
| `Loop` / `Break` | Bounded iteration with early exit |
| `Return` | Exit command early with status |
| `AskUser` | Interactive user prompts |

## If / Else

Conditionally render content based on RuntimeVar values.

```tsx
import { If, Else, useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ error?: string }>('CTX');

<If condition={ctx.error}>
  <p>Error occurred: {ctx.error}</p>
</If>
<Else>
  <p>Operation successful</p>
</Else>
```

### If Props

| Prop | Type | Description |
|------|------|-------------|
| `condition` | `Condition` | RuntimeVar to evaluate for truthiness |
| `children` | `ReactNode` | Content rendered when true |

### Else Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Content rendered when preceding If is false |

### Condition Evaluation

Conditions use truthy/falsy evaluation:

- **Truthy**: Non-empty string, non-zero number, `true`, non-null object
- **Falsy**: Empty string, `0`, `false`, `null`, `undefined`

```tsx
const result = useRuntimeVar<{
  success: boolean;
  data?: string;
  count: number;
}>('R');

<If condition={result.success}>  {/* Boolean check */}
  <If condition={result.data}>   {/* String truthy check */}
    <p>Data: {result.data}</p>
  </If>
</If>
```

### Nested Conditionals

```tsx
<If condition={ctx.status}>
  <If condition={ctx.status === 'SUCCESS'}>
    <p>Completed successfully</p>
  </If>
  <Else>
    <p>Status: {ctx.status}</p>
  </Else>
</If>
```

## Loop / Break

Bounded iteration with optional early exit.

```tsx
import { Loop, Break, useRuntimeVar, runtimeFn } from 'react-agentic';

<Loop max={5}>
  <Retry.Call args={{}} output={result} />
  <If condition={result.success}>
    <Break message="Success - exiting retry loop" />
  </If>
</Loop>
```

### Loop Props

| Prop | Type | Description |
|------|------|-------------|
| `max` | `OrRuntimeVar<number>` | Maximum iterations (required) |
| `counter` | `RuntimeVarProxy<number>` | Optional variable for iteration count |
| `children` | `ReactNode` | Loop body |

### Break Props

| Prop | Type | Description |
|------|------|-------------|
| `message` | `OrRuntimeVar<string>` | Optional message when breaking |

### Counter Variable

Track the current iteration:

```tsx
const i = useRuntimeVar<number>('I');

<Loop max={3} counter={i}>
  <p>Attempt {i} of 3</p>
  <Retry.Call args={{ attempt: i }} output={result} />
</Loop>
```

## Return

Exit the command early with an optional status.

```tsx
import { Return } from 'react-agentic';

<If condition={ctx.alreadyExists}>
  <Return status="SUCCESS" message="Already initialized" />
</If>
```

### Return Props

| Prop | Type | Description |
|------|------|-------------|
| `status` | `OrRuntimeVar<ReturnStatus>` | Exit status |
| `message` | `OrRuntimeVar<string>` | Optional message |

### Status Values

| Status | Use Case |
|--------|----------|
| `SUCCESS` | Task completed successfully |
| `ERROR` | Task failed with error |
| `BLOCKED` | Cannot proceed, needs intervention |
| `NOT_FOUND` | Required resource not found |
| `CHECKPOINT` | Partial progress saved |

```tsx
<If condition={ctx.criticalError}>
  <Return status="ERROR" message={ctx.criticalError} />
</If>

<If condition={ctx.missingDependency}>
  <Return status="BLOCKED" message="Install dependencies first" />
</If>
```

## AskUser

Prompt the user for input during command execution.

```tsx
import { AskUser, useRuntimeVar } from 'react-agentic';

const dbChoice = useRuntimeVar<string>('DB_CHOICE');

<AskUser
  question="Which database should we use?"
  header="Database"
  options={[
    { value: 'postgres', label: 'PostgreSQL (Recommended)', description: 'Best for production' },
    { value: 'sqlite', label: 'SQLite', description: 'Good for development' },
  ]}
  output={dbChoice}
/>

<If condition={dbChoice === 'postgres'}>
  <p>Setting up PostgreSQL...</p>
</If>
```

### AskUser Props

| Prop | Type | Description |
|------|------|-------------|
| `question` | `OrRuntimeVar<string>` | Question to display |
| `options` | `AskUserOption[]` | Available choices (2-4 options) |
| `output` | `RuntimeVarProxy<string>` | Variable to store response |
| `header` | `OrRuntimeVar<string>` | Short label/chip (max 12 chars) |
| `multiSelect` | `OrRuntimeVar<boolean>` | Allow multiple selections |

### Option Structure

```tsx
interface AskUserOption {
  value: string;      // Internal value stored
  label: string;      // Display text
  description?: string;  // Optional explanation
}
```

### Multi-Select

When `multiSelect` is true, the output contains comma-separated values:

```tsx
const features = useRuntimeVar<string>('FEATURES');

<AskUser
  question="Which features do you want?"
  multiSelect={true}
  options={[
    { value: 'auth', label: 'Authentication' },
    { value: 'api', label: 'REST API' },
    { value: 'db', label: 'Database' },
  ]}
  output={features}
/>
```

## Complete Example

```tsx
import {
  Command,
  useRuntimeVar,
  runtimeFn,
  If,
  Else,
  Loop,
  Break,
  Return,
  AskUser,
} from 'react-agentic';

interface SetupResult {
  success: boolean;
  error?: string;
}

async function setupProject(args: { db: string }): Promise<SetupResult> {
  // Implementation
}

const Setup = runtimeFn(setupProject);

export default (
  <Command name="init" description="Initialize project">
    {() => {
      const dbChoice = useRuntimeVar<string>('DB');
      const result = useRuntimeVar<SetupResult>('RESULT');
      const attempt = useRuntimeVar<number>('ATTEMPT');

      return (
        <>
          <h2>Project Initialization</h2>

          <AskUser
            question="Which database?"
            header="Database"
            options={[
              { value: 'postgres', label: 'PostgreSQL' },
              { value: 'sqlite', label: 'SQLite' },
            ]}
            output={dbChoice}
          />

          <Loop max={3} counter={attempt}>
            <p>Setup attempt {attempt}...</p>
            <Setup.Call args={{ db: dbChoice }} output={result} />

            <If condition={result.success}>
              <Break message="Setup complete" />
            </If>
          </Loop>

          <If condition={result.error}>
            <Return status="ERROR" message={result.error} />
          </If>

          <p>Project initialized with {dbChoice}</p>
        </>
      );
    }}
  </Command>
);
```

## See Also

- [Runtime System](./runtime.md) - useRuntimeVar and runtimeFn
- [Command](./command.md) - Building slash commands
- [Agent](./agent.md) - Building spawnable agents
