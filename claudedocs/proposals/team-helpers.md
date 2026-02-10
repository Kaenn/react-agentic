# Team Helpers Proposal

Pre-built team compositions and orchestration patterns for common multi-agent workflows.

## Executive Summary

**Problem**: Every user of multi-agent frameworks builds the same ~6 team configurations from scratch. CrewAI, Claude Flow, AutoGen, and OpenAI Swarm examples all converge on identical patterns: review teams, content pipelines, research squads, feature implementation workflows. Users wire `defineWorker` + `defineTeam` + `Team` + `Teammate` + `TaskPipeline` + `ShutdownSequence` for every project.

**Solution**: Ship composable team helpers that encode proven patterns as single-import components. Users customize with props, not primitives.

**Scope**: New components in `src/components/swarm/teams/`. No changes to existing primitives.

## Research Basis

Cross-framework analysis of 7 frameworks + 1 protocol:

| Framework | Key Pattern Borrowed |
|-----------|---------------------|
| CrewAI | Role + Goal + Backstory persona model, delegation tools, Flows (multi-crew) |
| Claude Flow | Blackboard/shared state, topology configs, single-message spawning |
| OpenAI Swarm | Handoff chains, context variables, ultra-minimal agent definition |
| AutoGen | Selector (LLM picks next speaker), group chat broadcast |
| Magentic-One | Dual-ledger (Task Ledger + Progress Ledger), adaptive replanning |
| MetaGPT | SOP-driven pipeline, structured artifacts between stages |
| LangGraph | Fan-out/fan-in, state-based coordination, graph as orchestration |
| Google A2A | Agent Cards (capability advertisement) |

## Design Principles

1. **Helpers wrap primitives, not replace them** -- `ReviewTeam` emits `Team` + `Teammate` + `ShutdownSequence` under the hood
2. **Props over configuration** -- customize via JSX props, not config objects
3. **Escape hatch always available** -- `children` prop overrides default workers when full control needed
4. **Composable** -- helpers nest inside `<Command>`, `<Workflow>`, or standalone
5. **Type-safe** -- factory functions return typed refs for cross-component wiring

---

## Part 1: Team Helper Components

### `<ReviewTeam>`

Parallel specialists review the same artifact simultaneously.

**Pattern**: Fan-out (parallel workers) -> merge findings

**Inspired by**: CrewAI parallel process, Claude Code's most common team config

```tsx
interface ReviewTeamProps {
  /** Team name identifier */
  name?: string;
  /** What is being reviewed (injected into prompts) */
  target: string;
  /** Review dimensions to activate */
  reviewers?: ('security' | 'performance' | 'architecture' | 'quality')[];
  /** Additional context injected into all reviewer prompts */
  context?: string;
  /** Override default workers (escape hatch) */
  children?: React.ReactNode;
}
```

**Usage**:

```tsx
import { Command, ReviewTeam } from 'react-agentic';

export default () => (
  <Command name="review-pr" description="Review a pull request">
    <ReviewTeam
      target="PR #123 - Add user authentication"
      reviewers={['security', 'performance', 'architecture']}
      context="Focus on the OAuth2 implementation in src/auth/"
    />
  </Command>
);
```

**Emits** (under the hood):

```tsx
<Workflow name="Review" team={autoTeam}>
  <Team team={autoTeam} description="Reviewing PR #123 - Add user authentication">
    <Teammate worker={securityWorker} description="Security review">
      <Prompt>
        Review PR #123 - Add user authentication for security vulnerabilities.
        Focus on the OAuth2 implementation in src/auth/
        Send findings to team-lead when complete.
      </Prompt>
    </Teammate>
    <Teammate worker={perfWorker} description="Performance review">...</Teammate>
    <Teammate worker={archWorker} description="Architecture review">...</Teammate>
  </Team>
  <ShutdownSequence workers={[securityWorker, perfWorker, archWorker]} reason="Review complete" />
</Workflow>
```

**Default reviewer mapping**:

| Dimension | Worker Type | Model |
|-----------|-----------|-------|
| `security` | `PluginAgentType.SecuritySentinel` | Sonnet |
| `performance` | `PluginAgentType.PerformanceOracle` | Sonnet |
| `architecture` | `PluginAgentType.ArchitectureStrategist` | Sonnet |
| `quality` | `PluginAgentType.CodeSimplicityReviewer` | Sonnet |

---

### `<ContentPipeline>`

Sequential specialists produce content through research, writing, and editing stages.

**Pattern**: Sequential pipeline (research -> write -> edit)

**Inspired by**: CrewAI's content creation crews, MetaGPT's SOP pipeline

