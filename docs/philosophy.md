# Philosophy

react-agentic is built on a clear separation between **compile-time** and **runtime** concerns. Understanding this distinction is key to using the framework effectively.

## The Core Insight

Claude Code commands are **markdown files with instructions**. They tell Claude what to do, but Claude executes them—not your code. This creates a unique challenge: how do you get TypeScript's type safety and developer experience while ultimately producing static text?

The answer: **compile everything you can, defer what you must**.

## Build-Time vs Runtime

### Build-Time (Compilation)

At build time, your TSX is transformed into markdown. This happens on your machine, before Claude ever sees the command.

**What happens at build time:**
- TSX parsing and transformation
- Type checking
- Component rendering to IR nodes
- Markdown emission
- Static content generation

**Build-time components:**
```tsx
// These are fully resolved at build time
<Command name="deploy" description="Deploy app">
  <XmlBlock name="objective">
    <p>Deploy the application to production</p>
  </XmlBlock>
  <Table headers={["Step", "Action"]} rows={[["1", "Build"], ["2", "Push"]]} />
</Command>
```

The output is pure markdown—no code runs when Claude executes the command.

### Runtime (Execution)

Runtime is when Claude actually runs your command. Sometimes you need code to execute at this point—checking files, calling APIs, processing data.

**What happens at runtime:**
- TypeScript functions execute in Node.js
- Results are captured in shell variables
- Claude uses results for conditional logic

**Runtime components:**
```tsx
// These execute when Claude runs the command
const Check = runtimeFn(checkProjectExists);
const result = useRuntimeVar<CheckResult>('RESULT');

<Check.Call args={{ path: "." }} output={result} />
<If condition={result.exists}>
  <p>Project found</p>
</If>
```

## The Two-Phase Model

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR MACHINE (Build Time)                                  │
│                                                             │
│  my-command.tsx                                             │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TSX Compiler                                        │   │
│  │  - Parse components                                  │   │
│  │  - Type check                                        │   │
│  │  - Extract runtime functions                         │   │
│  │  - Generate markdown                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│       │                                                     │
│       ▼                                                     │
│  .claude/commands/my-command.md  +  my-command.runtime.js   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE CODE (Runtime)                                      │
│                                                             │
│  1. User types: /my-command                                 │
│  2. Claude reads my-command.md                              │
│  3. Claude executes instructions                            │
│  4. When runtime code needed:                               │
│     - Claude runs: node my-command.runtime.js functionName  │
│     - Result stored in shell variable                       │
│  5. Claude uses result for conditionals                     │
└─────────────────────────────────────────────────────────────┘
```

## Why This Matters

### Type Safety Across the Boundary

The genius of this model is that TypeScript validates both sides:

```tsx
interface ProjectInfo {
  name: string;
  version: string;
  hasTests: boolean;
}

// Build-time: TypeScript validates the function signature
async function getProjectInfo(args: { path: string }): Promise<ProjectInfo> {
  // ... implementation
}

const GetInfo = runtimeFn(getProjectInfo);

// Build-time: TypeScript validates the RuntimeVar type matches
const info = useRuntimeVar<ProjectInfo>('INFO');

// Build-time: TypeScript validates property access
<If condition={info.hasTests}>     // ✓ 'hasTests' exists on ProjectInfo
  <p>Found {info.name}</p>         // ✓ 'name' exists on ProjectInfo
  <p>Count: {info.count}</p>       // ✗ Error: 'count' doesn't exist
