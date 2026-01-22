# Communication (SpawnAgent)

SpawnAgent is the bridge between Commands and Agents. It emits `Task()` syntax that tells Claude to spawn a specialized agent.

## Basic Pattern

```
Command ──── SpawnAgent ────► Agent
   │              │              │
   │         (compiles to)       │
   │              │              │
   │         Task(...)           │
   │              │              │
   └──────────────┴──────────────┘
              at runtime
```

## SpawnAgent Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `agent` | string | ✓ | Agent name to spawn |
| `model` | string | ✓ | Model to use (supports `{variable}`) |
| `description` | string | ✓ | Task description |
| `input` | object/VariableRef | ✓* | Typed input data (recommended) |
| `prompt` | string | ✓* | Manual prompt (deprecated) |
| `TInput` | generic | | Type interface for validation |

*One of `input` or `prompt` is required. Use `input` for type-safe communication.

> **Note:** The `prompt` prop is deprecated. Use `input` for type-safe communication.
> The `prompt` prop remains functional for backward compatibility.

## Example: Deploy Pipeline

A command that orchestrates deployment by spawning specialized agents.

### Step 1: Define the Agents

**`src/app/build-agent.tsx`**
```tsx
import { Agent, XmlBlock, Markdown } from '../jsx.js';

export interface BuildAgentInput {
  environment: 'staging' | 'production';
  skipTests?: boolean;
}

export default function BuildAgent() {
  return (
    <Agent<BuildAgentInput>
      name="build-agent"
      description="Builds the application for deployment"
      tools="Bash, Read"
      color="blue"
    >
      <XmlBlock name="role">
        <Markdown>{`You are a build agent. You compile and bundle the application.

**Input:** environment, skipTests flag
**Output:** Build artifacts in ./dist/`}</Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <Markdown>{`## 1. Install Dependencies

\`\`\`bash
npm ci
\`\`\`

## 2. Run Tests (unless skipped)

\`\`\`bash
npm test
\`\`\`

## 3. Build for Environment

\`\`\`bash
NODE_ENV={environment} npm run build
\`\`\`

## 4. Verify Build

\`\`\`bash
ls -la ./dist/
\`\`\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="returns">
        <Markdown>{`Return \`## BUILD COMPLETE\` with artifact summary, or \`## BUILD FAILED\` with error details.`}</Markdown>
      </XmlBlock>
    </Agent>
  );
}
```

**`src/app/deploy-agent.tsx`**
```tsx
import { Agent, XmlBlock, Markdown } from '../jsx.js';

export interface DeployAgentInput {
  environment: 'staging' | 'production';
  version: string;
}

export default function DeployAgent() {
  return (
    <Agent<DeployAgentInput>
      name="deploy-agent"
      description="Deploys built artifacts to target environment"
      tools="Bash, Read"
      color="green"
    >
      <XmlBlock name="role">
        <Markdown>{`You are a deploy agent. You push built artifacts to the target environment.

**Input:** environment, version
**Output:** Deployment confirmation with URL`}</Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <Markdown>{`## 1. Verify Artifacts Exist

\`\`\`bash
ls ./dist/
\`\`\`

## 2. Deploy to Environment

**Staging:**
\`\`\`bash
aws s3 sync ./dist/ s3://my-app-staging/
\`\`\`

**Production:**
\`\`\`bash
aws s3 sync ./dist/ s3://my-app-prod/
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
\`\`\`

## 3. Verify Deployment

\`\`\`bash
curl -I https://{environment}.my-app.com/health
\`\`\``}</Markdown>
      </XmlBlock>

      <XmlBlock name="returns">
        <Markdown>{`Return \`## DEPLOY COMPLETE\` with URL, or \`## DEPLOY FAILED\` with error.`}</Markdown>
      </XmlBlock>
    </Agent>
  );
}
```

### Step 2: Create the Orchestrating Command

**`src/app/deploy-command.tsx`**
```tsx
import { Command, XmlBlock, Markdown, SpawnAgent } from '../jsx.js';
import type { BuildAgentInput } from './build-agent.js';
import type { DeployAgentInput } from './deploy-agent.js';

