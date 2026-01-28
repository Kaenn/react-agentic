# react-agentic

**Build your company's GSD** — Enterprise-grade agentic workflows for Claude Code, authored in TypeScript.

Generic workflows exist. But your company has specific expertise, compliance needs, and processes that generic tools can't capture. **react-agentic** lets you build sophisticated multi-agent orchestrations tailored to your domain — with full type safety and compile-time validation.

```tsx
<Command name="deploy-review" description="Company deployment review workflow">
  <SpawnAgent
    agent="compliance-checker"
    input={{ changes: ctx.diff, policy: ctx.companyPolicy }}
    output={complianceResult}
  />

  <If condition={complianceResult.hasViolations}>
    <SpawnAgent agent="remediation-advisor" input={{ violations: complianceResult.issues }} />
  </If>
</Command>
```

---

## Why react-agentic?

| Challenge | Without react-agentic | With react-agentic |
|-----------|----------------------|-------------------|
| Complex orchestration | 500-line markdown, unmaintainable | Composable TSX components |
| Team collaboration | Copy-paste, no shared patterns | Reusable typed components |
| Domain models | Untyped, error-prone | `useRuntimeVar<YourEntity>()` |
| Agent communication | String-based, breaks silently | Typed `input`/`output` contracts |
| Error detection | Runtime (Claude fails) | Compile-time (build fails) |

---

## Quick Start

### Installation

```bash
npm install react-agentic
```

### Create Your First Command

```tsx
// src/app/review-pr.tsx
import { Command, SpawnAgent, If, useRuntimeVar } from 'react-agentic';

export default (
  <Command
    name="review-pr"
    description="Review PR with company standards"
  >
    {() => {
      const result = useRuntimeVar<{ approved: boolean; feedback: string }>('RESULT');

      return (
        <>
          <p>Review this PR against our coding standards.</p>

          <SpawnAgent
            agent="code-reviewer"
            description="Review PR"
            input={{ standards: "@company-standards.md" }}
            output={result}
          />

          <If condition={result.approved}>
            <p>PR approved. Ready to merge.</p>
          </If>
        </>
      );
    }}
  </Command>
);
```

### Build

```bash
npx react-agentic build "src/app/**/*.tsx"
```

Output: `.claude/commands/review-pr.md` — ready for Claude Code.

### Watch Mode

```bash
npx react-agentic build "src/app/**/*.tsx" --watch
```

---

## Core Concepts

### Commands & Agents

```tsx
// Command = slash command (/deploy, /review)
<Command name="deploy" description="Deploy to staging">
  ...
</Command>

// Agent = spawnable worker with specific expertise
<Agent name="security-auditor" description="Security vulnerability scanner">
  ...
</Agent>
```

### Typed Variables

```tsx
// Define typed variables for your domain
const order = useRuntimeVar<Order>('ORDER');
const patient = useRuntimeVar<PatientRecord>('PATIENT');
const trade = useRuntimeVar<TradeRequest>('TRADE');

// Full autocomplete and type checking
<If condition={order.status === 'pending'}>
  ...
</If>
```

### Control Flow

```tsx
// Conditionals
<If condition={ctx.needsReview}>
  <SpawnAgent agent="reviewer" ... />
</If>
<Else>
  <p>Skipping review.</p>
</Else>

// Loops with typed counters
<Loop max={3} counter={attempt}>
  <SpawnAgent agent="validator" ... />
  <If condition={result.passed}>
    <Break message="Validation passed" />
  </If>
</Loop>
```

### Agent Spawning

```tsx
<SpawnAgent
  agent="compliance-checker"      // Agent name
  model="sonnet"                   // Model selection
  description="Check compliance"   // Task description
  input={{ data: ctx.payload }}   // Typed input
  output={complianceResult}        // Typed output capture
/>
```

### Runtime Functions

Bridge TypeScript logic with your commands:

```tsx
import { runtimeFn } from 'react-agentic';
import { validateOrder } from './validators.js';

const ValidateOrder = runtimeFn(validateOrder);

// In your command:
<ValidateOrder.Call
  args={{ order: ctx.order }}
  output={validationResult}
/>
```

---

## Real-World Examples

### Healthcare: HIPAA Compliance Flow

```tsx
const patient = useRuntimeVar<PatientRecord>('PATIENT');
const scanResult = useRuntimeVar<PHIScanResult>('SCAN_RESULT');

<SpawnAgent
  agent="phi-scanner"
  input={{ record: patient, regulations: "@hipaa-rules.md" }}
  output={scanResult}
/>

<If condition={scanResult.hasPHI}>
  <SpawnAgent
    agent="phi-remediation"
    input={{ findings: scanResult.violations }}
  />
</If>
```

