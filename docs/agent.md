# Agent

Agents are specialized workers that can be spawned by commands using `Task()`. They run in isolated context and return results to the caller.

## Basic Structure

```tsx
import { Agent, Markdown, XmlBlock, BaseOutput } from 'react-agentic';

export interface MyAgentInput {
  // Define expected input shape
}

export interface MyAgentOutput extends BaseOutput {
  // Define output shape (extends required BaseOutput)
}

export default function MyAgent() {
  return (
    <Agent<MyAgentInput, MyAgentOutput>
      name="my-agent"
      description="What this agent does"
      tools="Read, Write, Bash"
      color="cyan"
    >
      {/* Agent instructions */}
    </Agent>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | ✓ | Agent identifier (used in `subagent_type`) |
| `description` | string | ✓ | Agent purpose |
| `tools` | string | | Space-separated tool names |
| `color` | string | | Terminal output color |
| `folder` | string | | Subfolder for namespacing |
| `TInput` | generic | | TypeScript interface for input contract |
| `TOutput` | generic | | TypeScript interface for output contract (must extend `BaseOutput`) |

## Example: Test Runner Agent

An agent that runs tests and reports results:

```tsx
import { Agent, XmlBlock, Markdown, BaseOutput } from 'react-agentic';

/**
 * Input contract for test-runner agent
 */
export interface TestRunnerInput {
  testPath?: string;
  coverage?: boolean;
  watch?: boolean;
}

/**
 * Output contract for test-runner agent
 * Must extend BaseOutput to include required status field
 */
export interface TestRunnerOutput extends BaseOutput {
  // SUCCESS fields
  passed?: number;
  failed?: number;
  skipped?: number;
  coverage?: number;
  duration?: string;
  // FAILED fields
  failures?: Array<{ test: string; file: string; line: number; error: string }>;
}

