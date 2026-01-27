# Semantic Components

Semantic components emit structured XML sections that follow Claude Code workflow patterns. They provide type-safe ways to author common command/agent patterns.

## ExecutionContext

Emit `<execution_context>` section with @ file references.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `string[]` | Yes | File paths to reference |
| `prefix` | `string` | No | Prefix for paths (default: "@") |

### Basic Usage

```tsx
import { ExecutionContext } from '../jsx.js';

<ExecutionContext paths={[
  "docs/guide.md",
  "src/config.ts",
  ".planning/PROJECT.md"
]} />
```

Emits:

```markdown
<execution_context>
@docs/guide.md
@src/config.ts
@.planning/PROJECT.md
</execution_context>
```

### Custom Prefix

```tsx
<ExecutionContext
  paths={["file1.md", "file2.md"]}
  prefix="→"
/>
```

Emits:

```markdown
<execution_context>
→file1.md
→file2.md
</execution_context>
```

### Why ExecutionContext?

Manually writing file references is error-prone:

```tsx
// Manual approach - typos, inconsistent formatting
<XmlBlock name="execution_context">
  <Markdown>{`@docs/guide.md
@ src/config.ts
.planning/PROJECT.md`}</Markdown>
</XmlBlock>
```

ExecutionContext ensures:
- Consistent prefix application
- No double-prefixing if path already starts with prefix
- Type-safe array of paths

## SuccessCriteria

Emit `<success_criteria>` section with checkbox list.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `string[] \| Array<{text: string, checked?: boolean}>` | Yes | Success criteria items |

### Basic Usage (String Array)

```tsx
import { SuccessCriteria } from '../jsx.js';

<SuccessCriteria items={[
  "Tests pass",
  "Code is linted",
  "Documentation updated"
]} />
```

Emits:

```markdown
<success_criteria>
- [ ] Tests pass
- [ ] Code is linted
- [ ] Documentation updated
</success_criteria>
```

### With Initial Checked State

```tsx
<SuccessCriteria items={[
  { text: "Read input file", checked: true },
  { text: "Process data", checked: false },
  { text: "Write output", checked: false }
]} />
```

Emits:

```markdown
<success_criteria>
- [x] Read input file
- [ ] Process data
- [ ] Write output
</success_criteria>
```

### Dynamic from Data

```tsx
const tasks = ["Setup", "Build", "Deploy"];

<SuccessCriteria items={tasks.map(t => `${t} complete`)} />
```

## OfferNext

Emit `<offer_next>` section with navigation routes.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `routes` | `Array<{name: string, path: string, description?: string}>` | Yes | Available next actions |

### Basic Usage

```tsx
import { OfferNext } from '../jsx.js';

<OfferNext routes={[
  { name: "Continue", path: "/plan-next-phase" },
  { name: "Review", path: "/review-changes" },
  { name: "Deploy", path: "/deploy-now" }
]} />
```

Emits:

```markdown
<offer_next>
- **Continue** (`/plan-next-phase`)
- **Review** (`/review-changes`)
- **Deploy** (`/deploy-now`)
</offer_next>
```

### With Descriptions

```tsx
<OfferNext routes={[
  {
    name: "Accept Plan",
    path: "/execute-plan",
    description: "Begin executing the planned tasks"
  },
  {
    name: "Revise Plan",
    path: "/revise-plan",
    description: "Make changes to the plan before execution"
  }
]} />
```

Emits:

```markdown
<offer_next>
- **Accept Plan** (`/execute-plan`) — Begin executing the planned tasks
- **Revise Plan** (`/revise-plan`) — Make changes to the plan before execution
</offer_next>
```

### Why OfferNext?

Navigation routes should be consistent and discoverable. OfferNext ensures:
- Standardized format (`**name** (/path)`)
- Type-safe route structure
- Optional descriptions for clarity

## XmlSection

Emit custom XML sections with dynamic tag names.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | XML tag name (converted to snake_case) |
| `children` | `ReactNode` | Yes | Section content |

### Basic Usage

```tsx
import { XmlSection } from '../jsx.js';

<XmlSection name="custom_section">
  <p>Content goes here</p>
</XmlSection>
```

Emits:

```markdown
<custom_section>
Content goes here
</custom_section>
```

### Dynamic Tag Names

```tsx
const sectionName = "my_instructions";

<XmlSection name={sectionName}>
  <p>Instructions for this agent</p>
</XmlSection>
```

Emits:

```markdown
<my_instructions>
Instructions for this agent
</my_instructions>
```

### Name Normalization

Tag names are converted to snake_case:

```tsx
<XmlSection name="MyCustomSection">
  <p>Content</p>
</XmlSection>
```

Emits:

```markdown
<my_custom_section>
Content
</my_custom_section>
```

### Comparison with XmlBlock

