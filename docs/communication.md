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
| `agent` | string | Yes | Agent name to spawn |
| `model` | string | Yes | Model to use |
| `description` | string | Yes | Task description |
| `input` | object | Yes* | Typed input data (recommended) |
| `prompt` | string | Yes* | Manual prompt (deprecated) |

*One of `input` or `prompt` is required. Use `input` for type-safe communication.

## Example: Deploy Pipeline

A command that orchestrates deployment by spawning specialized agents.

### Step 1: Define the Agents

**`src/app/build-agent.tsx`**
```tsx
import { Agent, XmlBlock, Markdown } from 'react-agentic';

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
    >
      <XmlBlock name="role">
        <Markdown>{`You are a build agent. You compile and bundle the application.`}</Markdown>
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
\`\`\``}</Markdown>
      </XmlBlock>
    </Agent>
  );
}
```

### Step 2: Create the Orchestrating Command

**`src/app/deploy-command.tsx`**
```tsx
import { Command, XmlBlock, Markdown, SpawnAgent } from 'react-agentic';
import type { BuildAgentInput } from './build-agent.js';

export default function DeployCommand() {
  return (
    <Command
      name="deploy"
      description="Build and deploy the application"
      argumentHint="[staging|production]"
      allowedTools={['Bash', 'Read', 'Task']}
    >
      <XmlBlock name="process">
        <Markdown>{`## 1. Parse Arguments

Extract environment from $ARGUMENTS (default: staging).

## 2. Spawn Build Agent
`}</Markdown>

        <SpawnAgent<BuildAgentInput>
          agent="build-agent"
          model="haiku"
          description="Build application for {environment}"
          input={{
            environment: "{environment}",
            skipTests: false
          }}
        />

        <Markdown>{`
### Handle Build Result

- **BUILD COMPLETE** → Continue to deployment
- **BUILD FAILED** → Show error, abort`}</Markdown>
      </XmlBlock>
    </Command>
  );
}
```

### Compiled Output

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

<process>
## 1. Parse Arguments

Extract environment from $ARGUMENTS (default: staging).

## 2. Spawn Build Agent

Task(
  prompt="...",
  subagent_type="build-agent",
  model="haiku",
  description="Build application for {environment}"
)

### Handle Build Result

- **BUILD COMPLETE** → Continue to deployment
- **BUILD FAILED** → Show error, abort
</process>
```

## Type Safety with AgentRef

Use `defineAgent` for fully type-safe agent references:

```tsx
import { defineAgent, SpawnAgent } from 'react-agentic';
import BuildAgentComponent from './build-agent.js';
import type { BuildAgentInput } from './build-agent.js';

// Create type-safe agent reference
const buildAgent = defineAgent<BuildAgentInput>({
  name: 'build-agent',
  component: BuildAgentComponent,
});

// Use in command
<SpawnAgent
  agent={buildAgent}
  model="haiku"
  description="Build application"
  input={{
    environment: "staging",  // TypeScript validates this
    skipTests: false
  }}
/>
```

## Handling Agent Output

After spawning an agent, handle its return status with `useOutput` and `OnStatus`.

### useOutput Hook

Declare an output reference to track an agent's return:

```tsx
import { useOutput, OnStatus } from 'react-agentic';
import type { BuildAgentOutput } from './build-agent.js';

const output = useOutput<BuildAgentOutput>("build-agent");
```

### OnStatus Component

Conditionally render content based on agent return status:

```tsx
<OnStatus output={output} status="SUCCESS">
  <p>Build completed. Artifacts at {output.field('artifactPath')}.</p>
</OnStatus>

<OnStatus output={output} status="BLOCKED">
  <p>Build blocked: {output.field('blockedBy')}</p>
</OnStatus>

<OnStatus output={output} status="ERROR">
  <p>Build failed.</p>
</OnStatus>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `output` | OutputRef | Yes | Output reference from `useOutput` |
| `status` | string | Yes | Status to match (SUCCESS, BLOCKED, ERROR) |
| `children` | ReactNode | Yes | Content when status matches |

### output.field() Method

Access typed output fields:

```tsx
output.field('confidence')  // Emits: {output.confidence}
output.field('artifactPath')   // Emits: {output.artifactPath}
```

### Output Format

`OnStatus` emits as prose-based markdown:

```markdown
**On SUCCESS:**

Build completed. Artifacts at {output.artifactPath}.

**On BLOCKED:**

Build blocked: {output.blockedBy}

**On ERROR:**

Build failed.
```

## Complete Example

A command that spawns an agent and handles all return statuses:

```tsx
import { Command, XmlBlock, SpawnAgent, useOutput, OnStatus } from 'react-agentic';
import type { BuildAgentInput, BuildAgentOutput } from './build-agent.js';

export default function BuildCommand() {
  const buildOutput = useOutput<BuildAgentOutput>("build-agent");

  return (
    <Command name="build" description="Build with status handling">
      <XmlBlock name="process">
        <h2>1. Spawn Build Agent</h2>

        <SpawnAgent<BuildAgentInput>
          agent="build-agent"
          model="haiku"
          description="Build application"
          input={{ environment: "production" }}
        />

        <h2>2. Handle Result</h2>

        <OnStatus output={buildOutput} status="SUCCESS">
          <p>Build succeeded. Artifacts at {buildOutput.field('artifactPath')}.</p>
        </OnStatus>

        <OnStatus output={buildOutput} status="BLOCKED">
          <p>Build blocked: {buildOutput.field('blockedBy')}</p>
        </OnStatus>

        <OnStatus output={buildOutput} status="ERROR">
          <p>Build failed. Check logs and retry.</p>
        </OnStatus>
      </XmlBlock>
    </Command>
  );
}
```

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│  Command (deploy-command.tsx)                               │
│                                                             │
│  1. Parse args, gather context                              │
│  2. <SpawnAgent agent="build-agent" input={...} />          │
│       │                                                     │
│       └──► Task() emitted in markdown                       │
│             │                                               │
│             ▼                                               │
│       ┌─────────────────────────────────────┐               │
│       │  Agent (build-agent)                │               │
│       │  - Receives input                   │               │
│       │  - Executes build steps             │               │
│       │  - Returns: SUCCESS/BLOCKED/ERROR   │               │
│       └─────────────────────────────────────┘               │
│             │                                               │
│             ▼                                               │
│  3. <OnStatus> handles result                               │
│  4. Continue with next steps or error handling              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Tips

1. **Export interfaces from agents** - Enables type-safe spawning
2. **Use structured returns** - Makes parsing agent results predictable
3. **Keep prompts focused** - One clear objective per spawn
4. **Handle both success/failure** - Agents can fail, plan for it
5. **Use appropriate models** - `haiku` for simple tasks, `sonnet`/`opus` for complex
6. **Use OnStatus for agent results** - Handle SUCCESS/BLOCKED/ERROR explicitly

## See Also

- [Agent](./agent.md) - Building spawnable agents
- [Command](./command.md) - Building slash commands
- [Control Flow](./control-flow.md) - If/Else, Loop, Return