```tsx
interface ContentPipelineProps {
  /** Content topic or brief */
  topic: string;
  /** Output format */
  output?: 'blog-post' | 'report' | 'documentation' | 'analysis';
  /** Pipeline stages to include */
  stages?: ('research' | 'outline' | 'write' | 'edit' | 'review')[];
  /** Additional instructions for all stages */
  context?: string;
}
```

**Usage**:

```tsx
import { Command, ContentPipeline } from 'react-agentic';

export default () => (
  <Command name="write-blog" description="Generate a blog post">
    <ContentPipeline
      topic="React Server Components vs Astro Islands"
      output="blog-post"
      stages={['research', 'outline', 'write', 'edit']}
    />
  </Command>
);
```

**Emits**: A `TaskPipeline` with `autoChain` where each stage has a specialized worker:

| Stage | Worker Type | Model | Role |
|-------|-----------|-------|------|
| `research` | `AgentType.Explore` | Haiku | Gather sources, data, examples |
| `outline` | `AgentType.Plan` | Sonnet | Structure the content |
| `write` | `AgentType.GeneralPurpose` | Sonnet | Draft the content |
| `edit` | `AgentType.GeneralPurpose` | Opus | Refine for clarity, accuracy |
| `review` | `PluginAgentType.CodeSimplicityReviewer` | Sonnet | Final quality check |

---

### `<ResearchTeam>`

Multiple researchers investigate different angles in parallel, then a synthesizer combines findings.

**Pattern**: Fan-out (parallel researchers) -> synthesis (single agent)

**Inspired by**: CrewAI financial analysis team, LangGraph fan-out/fan-in, your existing `tech-compare` POC

```tsx
interface ResearchTeamProps {
  /** Research question or topic */
  question: string;
  /** Research angles (each becomes a parallel researcher) */
  angles: string[];
  /** Research depth */
  depth?: 'quick' | 'standard' | 'deep';
  /** Output format for synthesis */
  output?: 'comparison' | 'recommendation' | 'report';
  /** Additional context for all researchers */
  context?: string;
}
```

**Usage**:

```tsx
import { Command, ResearchTeam } from 'react-agentic';

export default () => (
  <Command name="tech-compare" description="Compare technologies">
    <ResearchTeam
      question="Best state management for our React app"
      angles={['Redux/RTK', 'Zustand', 'Jotai', 'TanStack Query']}
      depth="deep"
      output="recommendation"
    />
  </Command>
);
```

**Emits**: N parallel researcher workers + 1 synthesizer in a two-phase workflow:

- **Phase 1**: Each angle spawns an `AgentType.Explore` (haiku for quick, sonnet for deep)
- **Phase 2**: A `AgentType.GeneralPurpose` (opus) synthesizer reads all findings and produces the final output

---

### `<FeaturePipeline>`

End-to-end feature implementation with optional parallel review at the end.

**Pattern**: Sequential pipeline + parallel review (hybrid)

**Inspired by**: Your existing `CompleteWorkflowTemplate`, CrewAI's hierarchical process

```tsx
interface FeaturePipelineProps {
  /** Feature description */
  feature: string;
  /** Pipeline stages */
  stages?: ('research' | 'plan' | 'implement' | 'test' | 'review')[];
  /** Enable plan approval gate (human-in-loop) */
  planApproval?: boolean;
  /** Review dimensions for the review stage */
  reviewers?: ('security' | 'performance' | 'architecture')[];
  /** Additional context */
  context?: string;
}
```

**Usage**:

```tsx
import { Command, FeaturePipeline } from 'react-agentic';

export default () => (
  <Command name="build-feature" description="Build a feature end-to-end">
    <FeaturePipeline
      feature="Add OAuth2 authentication with Google and GitHub providers"
      stages={['research', 'plan', 'implement', 'test', 'review']}
      planApproval={true}
      reviewers={['security', 'performance']}
    />
  </Command>
);
```

**Emits**: A `TaskPipeline autoChain` for stages 1-4, then a parallel `ReviewTeam` for stage 5 (blocked by stage 4).

When `planApproval` is true, the planner worker gets `mode="plan"`, requiring leader approval before proceeding.

---

### `<TriageTeam>`

A router agent directs incoming work to the right specialist.

**Pattern**: Hierarchical with dynamic routing

**Inspired by**: CrewAI hierarchical process, OpenAI Swarm handoffs, Magentic-One orchestrator

```tsx
interface TriageTeamProps {
  /** What kind of work is being triaged */
  domain: string;
  /** Available specialist routes */
  routes: Array<{
    name: string;
    description: string;
    worker?: WorkerRef;
  }>;
  /** Additional triage instructions */
  context?: string;
}
```

