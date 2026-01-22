# Conditionals

Conditionals let you express decision logic in your commands and agents using `<If>` and `<Else>` components. They emit prose-based markdown patterns that guide Claude's execution flow.

## Basic Structure

```tsx
import { Command, If, Else, Assign, useVariable } from '../jsx.js';

const fileExists = useVariable("FILE_EXISTS", {
  bash: `[ -f config.json ] && echo "true" || echo "false"`
});

export default function MyCommand() {
  return (
    <Command name="my-command" description="Uses conditionals">
      <Assign var={fileExists} />

      <If test="[ $FILE_EXISTS = 'true' ]">
        <p>Configuration found. Loading settings.</p>
      </If>
      <Else>
        <p>No configuration. Using defaults.</p>
      </Else>
    </Command>
  );
}
```

## Output Format

Conditionals emit as prose-based markdown:

```markdown
**If [ $FILE_EXISTS = 'true' ]:**

Configuration found. Loading settings.

**Otherwise:**

No configuration. Using defaults.
```

This format is readable by both humans and Claude, guiding execution flow without requiring actual shell conditionals.

## If Component

Defines a conditional block with a test expression.

```tsx
<If test="[ -d .git ]">
  <p>Git repository detected.</p>
</If>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `test` | string | Yes | Shell test expression or condition |
| `children` | ReactNode | Yes | Content to emit when condition is true |

### Test Expressions

The `test` prop accepts any shell-compatible test expression:

```tsx
// File tests
<If test="[ -f config.json ]">...</If>      // File exists
<If test="[ -d .git ]">...</If>             // Directory exists
<If test="[ -z $VAR ]">...</If>             // Variable is empty
<If test="[ -n $VAR ]">...</If>             // Variable is not empty

// String comparisons
<If test="[ $STATUS = 'ready' ]">...</If>   // Equal
<If test="[ $STATUS != 'error' ]">...</If>  // Not equal

// Variable interpolation
<If test="[ -f $CONFIG_PATH ]">...</If>     // Using variable
```

## Else Component

Provides alternative content when the preceding `<If>` condition is false.

```tsx
<If test="[ -f package.json ]">
  <p>Node.js project detected.</p>
</If>
<Else>
  <p>Not a Node.js project.</p>
</Else>
```

### Rules

1. `<Else>` must immediately follow `</If>` (whitespace allowed)
2. `<Else>` without a preceding `<If>` causes a compile error
3. `<If>` can exist without `<Else>` (single conditional)

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | ReactNode | Yes | Content to emit when condition is false |

## Nested Conditionals

`<If>` blocks can be nested within `<Else>` for complex decision trees:

```tsx
<If test="[ $ENV = 'production' ]">
  <p>Production deployment. Running full validation.</p>
</If>
<Else>
  <p>Non-production environment.</p>

  <If test="[ $ENV = 'staging' ]">
    <p>Staging deployment. Running smoke tests.</p>
  </If>
</Else>
```

Output:

```markdown
**If [ $ENV = 'production' ]:**

Production deployment. Running full validation.

**Otherwise:**

Non-production environment.

**If [ $ENV = 'staging' ]:**

Staging deployment. Running smoke tests.
```

## Variable Integration

Combine conditionals with `useVariable` and `<Assign>` for dynamic decision logic:

```tsx
import { Command, XmlBlock, If, Else, Assign, useVariable } from '../jsx.js';

const researchExists = useVariable("RESEARCH_EXISTS", {
  bash: `[ -f $PHASE_DIR/*-RESEARCH.md ] && echo "true" || echo "false"`
});

export default function PlanPhase() {
  return (
    <Command name="plan-phase" description="Plan with conditional research">
      <XmlBlock name="process">
        <h2>Step 1: Check for Research</h2>
        <Assign var={researchExists} />

        <If test="[ $RESEARCH_EXISTS = 'true' ]">
          <p>Using existing research:</p>
          <pre><code className="language-bash">cat $PHASE_DIR/*-RESEARCH.md</code></pre>
        </If>
        <Else>
          <p>No research found. Spawning researcher agent...</p>
          {/* SpawnAgent call here */}
        </Else>
      </XmlBlock>
    </Command>
  );
}
```

## Complete Example

A command that handles multiple conditional scenarios:

```tsx
import { Command, XmlBlock, If, Else, Assign, useVariable } from '../jsx.js';

const gitRepo = useVariable("GIT_REPO", {
  bash: `[ -d .git ] && echo "true" || echo "false"`
});

const hasUncommitted = useVariable("HAS_UNCOMMITTED", {
  bash: `[ -n "$(git status --porcelain 2>/dev/null)" ] && echo "true" || echo "false"`
});

export default function SafeDeployCommand() {
  return (
    <Command name="safe-deploy" description="Deploy with safety checks">
      <XmlBlock name="process">
        <h2>Pre-flight Checks</h2>

        <Assign var={gitRepo} />

        <If test="[ $GIT_REPO = 'false' ]">
          <p>Not a git repository. Cannot proceed safely.</p>
          <p><b>Action:</b> Initialize git or run from correct directory.</p>
        </If>
        <Else>
          <p>Git repository detected. Checking for uncommitted changes...</p>

          <Assign var={hasUncommitted} />

          <If test="[ $HAS_UNCOMMITTED = 'true' ]">
            <p>Uncommitted changes found. Please commit or stash before deploying.</p>
            <pre><code className="language-bash">git status</code></pre>
          </If>
          <Else>
            <p>Working tree clean. Safe to deploy.</p>
            <pre><code className="language-bash">npm run deploy</code></pre>
          </Else>
        </Else>
      </XmlBlock>
    </Command>
  );
}
```

## Tips

1. **Use descriptive test expressions** — `[ $STATUS = 'ready' ]` is clearer than `[ $S = 'r' ]`

2. **Keep nesting shallow** — More than 2-3 levels becomes hard to follow

3. **Combine with variables** — `useVariable` + `<Assign>` + `<If>` is a powerful pattern

4. **Single conditionals are valid** — `<If>` without `<Else>` works when you only need conditional content

5. **Prose format is intentional** — The `**If condition:**` / `**Otherwise:**` format is designed for Claude to interpret, not for shell execution
