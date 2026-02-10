# Composites

Composites are user-definable convenience wrappers that combine primitives into reusable patterns. Unlike primitives (which are compiler-owned), composites are TypeScript components you can import, copy, and modify.

## What are Composites?

Composites wrap primitive components to provide enhanced behavior and reduce boilerplate. They're regular TypeScript functions that return primitive component trees — no special compiler magic required.

**Key characteristics:**

- **User-definable:** Copy source code and modify for your needs
- **Type-safe:** Full TypeScript support with exported props interfaces
- **Composable:** Combine multiple primitives into higher-level abstractions
- **Optional:** Use them for convenience, or use primitives directly

Think of composites as "batteries included" versions of common patterns. They're shipping examples you can use as-is or customize.

## Import

```tsx
import { IfElseBlock, DataTable, SpawnAgentWithRetry } from 'react-agentic/composites';
```

## Built-in Composites

| Component | Purpose | Based On |
|-----------|---------|----------|
| `IfElseBlock` | Unified conditional with then/otherwise | `If` + `Else` |
| `LoopWithBreak` | Loop with inline break condition | `Loop` + `If` + `Break` |
| `SpawnAgentWithRetry` | Agent spawn with automatic retry | `SpawnAgent` + `Loop` + `If` |
| `StepSection` | Step with description and substeps | Markdown formatting |
| `DataTable` | Table with caption and empty state | `Table` |
| `BulletList` | List with title header | `List` |
| `FileContext` | ExecutionContext with title | `ExecutionContext` |

## Common Patterns

### 1. Conditional Wrapper Pattern

Wrap content conditionally based on runtime state. This pattern unifies If/Else into a single component API.

```tsx
import { IfElseBlock } from 'react-agentic/composites';
import { useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ error?: string }>('CTX');

<IfElseBlock
  condition={ctx.error}
  then={<p>Error: {ctx.error}</p>}
  otherwise={<p>Success!</p>}
/>
```

Emits:

```markdown
**If `$CTX.error` is truthy:**

Error: $CTX.error

**Otherwise:**

Success!
```

**Why this pattern?** Reduces nesting when you have simple if/else logic. Compare to the primitive approach:

```tsx
// Primitive approach (more verbose)
<If condition={ctx.error}>
  <p>Error: {ctx.error}</p>
</If>
<Else>
  <p>Success!</p>
</Else>
```

### 2. Repeated Section Pattern

Render structured content for each item in a collection. This pattern adds presentation enhancements to data-driven components.

```tsx
import { DataTable } from 'react-agentic/composites';

interface TestResult {
  name: string;
  status: 'pass' | 'fail';
  duration: number;
}

const results: TestResult[] = [
  { name: 'Auth flow', status: 'pass', duration: 1.2 },
  { name: 'API endpoints', status: 'pass', duration: 3.4 },
];

<DataTable
  caption="Test Results"
  headers={["Test", "Status", "Duration (s)"]}
  rows={results.map(r => [r.name, r.status, r.duration.toFixed(1)])}
  align={["left", "center", "right"]}
  emptyMessage="No tests run"
/>
```

Emits:

```markdown
**Test Results**

| Test | Status | Duration (s) |
| :--- | :---: | ---: |
| Auth flow | pass | 1.2 |
| API endpoints | pass | 3.4 |
```

When `results` is empty, emits:

```markdown
*No tests run*
```

**Why this pattern?** Adds common table features (caption, empty state) without reimplementing them. Compare to primitive:

```tsx
// Primitive approach (no empty state handling)
<p><b>Test Results</b></p>
<Table
  headers={["Test", "Status", "Duration (s)"]}
  rows={results.map(r => [r.name, r.status, r.duration.toFixed(1)])}
  align={["left", "center", "right"]}
/>
```

### 3. Enhanced Behavior Pattern

Add common enhancements like retry logic, validation, or formatting.