**Usage**:

```tsx
import { Command, TriageTeam } from 'react-agentic';

export default () => (
  <Command name="handle-issue" description="Triage and handle an issue">
    <TriageTeam
      domain="GitHub issues"
      routes={[
        { name: 'bug', description: 'Bug reports requiring reproduction and fix' },
        { name: 'feature', description: 'Feature requests requiring design and implementation' },
        { name: 'docs', description: 'Documentation improvements' },
        { name: 'question', description: 'User questions requiring research and response' },
      ]}
    />
  </Command>
);
```

**Emits**: A leader prompt that reads the input, classifies it, then spawns the appropriate specialist worker. Uses `<If>` / `<Else>` control flow from V3 runtime.

---

## Part 2: Orchestration Pattern Components

Higher-level patterns that compose primitives into reusable coordination shapes.

### `<FanOutSynthesize>`

N parallel workers produce results, one synthesizer combines them.

```tsx
interface FanOutSynthesizeProps {
  /** Parallel worker definitions */
  workers: Array<{
    name: string;
    prompt: string;
    type?: AgentType | PluginAgentType;
    model?: Model;
  }>;
  /** Synthesizer instructions */
  synthesize: string;
  /** Synthesizer model (defaults to Opus for quality) */
  synthesizerModel?: Model;
  /** Team name */
  name?: string;
}
```

**Usage**:

```tsx
<FanOutSynthesize
  name="market-analysis"
  workers={[
    { name: 'market-data', prompt: 'Gather Q3 market data for fintech sector' },
    { name: 'news-sentiment', prompt: 'Analyze news sentiment for fintech stocks' },
    { name: 'tech-analysis', prompt: 'Technical analysis of top 5 fintech stocks' },
  ]}
  synthesize="Combine all research into an investment recommendation with risk assessment"
  synthesizerModel={Model.Opus}
/>
```

**Emits**:
1. `Team` with N parallel workers
2. `TaskPipeline` where synthesis task is `blockedBy` all worker tasks
3. `ShutdownSequence` for all workers

---

### `<GatedPipeline>`

Pipeline with approval gates between stages.

```tsx
interface GatedPipelineProps {
  /** Pipeline stages with optional gates */
  children: React.ReactNode; // <Stage> and <Gate> children
  /** Team reference */
  team: TeamRef;
  /** Pipeline title */
  title?: string;
}

interface StageProps {
  /** Worker to execute this stage */
  worker: WorkerRef;
  /** Task description */
  task: string;
  /** Stage prompt */
  prompt: string;
}

interface GateProps {
  /** Gate type */
  type: 'plan-approval' | 'human-review';
  /** Gate description */
  description?: string;
}
```

**Usage**:

```tsx
<GatedPipeline team={FeatureTeam} title="Gated Feature Build">
  <Stage worker={Researcher} task="Research" prompt="Research best practices" />
  <Stage worker={Planner} task="Plan" prompt="Create implementation plan" />
  <Gate type="plan-approval" description="Review plan before implementation" />
  <Stage worker={Builder} task="Implement" prompt="Build the feature" />
  <Stage worker={Tester} task="Test" prompt="Write and run tests" />
  <Gate type="human-review" description="Final review before merge" />
</GatedPipeline>
```

**Emits**: `TaskPipeline` with `autoChain` where `Gate` inserts `mode="plan"` on the next worker, forcing a pause until the leader approves.

---

## Part 3: Agent Persona Enhancement