| Component | Tag Name | Use Case |
|-----------|----------|----------|
| `<XmlBlock name="...">` | Static string literal | Standard sections (objective, process, role) |
| `<XmlSection name={...}>` | Dynamic expression | Computed tag names, variable-driven sections |

## Workflow Wrapper Components

Additional semantic components for specific workflow patterns:

### DeviationRules

Emit `<deviation_rules>` section:

```tsx
import { DeviationRules } from '../jsx.js';

<DeviationRules>
  <p>RULE 1: Auto-fix bugs immediately</p>
  <p>RULE 2: Ask about architectural changes</p>
</DeviationRules>
```

### CommitRules

Emit `<commit_rules>` section:

```tsx
import { CommitRules } from '../jsx.js';

<CommitRules>
  <List items={[
    "Commit after each task",
    "Use conventional commit format",
    "Include file changes in message"
  ]} />
</CommitRules>
```

### WaveExecution

Emit `<wave_execution>` section:

```tsx
import { WaveExecution } from '../jsx.js';

<WaveExecution>
  <p>Execute tasks in parallel waves based on dependencies</p>
</WaveExecution>
```

### CheckpointHandling

Emit `<checkpoint_handling>` section:

```tsx
import { CheckpointHandling } from '../jsx.js';

<CheckpointHandling>
  <p>Pause at checkpoints for user verification</p>
</CheckpointHandling>
```

These components are thin wrappers around `<XmlBlock>` with fixed tag names for common workflow sections.

## Step

Emit numbered workflow steps with variant formatting.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | `string` | Yes | Step name/title |
| `number` | `number` | Yes | Step number |
| `variant` | `'heading' \| 'bold' \| 'xml'` | No | Output format (default: 'heading') |
| `children` | `ReactNode` | Yes | Step content |

### Heading Variant (Default)

```tsx
import { Step } from '../jsx.js';

<Step name="Setup" number={1}>
  <p>Install dependencies and configure environment</p>
</Step>
```

Emits:

```markdown
## 1. Setup

Install dependencies and configure environment
```

### Bold Variant

```tsx
<Step name="Execute" number={2} variant="bold">
  <p>Run the build command</p>
</Step>
```

Emits:

```markdown
**Step 2: Execute**

Run the build command
```

### XML Variant

```tsx
<Step name="Verify" number={3} variant="xml">
  <p>Check output files exist</p>
</Step>
```

Emits:

```markdown
<step name="Verify" number="3">
Check output files exist
</step>
```

### Complete Process Example

```tsx
import { Command, Step, List } from '../jsx.js';

export default function DeployCommand() {
  return (
    <Command name="deploy" description="Deploy application">
      <Step name="Pre-flight Checks" number={1}>
        <List items={[
          "Verify git status clean",
          "Check environment variables",
          "Run tests"
        ]} />
      </Step>

      <Step name="Build" number={2}>
        <p>Compile production build:</p>
        <pre><code className="language-bash">npm run build</code></pre>
      </Step>

      <Step name="Deploy" number={3}>
        <p>Upload to production:</p>
        <pre><code className="language-bash">npm run deploy</code></pre>
      </Step>

      <Step name="Verify" number={4}>
        <List items={[
          "Check deployment status",
          "Verify endpoints responding",
          "Monitor error logs"
        ]} />
      </Step>
    </Command>
  );
}
```

## Loop

Emit prose-based iteration pattern for processing arrays.

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `items` | `T[]` | Yes | Array to iterate over |
| `as` | `string` | Yes | Variable name for current item |
| `children` | `ReactNode` | Yes | Content to emit for each iteration |

### Usage

```tsx
import { Loop, List } from '../jsx.js';

const files = ["auth.ts", "user.ts", "db.ts"];

<Loop items={files} as="file">
  <p>Process {`{file}`}:</p>
  <List items={[
    "Read source code",
    "Run type checking",
    "Generate documentation"
  ]} />
</Loop>
```

Emits:

```markdown
**For each file in files:**

Process {file}:

- Read source code
- Run type checking
- Generate documentation
```

The `{file}` placeholder is emitted literally for Claude to interpret during execution.

### Why Semantic Components?

1. **Type Safety:** Props are strongly typed, preventing errors at build time
2. **Consistency:** Standard output format across all commands/agents
3. **Reusability:** Common patterns extracted into reusable components
4. **Discoverability:** Import autocomplete shows available options
5. **Maintainability:** Update component once, all usages benefit

### Manual vs Semantic

| Approach | Pros | Cons |
|----------|------|------|
| Manual `<XmlBlock>` | Maximum flexibility | Error-prone, inconsistent |
| Semantic components | Type-safe, consistent | Fixed format |

**Recommendation:** Use semantic components when available, fall back to `<XmlBlock>` for one-off custom sections.