export default function TestRunnerAgent() {
  return (
    <Agent<TestRunnerInput, TestRunnerOutput>
      name="test-runner"
      description="Runs tests and reports results with optional coverage"
      tools="Bash, Read, Grep"
      color="yellow"
    >
      <XmlBlock name="role">
        <Markdown>{`You are a test runner agent.

Your job:
- Run the test suite for the project
- Parse and summarize test results
- Report failures with file:line references
- Optionally generate coverage reports

You are spawned by commands that need test validation.`}</Markdown>
      </XmlBlock>

      <XmlBlock name="input_contract">
        <Markdown>{`You receive these parameters in your prompt:

| Parameter | Type | Description |
|-----------|------|-------------|
| testPath | string? | Specific test file or directory |
| coverage | boolean? | Generate coverage report |
| watch | boolean? | Run in watch mode |`}</Markdown>
      </XmlBlock>

      <XmlBlock name="execution">
        <Markdown>{`## 1. Detect Test Framework

\`\`\`bash
# Check for test runners
cat package.json | grep -E "(jest|vitest|mocha|pytest)"
\`\`\`

## 2. Run Tests

**For Jest/Vitest:**
\`\`\`bash
npm test -- --reporter=verbose {testPath}
\`\`\`

**For pytest:**
\`\`\`bash
pytest -v {testPath}
\`\`\`

Add \`--coverage\` if coverage requested.

## 3. Parse Results

Extract from output:
- Total tests run
- Passed / Failed / Skipped counts
- Failed test names and locations
- Coverage percentage (if requested)

## 4. Report Failures

For each failure:
\`\`\`
❌ test_name (file:line)
   Expected: X
   Received: Y
\`\`\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="structured_returns">
        <Markdown>{`## Tests Passed

\`\`\`markdown
## TESTS PASSED

**Summary:** 42 passed, 0 failed, 2 skipped
**Coverage:** 87% (if requested)
**Duration:** 3.2s

All tests passing. Ready to proceed.
\`\`\`

## Tests Failed

\`\`\`markdown
## TESTS FAILED

**Summary:** 40 passed, 2 failed, 0 skipped

### Failures

1. **should validate email format** (src/validators.test.ts:45)
   - Expected: true
   - Received: false

2. **should handle empty input** (src/parser.test.ts:23)
   - Error: Cannot read property 'length' of undefined

### Suggested Fixes

- validators.test.ts:45 → Check regex pattern in validateEmail()
- parser.test.ts:23 → Add null check before accessing input.length
\`\`\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <Markdown>{`- [ ] Test framework detected
- [ ] Tests executed successfully
- [ ] Results parsed and summarized
- [ ] Failures reported with locations
- [ ] Coverage included (if requested)
- [ ] Structured return provided`}</Markdown>
      </XmlBlock>
    </Agent>
  );
}
```

## Output

This compiles to `.claude/agents/test-runner.md`:

```markdown
---
name: test-runner
description: Runs tests and reports results with optional coverage
tools: Bash, Read, Grep
color: yellow
---

<role>
You are a test runner agent.
...
</role>

<input_contract>
You receive these parameters in your prompt:
...
</input_contract>

<execution>
## 1. Detect Test Framework
...
</execution>

<structured_returns>
## Tests Passed
...
</structured_returns>

<success_criteria>
- [ ] Test framework detected
...
</success_criteria>
```

## Input Interface

The first generic type parameter (`TInput`) defines the expected input shape:

```tsx
export interface TestRunnerInput {
  testPath?: string;
  coverage?: boolean;
  watch?: boolean;
}

<Agent<TestRunnerInput> ...>
```

This enables:
1. **Documentation** — Clear contract for what the agent expects
2. **Type Safety** — Compile-time validation when used with `SpawnAgent`
3. **Cross-file Validation** — Commands importing the type get autocomplete

## Output Interface

The second generic type parameter (`TOutput`) defines the agent's return structure. Output interfaces **must extend `BaseOutput`** which provides standard status codes.

### BaseOutput and AgentStatus

```tsx
import { BaseOutput, AgentStatus } from 'react-agentic';

// AgentStatus is a union of standard status codes:
type AgentStatus =
  | 'SUCCESS'      // Agent completed task successfully
  | 'BLOCKED'      // Agent cannot proceed, needs external input
  | 'NOT_FOUND'    // Requested resource not found
  | 'ERROR'        // Agent encountered an error
  | 'CHECKPOINT';  // Agent reached milestone, pausing

// BaseOutput requires status and optional message:
interface BaseOutput {
  status: AgentStatus;
  message?: string;
}
```

### Defining Output Contracts

Extend `BaseOutput` with your agent's specific fields:

```tsx
export interface AnalyzerOutput extends BaseOutput {
  // SUCCESS-specific fields
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  findings?: string[];
  metrics?: { linesAnalyzed: number; issuesFound: number };

  // BLOCKED-specific fields
  blockedBy?: string;
  options?: string[];

  // NOT_FOUND-specific fields
  searchedPaths?: string[];
}
```

### Auto-Generated Structured Returns

When you provide a `TOutput` type parameter, the compiler **automatically generates** a `<structured_returns>` section in the output markdown. This section:

1. Documents all status codes the agent can return
2. Generates a YAML template showing all interface properties with type hints
3. Provides a structured format for orchestrators to parse

**Example agent definition:**

```tsx
export interface ResearcherOutput extends BaseOutput {
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  findings?: string[];
  filePath?: string;
  blockedBy?: string;
}

<Agent<ResearcherInput, ResearcherOutput>
  name="researcher"
  description="Research topics"
  tools="Read Grep WebSearch"
>
  {/* Agent instructions */}
</Agent>
```

**Auto-generated output section:**

```markdown
<structured_returns>
## Return Format

Return your results as YAML matching this schema:

\`\`\`yaml
status: SUCCESS | BLOCKED | NOT_FOUND | ERROR | CHECKPOINT
message: "..."  # optional
confidence: <HIGH | MEDIUM | LOW>  # optional
findings: [...]  # optional
filePath: "..."  # optional
blockedBy: "..."  # optional
\`\`\`

## Status Codes

- **SUCCESS**: Task completed successfully
- **BLOCKED**: Cannot proceed, needs external input
- **NOT_FOUND**: Requested resource not found
- **ERROR**: Encountered an error
- **CHECKPOINT**: Reached milestone, pausing
</structured_returns>
```

### Manual vs Auto-Generated

| Approach | When to Use |
|----------|-------------|
| Auto-generated (with `TOutput`) | Standard agents with predictable outputs |
| Manual `<XmlBlock name="structured_returns">` | Complex agents needing custom documentation |
| Both | Not recommended (manual takes precedence) |

> **Backward Compatibility:** Agents without `TOutput` work exactly as before. No `<structured_returns>` section is generated.

## Structured Returns

Agents should return structured results that the calling command can parse:

```markdown
## SUCCESS_KEYWORD

Structured data here...

## FAILURE_KEYWORD

What went wrong and options to proceed...
```

This allows the orchestrating command to handle different outcomes.

## Render Props Pattern

Agents support a render props pattern for accessing agent context within the component body:

```tsx
import { Agent, BaseOutput } from 'react-agentic';

interface MyInput {
  task: string;
}

interface MyOutput extends BaseOutput {
  result?: string;
}

export default function MyAgent() {
  return (
    <Agent<MyInput, MyOutput>
      name="worker"
      description="Demonstrates render props"
      tools="Read, Write"
    >
      {(ctx) => (
        <>
          <p>Agent name: {ctx.name}</p>
          <p>Description: {ctx.description}</p>
          <p>Available tools: {ctx.tools?.join(', ')}</p>
          <p>Model: {ctx.model}</p>
          <p>Output path: {ctx.outputPath}</p>
        </>
      )}
    </Agent>
  );
}
```

### Available Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Agent name (from name prop) |
| `description` | `string` | Agent description (from description prop) |
| `outputPath` | `string` | Absolute path where markdown will be written |
| `sourcePath` | `string` | Absolute path to the source .tsx file |
| `tools` | `string[] \| undefined` | Parsed array of tool names |
| `model` | `string \| undefined` | Model name if specified |
| `skill` | `string \| undefined` | Skill name if using skill system |

### Agent-Specific Properties

Agents extend the command context with:

- **`tools`**: Automatically parsed from space-separated string into array
- **`model`**: Optional model override for this agent

### Use Cases

**Tool-dependent instructions:**

```tsx
<Agent name="analyzer" description="Analyzes code" tools="Read, Grep, Bash">
  {(ctx) => {
    const hasGrep = ctx.tools?.includes('Grep');
    return (
      <>
        {hasGrep ? (
          <p>Use Grep for efficient code search</p>
        ) : (
          <p>Use Read to examine files</p>
        )}
      </>
    );
  }}
</Agent>
```

**Dynamic documentation based on agent name:**

```tsx
<Agent name="test-runner" description="Runs tests">
  {(ctx) => (
    <>
      <p>You are the {ctx.name} agent.</p>
      <p>Your markdown output: {ctx.outputPath}</p>
    </>
  )}
</Agent>
```

**Note:** The render props pattern is optional. Standard JSX children work exactly as before:

```tsx
<Agent name="simple" description="Standard approach">
  <p>Direct children work fine</p>
</Agent>
```

## Tips

1. **Define clear input contracts** — Document what parameters you expect
2. **Define output contracts** — Use `TOutput` for auto-generated structured returns
3. **Extend BaseOutput** — Required for output interfaces
4. **Use structured returns** — Makes parsing results predictable
5. **Include role section** — Helps Claude understand its purpose
6. **Export interfaces** — Allows type-safe spawning from commands