Structured prompt sections that shape agent behavior through narrative (from CrewAI's model).

### `<Persona>` component

```tsx
interface PersonaProps {
  /** Agent's role/expertise */
  role: string;
  /** What the agent optimizes for */
  goal: string;
  /** Narrative context shaping behavior */
  backstory?: string;
  /** Specific constraints */
  constraints?: string[];
  /** Detailed instructions */
  children?: React.ReactNode;
}
```

**Usage inside Teammate**:

```tsx
<Teammate worker={Security} description="Security audit">
  <Persona
    role="Senior Security Engineer"
    goal="Identify all critical vulnerabilities before production deployment"
    backstory="OWASP contributor with 10 years in application security. Known for thoroughness over speed."
    constraints={[
      'Never dismiss a potential vulnerability without evidence',
      'Always provide severity ratings (Critical/High/Medium/Low)',
    ]}
  >
    Review the authentication implementation for OWASP Top 10 vulnerabilities.
    Pay special attention to token handling and session management.
    Send findings to team-lead when complete.
  </Persona>
</Teammate>
```

**Emits** (inside the prompt):

```markdown
## Role
Senior Security Engineer

## Goal
Identify all critical vulnerabilities before production deployment

## Background
OWASP contributor with 10 years in application security. Known for thoroughness over speed.

## Constraints
- Never dismiss a potential vulnerability without evidence
- Always provide severity ratings (Critical/High/Medium/Low)

## Instructions
Review the authentication implementation for OWASP Top 10 vulnerabilities.
Pay special attention to token handling and session management.
Send findings to team-lead when complete.
```

`<Persona>` is optional. Simple prompts via `prompt=""` prop remain supported. Use `<Persona>` when agent behavior needs to be shaped beyond just instructions.

---

## Part 4: Factory Functions

For programmatic team creation (complements JSX components).

### `createReviewTeam()`

```tsx
function createReviewTeam(config: {
  target: string;
  reviewers?: ('security' | 'performance' | 'architecture' | 'quality')[];
  teamName?: string;
}): {
  team: TeamRef;
  workers: Record<string, WorkerRef>;
  render: () => JSX.Element; // Pre-built <ReviewTeam> JSX
}
```

### `createContentPipeline()`

```tsx
function createContentPipeline(config: {
  topic: string;
  output?: 'blog-post' | 'report' | 'documentation';
  stages?: ('research' | 'outline' | 'write' | 'edit')[];
}): {
  pipeline: Pipeline;
  workers: Record<string, WorkerRef>;
  render: () => JSX.Element;
}
```

### `createResearchTeam()`

```tsx
function createResearchTeam(config: {
  question: string;
  angles: string[];
  depth?: 'quick' | 'standard' | 'deep';
}): {
  team: TeamRef;
  researchers: WorkerRef[];
  synthesizer: WorkerRef;
  render: () => JSX.Element;
}
```

---

## File Structure

```
src/components/swarm/teams/
  index.ts              # Re-exports all helpers
  ReviewTeam.tsx        # <ReviewTeam>
  ContentPipeline.tsx   # <ContentPipeline>
  ResearchTeam.tsx      # <ResearchTeam>
  FeaturePipeline.tsx   # <FeaturePipeline>
  TriageTeam.tsx        # <TriageTeam>

src/components/swarm/patterns/
  index.ts              # Re-exports all patterns
  FanOutSynthesize.tsx  # <FanOutSynthesize>
  GatedPipeline.tsx     # <GatedPipeline>
  Stage.tsx             # <Stage> (child of GatedPipeline)
  Gate.tsx              # <Gate> (child of GatedPipeline)

src/components/swarm/persona/
  index.ts
  Persona.tsx           # <Persona>

src/components/swarm/teams/factories.ts  # createReviewTeam(), etc.
```

## Export Surface

```tsx
// From 'react-agentic'
export {
  // Team Helpers
  ReviewTeam,
  ContentPipeline,
  ResearchTeam,
  FeaturePipeline,
  TriageTeam,

  // Orchestration Patterns
  FanOutSynthesize,
  GatedPipeline,
  Stage,
  Gate,

  // Persona
  Persona,

  // Factories
  createReviewTeam,
  createContentPipeline,
  createResearchTeam,
} from './components/swarm';
```

## Implementation Priority

| Priority | Component | Rationale |
|----------|-----------|-----------|
| P0 | `ReviewTeam` | Most common real-world team. Already have POC in examples. |
| P0 | `Persona` | Enhances every team helper. Small surface area. |
| P1 | `ResearchTeam` | Second most common. Validates fan-out pattern. |
| P1 | `FanOutSynthesize` | Generic pattern powering ResearchTeam + financial analysis teams |
| P1 | `ContentPipeline` | Sequential pipeline is table stakes |
| P2 | `FeaturePipeline` | Hybrid pattern. Depends on P0 + P1 components. |
| P2 | `GatedPipeline` + `Stage` + `Gate` | Requires V3 runtime for control flow gates |
| P3 | `TriageTeam` | Requires V3 runtime for dynamic routing |

## Not In Scope (Future)

| Feature | Why Not Now |
|---------|------------|
| Dynamic delegation (`canDelegate` prop) | Requires runtime agent-to-agent tool injection |
| Shared state / blackboard (`<SharedState>`) | Needs Claude Code memory API integration |
| Multi-workflow orchestration (Flows) | Requires multi-`<Workflow>` sequencing, event listeners |
| Agent Cards / capability discovery | Premature without a registry system |
| Adaptive replanning (Magentic-One ledger) | Complex runtime behavior, not expressible in static markdown |