export default function DeployCommand() {
  return (
    <Command
      name="deploy"
      description="Build and deploy the application"
      argumentHint="[staging|production]"
      allowedTools={['Bash', 'Read', 'Task']}
    >
      <XmlBlock name="objective">
        <Markdown>{`Orchestrate a full deployment pipeline:
1. Build the application
2. Deploy to target environment
3. Verify deployment health`}</Markdown>
      </XmlBlock>

      <XmlBlock name="process">
        <Markdown>{`## 1. Parse Arguments

Extract environment from $ARGUMENTS (default: staging).

## 2. Spawn Build Agent
`}</Markdown>

        <SpawnAgent<BuildAgentInput>
          agent="build-agent"
          model="haiku"
          description="Build application for {environment}"
          prompt={`Build the application for deployment.

**Environment:** {environment}
**Skip Tests:** false

Run the full build pipeline and report results.`}
        />

        <Markdown>{`
### Handle Build Result

- **BUILD COMPLETE** → Continue to step 3
- **BUILD FAILED** → Show error, abort deployment

## 3. Spawn Deploy Agent
`}</Markdown>

        <SpawnAgent<DeployAgentInput>
          agent="deploy-agent"
          model="haiku"
          description="Deploy to {environment}"
          prompt={`Deploy the built artifacts.

**Environment:** {environment}
**Version:** {version from build}

Push to target environment and verify health.`}
        />

        <Markdown>{`
### Handle Deploy Result

- **DEPLOY COMPLETE** → Show success with URL
- **DEPLOY FAILED** → Show error, suggest rollback

## 4. Final Report

Display deployment summary:
- Environment
- Version deployed
- Live URL
- Health status`}</Markdown>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <Markdown>{`- [ ] Environment parsed
- [ ] Build agent spawned and completed
- [ ] Deploy agent spawned and completed
- [ ] Health check passed
- [ ] User sees deployment URL`}</Markdown>
      </XmlBlock>
    </Command>
  );
}
```

### Step 3: Compiled Output

The command compiles to markdown with `Task()` calls:

```markdown
---
name: deploy
description: Build and deploy the application
argument-hint: '[staging|production]'
allowed-tools:
  - Bash
  - Read
  - Task
---

<objective>
Orchestrate a full deployment pipeline:
1. Build the application
2. Deploy to target environment
3. Verify deployment health
</objective>

<process>
## 1. Parse Arguments

Extract environment from $ARGUMENTS (default: staging).

## 2. Spawn Build Agent

Task(
  prompt="Build the application for deployment.

**Environment:** {environment}
**Skip Tests:** false

Run the full build pipeline and report results.",
  subagent_type="build-agent",
  model="haiku",
  description="Build application for {environment}"
)

### Handle Build Result

- **BUILD COMPLETE** → Continue to step 3
- **BUILD FAILED** → Show error, abort deployment

## 3. Spawn Deploy Agent

Task(
  prompt="Deploy the built artifacts.

**Environment:** {environment}
**Version:** {version from build}

Push to target environment and verify health.",
  subagent_type="deploy-agent",
  model="haiku",
  description="Deploy to {environment}"
)

### Handle Deploy Result
...
</process>
```

## Type Safety

The generic type parameter validates that your SpawnAgent matches the Agent's expected input:

```tsx
// In agent file
export interface BuildAgentInput {
  environment: 'staging' | 'production';
  skipTests?: boolean;
}

// In command file
import type { BuildAgentInput } from './build-agent.js';

<SpawnAgent<BuildAgentInput>
  agent="build-agent"
  ...
/>
```

This creates a compile-time contract between Command and Agent.

## Variable Placeholders

Use `{variable}` syntax for runtime substitution:

```tsx
<SpawnAgent
  model="{model_from_config}"
  description="Process {item_count} items"
  prompt={`Handle these files: {file_list}`}
/>
```

Claude fills these in at runtime based on context.

## Typed Input (Recommended)

Instead of writing prompts manually, use the `input` prop for type-safe communication.

### Object Literal Input

Pass structured data that matches the Agent's interface. Property values can be:
- **String literals**: `"value"` or `"{placeholder}"`
- **VariableRefs**: Variables from `useVariable()`

```tsx
// Agent defines its input contract
export interface ResearcherInput {
  phase: string;
  goal: string;
  requirements?: string;
}

export function Researcher() {
  return (
    <Agent<ResearcherInput> name="researcher" description="Research topics">
      ...
    </Agent>
  );
}

// Command uses typed input with VariableRefs
const phaseVar = useVariable<string>("PHASE", { bash: `echo "$1"` });

export default function PlanPhase() {
  return (
    <Command name="plan" description="Plan a phase">
      <Assign var={phaseVar} />
      <SpawnAgent<ResearcherInput>
        input={{
          phase: phaseVar,           // VariableRef - emits {phase}
          goal: "Complete research"  // String literal
        }}
        agent="researcher"
        model="{model}"
        description="Research phase"
      />
    </Command>
  );
}
```

Generated prompt:
```
<phase>
{phase}
</phase>