</If>
```

Even though `info.hasTests` won't be evaluated until runtime, TypeScript catches the error at build time.

### Separation of Concerns

| Concern | Build-Time | Runtime |
|---------|------------|---------|
| **Content** | Markdown structure, XML sections | Dynamic values |
| **Logic** | Component composition | Conditional execution |
| **Data** | Static tables, lists | API calls, file reads |
| **Validation** | Type checking | Actual execution |

## Component Categories

### Pure Build-Time Components

These produce static output with no runtime behavior:

| Component | Output |
|-----------|--------|
| `<Command>` | Frontmatter + content |
| `<Agent>` | Frontmatter + content |
| `<Markdown>` | Raw markdown |
| `<XmlBlock>` | XML-wrapped section |
| `<Table>` | Markdown table |
| `<List>` | Markdown list |
| `<ExecutionContext>` | @ file references |

### Runtime-Aware Components

These generate markdown that references runtime values:

| Component | Behavior |
|-----------|----------|
| `useRuntimeVar<T>()` | Declares variable, tracks property access |
| `runtimeFn()` | Wraps function for extraction |
| `<Fn.Call>` | Emits function invocation |
| `<If condition={var}>` | Emits conditional based on runtime value |
| `<AskUser>` | Prompts user, stores response |

### Hybrid Components

These can work with both static and runtime values:

| Component | Static | Runtime |
|-----------|--------|---------|
| `<If>` | `condition={true}` | `condition={ctx.error}` |
| `<Loop>` | `max={5}` | `max={ctx.retryCount}` |
| `<Return>` | `status="SUCCESS"` | `status={ctx.status}` |

## Design Principles

### 1. Prefer Build-Time

If something can be determined at build time, it should be. This makes commands:
- Faster (no runtime overhead)
- Simpler (just markdown)
- Debuggable (you can read the output)

```tsx
// Good: Static content
<Table headers={["Status", "Meaning"]} rows={[
  ["SUCCESS", "Operation completed"],
  ["ERROR", "Operation failed"],
]} />

// Unnecessary runtime: Don't do this
const statuses = useRuntimeVar<string[]>('STATUSES');
<GetStatuses.Call output={statuses} />
// Then trying to render statuses at runtime
```

### 2. Runtime for External State

Use runtime when you need information that only exists at execution time:

- File system state (does file exist?)
- API responses (what's the current status?)
- User input (what did they choose?)
- Environment (what's the current directory?)

```tsx
// Good: Runtime for external state
async function checkGitStatus(args: {}): Promise<{ clean: boolean }> {
  const { execSync } = await import('child_process');
  const status = execSync('git status --porcelain').toString();
  return { clean: status.trim() === '' };
}
```

### 3. Type the Boundary

Always define interfaces for runtime data. This is where bugs hide:

```tsx
// Good: Explicit interface
interface DeployResult {
  success: boolean;
  url?: string;
  error?: string;
}

const result = useRuntimeVar<DeployResult>('DEPLOY');

// Bad: Untyped
const result = useRuntimeVar<any>('DEPLOY');  // No type safety
```

### 4. Keep Runtime Functions Pure

Runtime functions should be focused and side-effect free (when possible):

```tsx
// Good: Pure function, returns data
async function analyzePackage(args: { path: string }): Promise<PackageInfo> {
  const pkg = JSON.parse(await readFile(args.path, 'utf-8'));
  return {
    name: pkg.name,
    version: pkg.version,
    hasScripts: !!pkg.scripts,
  };
}

// Avoid: Side effects in runtime function
async function setupProject(args: {}): Promise<void> {
  await mkdir('src');           // Side effect
  await writeFile('index.ts');  // Side effect
  // No useful return value for Claude to use
}
```

Let Claude handle side effects (running commands, writing files). Use runtime functions for **gathering information** that informs Claude's decisions.

## Mental Model

Think of react-agentic as a **smart document generator** with **runtime escape hatches**:

1. **Most of your command** is static markdown generated at build time
2. **When you need dynamic data**, you declare a runtime function
3. **The function extracts to a separate file** that Claude can invoke
4. **Results flow back as typed variables** that conditionals can check

The TypeScript compiler sees everything, ensuring the static and dynamic parts fit together correctly.

## See Also

- [Runtime System](./runtime.md) - useRuntimeVar and runtimeFn details
- [Control Flow](./control-flow.md) - If/Else, Loop with runtime conditions
- [Getting Started](./getting-started.md) - First command walkthrough