```tsx
import { SpawnAgentWithRetry } from 'react-agentic/composites';
import { useRuntimeVar } from 'react-agentic';
import type { BaseOutput } from 'react-agentic';

interface AnalysisInput {
  filePath: string;
}

interface AnalysisOutput extends BaseOutput {
  issues: string[];
}

const analysisOutput = useRuntimeVar<AnalysisOutput>('ANALYSIS');

<SpawnAgentWithRetry
  agent="code-analyzer"
  input={{ filePath: "src/index.ts" }}
  output={analysisOutput}
  maxRetries={3}
  retryWhen={analysisOutput.status === 'ERROR'}
/>
```

Emits:

```markdown
**Repeat up to 3 times:**

Spawn agent: code-analyzer

Input:
```json
{
  "filePath": "src/index.ts"
}
```

Store output in: $ANALYSIS

**If `$ANALYSIS.status === 'ERROR'` is truthy:**

(continue loop)

**Otherwise:**

(exit loop - Success - analysis complete)
```

**Why this pattern?** Retry logic is common for flaky operations. The composite encapsulates Loop + If + Break so you don't repeat it.

### 4. RuntimeVar Prop Forwarding Pattern

Forward RuntimeVar references through component props to runtime primitives. The command declares RuntimeVars; the composite receives and forwards them.

```tsx
// components/agent-spawn-block.tsx
import { SpawnAgent } from 'react-agentic';

const AgentSpawnBlock = ({ agent, model, description, prompt, output, label }) => (
  <>
    <p>Spawning {label} agent...</p>
    <SpawnAgent
      agent={agent}
      model={model}
      description={description}
      input={{ prompt }}
      output={output}
    />
  </>
);

export default AgentSpawnBlock;
```

Usage in a command:

```tsx
import AgentSpawnBlock from './components/agent-spawn-block';

const ctx = useRuntimeVar<Context>('CTX');
const agentOutput = useRuntimeVar<string>('AGENT_OUTPUT');
const prompt = useRuntimeVar<{ prompt: string }>('PROMPT');

<AgentSpawnBlock
  agent="code-reviewer"
  model={ctx.models.reviewer}
  description={`Review Phase ${ctx.phaseId}`}
  prompt={prompt.prompt}
  output={agentOutput}
  label="reviewer"
/>
```

The component itself doesn't call `useRuntimeVar` — it receives RuntimeVar proxy references as props and passes them through to `SpawnAgent`. The compiler resolves the original expressions at build time.

Components **can** declare their own `runtimeFn()` wrappers. Import paths are resolved relative to the component's file, so `RuntimeFn.Call` works inside external components.

**This works with:** `SpawnAgent`, `RuntimeFn.Call`, `AskUser`, `If`/`Else` conditions, and text interpolation.

**Limitation:** Array props (like `AskUser` options) and static string props (`question`, `header`) are not yet forwarded through components. Keep those inline.

## Creating Your Own Composite

Composites are just TypeScript functions. Here's a simple example:

```tsx
import type { ReactNode } from 'react';
import { Markdown } from 'react-agentic';

interface AlertBoxProps {
  type: 'warning' | 'info' | 'error';
  children: ReactNode;
}

export const AlertBox = ({ type, children }: AlertBoxProps): ReactNode => {
  const emoji = type === 'warning' ? '⚠️' : type === 'error' ? '🚫' : 'ℹ️';
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <>
      <p><b>{emoji} {label}</b></p>
      <blockquote>
        {children}
      </blockquote>
    </>
  );
};
```

Usage:

```tsx
<AlertBox type="warning">
  <p>This action cannot be undone.</p>
</AlertBox>
```

Emits:

```markdown
**⚠️ Warning**

> This action cannot be undone.
```

### Steps to Create a Composite

1. **Identify a pattern** you're repeating across commands
2. **Define props interface** with exported TypeScript types
3. **Return primitive components** composed together
4. **Export from your codebase** (or submit to react-agentic/composites)

### Copy and Modify Built-in Composites

All built-in composites are in `src/composites/`. Copy the source to your project and customize:

```bash
# Copy IfElseBlock to your project
cp node_modules/react-agentic/src/composites/IfElseBlock.tsx src/components/
```

Then modify the copy for your specific needs. Composites are designed to be forked.

## See Also

- [Primitives](./primitives.md) - Core compiler-owned components
- [Structured Components](./structured-components.md) - Table and List primitives
- [Control Flow](./control-flow.md) - If, Else, Loop, Break primitives