<goal>
Complete research
</goal>
```

Using VariableRefs is preferred over string placeholders like `"{phase}"` because:
1. **Type-safe** — TypeScript validates the variable exists
2. **No typos** — Reference the actual variable, not a string
3. **Refactor-friendly** — Renaming variables updates all references

### VariableRef Input

For dynamic data computed at runtime, use `useVariable`:

```tsx
const context = useVariable("CONTEXT", {
  bash: `cat \${PHASE_DIR}/context.json`
});

<SpawnAgent<ResearcherInput>
  input={context}
  agent="researcher"
  model="{model}"
  description="Research with context"
/>
```

Generated prompt:
```
<input>
{context}
</input>
```

### Extra Instructions

Children become additional instructions appended to the auto-generated prompt:

```tsx
<SpawnAgent<ResearcherInput>
  input={{ phase: "{phase}", goal: "Research" }}
  agent="researcher"
  model="{model}"
  description="Research phase"
>
  Focus on technical requirements.
  Ignore marketing considerations.
</SpawnAgent>
```

### Compile-Time Validation

When using the `input` prop with an object literal, the compiler validates that:
- All required interface properties are provided
- Property names match the interface definition

Missing required properties cause a **compile-time error**, not a runtime failure:

```tsx
// Agent interface requires 'goal' and 'context'
export interface TaskInput {
  goal: string;
  context: string;
  priority?: number;  // optional
}

// This FAILS at compile time:
<SpawnAgent<TaskInput>
  input={{ goal: "Do something" }}  // ERROR: missing required property 'context'
  ...
/>

// This succeeds:
<SpawnAgent<TaskInput>
  input={{ goal: "Do something", context: "Project X" }}  // OK
  ...
/>
```

This ensures type mismatches are caught before your command runs, not during execution.

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  Command (deploy-command.tsx)                               │
│                                                             │
│  1. Parse args, gather context                              │
│  2. <SpawnAgent agent="build-agent" prompt={...} />         │
│       │                                                     │
│       └──► Task() emitted in markdown                       │
│             │                                               │
│             ▼                                               │
│       ┌─────────────────────────────────────┐               │
│       │  Agent (build-agent)                │               │
│       │  - Receives prompt                  │               │
│       │  - Executes build steps             │               │
│       │  - Returns: ## BUILD COMPLETE       │               │
│       └─────────────────────────────────────┘               │
│             │                                               │
│             ▼                                               │
│  3. Parse agent result                                      │
│  4. <SpawnAgent agent="deploy-agent" prompt={...} />        │
│       │                                                     │
│       └──► (same pattern)                                   │
│                                                             │
│  5. Show final results to user                              │
└─────────────────────────────────────────────────────────────┘
```

## Combining with Conditionals

SpawnAgent pairs well with `<If>/<Else>` for conditional agent spawning:

```tsx
import { Command, XmlBlock, SpawnAgent, If, Else, Assign, useVariable } from '../jsx.js';
import type { BuildAgentInput } from './build-agent.js';

const testsPass = useVariable("TESTS_PASS", {
  bash: `npm test --silent && echo "true" || echo "false"`
});

export default function ConditionalDeployCommand() {
  return (
    <Command name="conditional-deploy" description="Deploy only if tests pass">
      <XmlBlock name="process">
        <h2>1. Run Tests</h2>
        <Assign var={testsPass} />

        <If test="[ $TESTS_PASS = 'true' ]">
          <p>Tests passed. Proceeding with deployment.</p>

          <SpawnAgent<BuildAgentInput>
            agent="build-agent"
            model="haiku"
            description="Build for deployment"
            input={{ environment: "production" }}
          />
        </If>
        <Else>
          <p>Tests failed. Deployment aborted.</p>
          <pre><code className="language-bash">npm test</code></pre>
        </Else>
      </XmlBlock>
    </Command>
  );
}
```

This pattern emits conditional blocks that guide Claude's execution flow, spawning agents only when conditions are met.

## Tips

1. **Export interfaces from agents** — Enables type-safe spawning
2. **Use structured returns** — Makes parsing agent results predictable
3. **Keep prompts focused** — One clear objective per spawn
4. **Handle both success/failure** — Agents can fail, plan for it
5. **Use appropriate models** — `haiku` for simple tasks, `sonnet`/`opus` for complex
6. **Combine with conditionals** — Use `<If>/<Else>` for conditional agent spawning