### Fintech: Trade Validation

```tsx
const trade = useRuntimeVar<TradeRequest>('TRADE');
const riskResult = useRuntimeVar<RiskAssessment>('RISK');

<SpawnAgent
  agent="risk-analyzer"
  input={{ trade, limits: ctx.companyLimits }}
  output={riskResult}
/>

<If condition={riskResult.score > 0.8}>
  <AskUser
    question="High risk trade detected. Proceed?"
    options={[
      { value: 'approve', label: 'Approve with override' },
      { value: 'reject', label: 'Reject trade' },
    ]}
    output={userChoice}
  />
</If>
```

### E-commerce: Deployment Pipeline

```tsx
<Loop max={3} counter={attempt}>
  <SpawnAgent agent="staging-deployer" output={deployResult} />

  <If condition={deployResult.healthy}>
    <SpawnAgent agent="smoke-tester" output={testResult} />
    <If condition={testResult.passed}>
      <Break message="Deployment successful" />
    </If>
  </If>

  <SpawnAgent agent="rollback-handler" />
</Loop>
```

---

## Components Reference

| Component | Purpose | Example |
|-----------|---------|---------|
| `<Command>` | Slash command | `/deploy`, `/review` |
| `<Agent>` | Spawnable worker | Specialized expertise |
| `<SpawnAgent>` | Spawn agent with typed I/O | Multi-agent orchestration |
| `<If>` / `<Else>` | Conditional logic | Branch on results |
| `<Loop>` / `<Break>` | Iteration | Retry loops, validation |
| `<AskUser>` | User input | Confirmations, choices |
| `<Return>` | Exit with status | Early termination |
| `<XmlBlock>` | Structured sections | `<objective>`, `<process>` |
| `<Table>` | Markdown tables | Data display |
| `<ExecutionContext>` | File references | `@file.md` includes |
| `runtimeFn()` | TypeScript bridge | Complex logic |

---

## Project Structure

```
your-project/
├── src/
│   └── app/
│       ├── commands/
│       │   ├── deploy.tsx        → .claude/commands/deploy.md
│       │   └── review.tsx        → .claude/commands/review.md
│       └── agents/
│           ├── reviewer.tsx      → .claude/agents/reviewer.md
│           └── deployer.tsx      → .claude/agents/deployer.md
├── package.json
└── tsconfig.json
```

---

## CLI Reference

```bash
# Build specific file
npx react-agentic build "src/app/deploy.tsx"

# Build all commands and agents
npx react-agentic build "src/app/**/*.tsx"

# Watch mode (rebuild on changes)
npx react-agentic build "src/app/**/*.tsx" --watch

# With code splitting (separate runtime files)
npx react-agentic build "src/app/**/*.tsx" --code-split

# Minified output
npx react-agentic build "src/app/**/*.tsx" --minify
```

---

## Why Not Just Markdown?

For simple commands, vanilla markdown works fine. **react-agentic** is for when you need:

- **Multi-agent orchestration** — Spawn → check result → branch → spawn again
- **Typed domain models** — Your entities (`Order`, `Patient`, `Trade`) with autocomplete
- **Team collaboration** — Shared components, no copy-paste drift
- **Compile-time safety** — Errors caught at build, not when Claude runs
- **Complex control flow** — Loops, retries, early exits, user prompts

---

## Comparison

| Approach | Best For |
|----------|----------|
| Vanilla markdown | Simple commands, quick scripts |
| Claude Agent SDK | Programmatic execution from apps |
| **react-agentic** | Complex orchestration, team workflows, enterprise |

---

## Documentation

- [Getting Started](docs/getting-started.md)
- [Commands](docs/command.md)
- [Agents](docs/agent.md)
- [Communication (SpawnAgent)](docs/communication.md)
- [Variables](docs/variables.md)
- [Control Flow](docs/conditionals.md)
- [Runtime Functions](docs/build-pipeline.md)

---

## Roadmap

**Current focus: Claude Code**

react-agentic currently targets **Claude Code** as its primary runtime. We're focused on making the Claude Code integration rock-solid before expanding.

**Future providers planned:**

| Provider | Status |
|----------|--------|
| Claude Code | ✅ Supported |
| OpenCode | 🔜 Planned |
| Antigravity | 🔜 Planned |
| Others | Under consideration |

Our approach: **depth before breadth**. Once the core framework is stable and battle-tested with Claude Code, we'll add emit targets for other agentic coding tools.

Want to help bring react-agentic to another provider? [Open an issue](https://github.com/anthropics/react-agentic/issues) or contribute a PR!

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

MIT

---

<p align="center">
  <b>Build your company's GSD.</b><br>
  Type-safe agentic workflows for Claude Code.
</p>
