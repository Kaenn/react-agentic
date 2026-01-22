# Agent

Agents are specialized workers that can be spawned by commands using `Task()`. They run in isolated context and return results to the caller.

## Basic Structure

```tsx
import { Agent, Markdown, XmlBlock } from '../jsx.js';

export interface MyAgentInput {
  // Define expected input shape
}

export default function MyAgent() {
  return (
    <Agent<MyAgentInput>
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
| `TInput` | generic | | TypeScript interface for input validation |

## Example: Test Runner Agent

An agent that runs tests and reports results:

```tsx
import { Agent, XmlBlock, Markdown } from '../jsx.js';

/**
 * Input contract for test-runner agent
 */
export interface TestRunnerInput {
  testPath?: string;
  coverage?: boolean;
  watch?: boolean;
}

export default function TestRunnerAgent() {
  return (
    <Agent<TestRunnerInput>
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

The generic type parameter defines the expected input shape:

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

## Structured Returns

Agents should return structured results that the calling command can parse:

```markdown
## SUCCESS_KEYWORD

Structured data here...

## FAILURE_KEYWORD

What went wrong and options to proceed...
```

This allows the orchestrating command to handle different outcomes.

## Tips

1. **Define clear input contracts** — Document what parameters you expect
2. **Use structured returns** — Makes parsing results predictable
3. **Include role section** — Helps Claude understand its purpose
4. **Export the interface** — Allows type-safe spawning from commands
