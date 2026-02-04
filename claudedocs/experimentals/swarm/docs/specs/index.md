# Claude Code Swarm TSX Component Specs

This directory contains specification files for each TSX component that renders to markdown.

## Shared Enums & Helpers

All enums and task helpers are defined in [`enums.ts`](./enums.ts):

```typescript
import {
  // Enums
  AgentType,
  PluginAgentType,
  Model,
  MessageType,
  TaskStatus,
  CalloutType,
  BackendType,
  TeammateOperation,
  CodeLanguage,

  // Task Reference System
  TaskRef,
  defineTask,
  resetTaskIds,

  // Worker Reference System
  WorkerRef,
  defineWorker,
  resetWorkerIds,

  // Team Reference System
  TeamRef,
  defineTeam,
  addToTeam,
  resetTeamIds,

  // Pipeline Builder
  createPipeline,
  Pipeline,
  PipelineBuilder,

  // Task Pool Helpers
  createTaskPool,
  createFileReviewPool,
  TaskPoolResult,
  createTaskPoolWithDeps,
  createFileReviewPoolWithDeps,
  TaskPoolWithDeps,

  // Conditional Rendering
  when,
  If,

  // Variable Interpolation
  Variables,
  interpolate,
  createPromptTemplate,
  t,

  // Common Props Factories
  AgentDefaults,
  createReviewDefaults,
  createImplementDefaults,
  createResearchDefaults,
  createTestDefaults,

  // Workflow Factories
  createReviewWorkflow,
  createPipelineWorkflow,
  createSwarmWorkflow,

  // Dependency Combinators
  combine,
  allOf,
  dependencyGroup,
  atLeast,

  // Iteration Helpers
  mapToTasks,
  mapToWorkers,

  // Batch Operations
  batchTasks,
  batchWorkers,

  // Reset All
  resetAllIds
} from './enums';
```

### Enums

| Enum | Values | Used By |
|------|--------|---------|
| `AgentType` | Bash, Explore, Plan, GeneralPurpose, ... | Agent, Teammate, Swarm |
| `PluginAgentType` | SecuritySentinel, PerformanceOracle, ... | Agent, Teammate, ParallelWorkers |
| `Model` | Haiku, Sonnet, Opus | Agent, Teammate, Swarm |
| `MessageType` | Text, ShutdownRequest, TaskCompleted, ... | Message |
| `TaskStatus` | Pending, InProgress, Completed, Deleted | TaskDef |
| `CalloutType` | Info, Warning, Danger, Tip | Callout |
| `BackendType` | InProcess, Tmux, ITerm2 | SpawnBackend |
| `TeammateOperation` | SpawnTeam, Write, Broadcast, ... | (operations) |
| `CodeLanguage` | JavaScript, TypeScript, JSON, Bash, ... | CodeBlock |

### Task Helpers

| Helper | Purpose | Returns |
|--------|---------|---------|
| `defineTask(name, subject)` | Create a task with auto-ID | `TaskRef` |
| `createPipeline(title)` | Builder for sequential tasks | `PipelineBuilder` |
| `createTaskPool(items)` | Pool of independent tasks | `TaskPoolResult` |
| `createFileReviewPool(files)` | Pool for file reviews | `TaskPoolResult` |
| `createTaskPoolWithDeps(items)` | Pool with computed deps | `TaskPoolWithDeps` |
| `createFileReviewPoolWithDeps(files)` | File pool with deps | `TaskPoolWithDeps` |
| `resetTaskIds()` | Reset ID counter | `void` |

### Worker & Team Helpers

| Helper | Purpose | Returns |
|--------|---------|---------|
| `defineWorker(name, type, model?)` | Create worker with auto-ID | `WorkerRef` |
| `defineTeam(name, members?)` | Create team with auto-ID | `TeamRef` |
| `addToTeam(team, worker)` | Add worker to team | `TeamRef` |
| `resetWorkerIds()` | Reset worker ID counter | `void` |
| `resetTeamIds()` | Reset team ID counter | `void` |
| `resetAllIds()` | Reset all ID counters | `void` |

### Conditional Rendering

| Helper | Purpose | Returns |
|--------|---------|---------|
| `when(condition, value)` | Conditional value | `T \| undefined` |
| `<If when={bool}>` | Conditional rendering | `ReactNode` |

### Variable Interpolation

| Helper | Purpose | Returns |
|--------|---------|---------|
| `interpolate(template, vars)` | Replace `${var}` in string | `string` |
| `createPromptTemplate(template)` | Reusable template function | `(vars) => string` |
| `` t`template` `` | Tagged template literal | `string` |

### Common Props Factories

| Helper | Purpose | Returns |
|--------|---------|---------|
| `createReviewDefaults(model?)` | Default review props | `AgentDefaults` |
| `createImplementDefaults(model?)` | Default implement props | `AgentDefaults` |
| `createResearchDefaults(model?)` | Default research props | `AgentDefaults` |
| `createTestDefaults(model?)` | Default test props | `AgentDefaults` |

### Workflow Factories

| Helper | Purpose | Returns |
|--------|---------|---------|
| `createReviewWorkflow(config)` | Complete review workflow | `ReviewWorkflowResult` |
| `createPipelineWorkflow(config)` | Pipeline with workers | `PipelineWorkflowResult` |
| `createSwarmWorkflow(config)` | Swarm with workers | `SwarmWorkflowResult` |

### Dependency Combinators

| Helper | Purpose | Returns |
|--------|---------|---------|
| `combine(...refs)` | Merge refs into array | `TaskRef[]` |
| `allOf(...sources)` | All tasks from sources | `TaskRef[]` |
| `dependencyGroup(name, tasks)` | Named dependency group | `DependencyGroup` |
| `atLeast(n, tasks)` | Quorum dependency | `QuorumDependency` |

### Iteration & Batch Helpers

| Helper | Purpose | Returns |
|--------|---------|---------|
| `mapToTasks(items, mapper)` | Map items to tasks | `TaskRef[]` |
| `mapToWorkers(items, mapper)` | Map items to workers | `WorkerRef[]` |
| `batchTasks(prefix, configs)` | Create related tasks | `BatchTaskResult` |
| `batchWorkers(prefix, configs)` | Create related workers | `BatchWorkerResult` |

---

## Component Overview

| Component | Purpose | Spec File |
|-----------|---------|-----------|
| **Primitives** | | |
| `<Team>` | Define a team container | [Team.spec.tsx](./Team.spec.tsx) |
| `<Teammate>` | Define a team member | [Teammate.spec.tsx](./Teammate.spec.tsx) |
| `<Prompt>` | Container for agent prompts | [Prompt.spec.tsx](./Prompt.spec.tsx) |
| **Task Management** | | |
| `<TaskDef>` | Single task definition | [TaskDef.spec.tsx](./TaskDef.spec.tsx) |
| `<TaskPipeline>` | Sequential tasks with dependencies | [TaskPipeline.spec.tsx](./TaskPipeline.spec.tsx) |
| `<TaskPool>` | Independent tasks for swarm | [TaskPool.spec.tsx](./TaskPool.spec.tsx) |
| **Messaging** | | |
| `<Message>` | Agent-to-agent message | [Message.spec.tsx](./Message.spec.tsx) |
| `<Broadcast>` | Message to all teammates | [Broadcast.spec.tsx](./Broadcast.spec.tsx) |
| **Patterns** | | |
| `<OrchestrationPattern>` | Pattern documentation container | [OrchestrationPattern.spec.tsx](./OrchestrationPattern.spec.tsx) |
| `<ParallelWorkers>` | Spawn multiple workers in parallel | [ParallelWorkers.spec.tsx](./ParallelWorkers.spec.tsx) |
| `<Swarm>` | Self-organizing worker pool | [Swarm.spec.tsx](./Swarm.spec.tsx) |
| **Lifecycle** | | |
| `<ShutdownSequence>` | Graceful shutdown code | [ShutdownSequence.spec.tsx](./ShutdownSequence.spec.tsx) |
| `<WorkflowSteps>` | Full workflow lifecycle steps | [WorkflowSteps.spec.tsx](./WorkflowSteps.spec.tsx) |
| `<Workflow>` | Top-level workflow container | [Workflow.spec.tsx](./Workflow.spec.tsx) |
| **Helpers** | | |
| `<Callout>` | Callout blocks (info, warning, etc.) | [Callout.spec.tsx](./Callout.spec.tsx) |
| `<CodeBlock>` | Fenced code blocks | [CodeBlock.spec.tsx](./CodeBlock.spec.tsx) |
| `<MarkdownTable>` | Markdown tables | [MarkdownTable.spec.tsx](./MarkdownTable.spec.tsx) |
| `<AgentTypeDef>` | Agent type documentation | [AgentTypeDef.spec.tsx](./AgentTypeDef.spec.tsx) |
| `<SpawnBackend>` | Spawn backend documentation | [SpawnBackend.spec.tsx](./SpawnBackend.spec.tsx) |

---

## Spec File Structure

Each spec file follows this structure:

```typescript
/**
 * @component ComponentName
 * @description Brief description
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface ComponentProps {
  // Props with JSDoc comments
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Component(props) {
  // Implementation placeholder
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Multiple examples showing different use cases

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Each example shows what markdown it renders to
 */
```

---

## Key Patterns

### Auto-ID and Type-Safe Task References

Instead of manual string IDs:

```tsx
// ❌ Error-prone, no type safety
<TaskDef id="1" subject="Research" description="..." />
<TaskDef id="2" subject="Plan" description="..." blockedBy={["1"]} />  // Easy to typo!
```

Use `defineTask()` for type-safe references:

```tsx
// ✅ Type-safe, auto-generated IDs
import { defineTask } from './TaskDef.spec';

const Research = defineTask('research', 'Research');
const Plan = defineTask('plan', 'Create plan');
const Implement = defineTask('implement', 'Implement');

<TaskDef task={Research} description="..." />
<TaskDef task={Plan} description="..." blockedBy={[Research]} />  // Type-safe!
<TaskDef task={Implement} description="..." blockedBy={[Plan]} />
```

### Auto-Chaining Pipelines

For sequential tasks:

```tsx
// ✅ Auto-chain handles dependencies
<TaskPipeline title="Feature Pipeline" autoChain>
  <TaskDef name="research" subject="Research" description="..." />
  <TaskDef name="plan" subject="Plan" description="..." />      {/* auto-blocked by research */}
  <TaskDef name="implement" subject="Implement" description="..." /> {/* auto-blocked by plan */}
</TaskPipeline>
```

### Pipeline Builder Pattern

Most concise for simple pipelines:

```tsx
const pipeline = createPipeline('OAuth Feature')
  .task('research', 'Research OAuth')
  .task('plan', 'Create plan')
  .task('implement', 'Build OAuth')
  .task('test', 'Write tests')
  .build();

// Access tasks: pipeline.tasks.research, pipeline.tasks.plan, etc.
```

### Using `<Prompt>` for Better Readability

Instead of inline prompts:

```tsx
// ❌ Hard to read
<Teammate name="worker" type="general-purpose" prompt="Long prompt here..." />
```

Use the `<Prompt>` component:

```tsx
// ✅ Much cleaner
<Teammate name="worker" type="general-purpose">
  <Prompt>
    {`Long prompt here with
    multiple lines
    and clear formatting`}
  </Prompt>
</Teammate>
```

### Composing Workflows

Workflows compose multiple components:

```tsx
<Workflow name="Code Review" team="review">
  <Team name="review">
    <Teammate name="security" type="security-sentinel">
      <Prompt>Review for security issues</Prompt>
    </Teammate>
  </Team>

  <ParallelWorkers teamName="review" workers={[...]}>
    <Prompt name="security">...</Prompt>
  </ParallelWorkers>

  <ShutdownSequence teammates={["security"]} />
</Workflow>
```

---

## Dynamic Patterns

### Worker & Team References

Define workers and teams with auto-generated IDs:

```tsx
// Define workers
const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
const Perf = defineWorker('perf', PluginAgentType.PerformanceOracle);

// Define team with members
const ReviewTeam = defineTeam('reviewers', [Security, Perf]);

// Type-safe usage
<Team ref={ReviewTeam}>
  <Teammate worker={Security} description="..." />
  <Teammate worker={Perf} description="..." />
</Team>

<Message from={Security} to={Perf} content="Found issue" />
```

### Conditional Rendering

Conditionally include components:

```tsx
// Using when() helper
<TaskDef
  task={Deploy}
  description="Deploy to production"
  when={process.env.NODE_ENV === 'production'}
/>

// Using <If> component
<If when={isProduction}>
  <TaskDef task={Deploy} description="Deploy" />
</If>
```

### Variable Interpolation

Use templates with variables:

```tsx
// Simple interpolation
const vars = { repo: 'my-app', branch: 'main' };
const prompt = interpolate('Review ${repo} on ${branch}', vars);

// Reusable template
const reviewPrompt = createPromptTemplate('Review ${file} for ${concern}');
reviewPrompt({ file: 'user.rb', concern: 'security' });

// Tagged template literal
const file = 'user.rb';
const prompt = t`Review ${file} for security issues`;
```

### Spread Common Props

Share common configuration:

```tsx
const reviewDefaults = createReviewDefaults(Model.Sonnet);

<Teammate name="security" type={PluginAgentType.SecuritySentinel} {...reviewDefaults} />
<Teammate name="perf" type={PluginAgentType.PerformanceOracle} {...reviewDefaults} />
```

### Workflow Factories

Create complete workflows with one call:

```tsx
// Review workflow
const workflow = createReviewWorkflow({
  files: ['user.rb', 'payment.rb'],
  reviewers: [PluginAgentType.SecuritySentinel, PluginAgentType.PerformanceOracle]
});

// workflow.team - TeamRef
// workflow.workers - WorkerRef[]
// workflow.taskPool - TaskPoolResult

// Pipeline workflow
const pipelineWorkflow = createPipelineWorkflow({
  title: 'Feature Development',
  stages: [
    { name: 'research', subject: 'Research', agentType: AgentType.Explore },
    { name: 'implement', subject: 'Implement', agentType: AgentType.GeneralPurpose }
  ]
});
```

### Computed Dependencies

Use pool helpers for complex dependencies:

```tsx
const pool = createTaskPoolWithDeps([
  { name: 'review-1', subject: 'Review file 1' },
  { name: 'review-2', subject: 'Review file 2' },
  { name: 'review-3', subject: 'Review file 3' }
]);

// Wait for ALL tasks
<TaskDef task={Integration} blockedBy={pool.all()} />

// Wait for first 2 tasks
<TaskDef task={QuickCheck} blockedBy={pool.first(2)} />

// Wait for last task
<TaskDef task={Final} blockedBy={pool.last(1)} />

// Filter tasks
<TaskDef task={Critical} blockedBy={pool.filter(t => t.name.includes('critical'))} />
```

### Dependency Combinators

Combine dependencies from multiple sources:

```tsx
// Combine individual refs and arrays
const deps = combine(Task1, Task2, pool.first(2));

// All from multiple sources
const allDeps = allOf(
  frontendTasks.all(),
  backendTasks.all(),
  testTask
);

// Named dependency group (for documentation)
const criticalPath = dependencyGroup('Critical Path', [Research, Design, Implement]);

// Quorum dependency (at least N must complete)
const quorum = atLeast(2, [Task1, Task2, Task3]);
```

### Batch Operations

Create multiple related items at once:

```tsx
// Batch tasks
const { tasks, refs } = batchTasks('review', [
  { suffix: 'security', subject: 'Security Review' },
  { suffix: 'perf', subject: 'Performance Review' },
  { suffix: 'arch', subject: 'Architecture Review' }
]);

// Access: refs.security, refs.perf, refs.arch

// Batch workers
const { workers, refs: workerRefs } = batchWorkers('reviewer', [
  { suffix: 'security', type: PluginAgentType.SecuritySentinel },
  { suffix: 'perf', type: PluginAgentType.PerformanceOracle }
]);
```

### Mapping Items to Refs

Transform data into refs:

```tsx
// Map files to tasks
const files = ['user.rb', 'payment.rb', 'api.rb'];
const tasks = mapToTasks(files, (file) => ({
  name: file.replace('.rb', ''),
  subject: `Review ${file}`
}));

// Map types to workers
const reviewTypes = ['security', 'performance'];
const workers = mapToWorkers(reviewTypes, (type) => ({
  name: type,
  type: PluginAgentType[type.charAt(0).toUpperCase() + type.slice(1)]
}));
```

---

## Rendering to Markdown

Each component returns a markdown string. To render a complete workflow:

```typescript
import { Workflow, Team, Teammate, Prompt } from './swarm-tsx-components';

function MyWorkflow() {
  return (
    <Workflow name="My Workflow" team="my-team">
      {/* components */}
    </Workflow>
  );
}

// Render to markdown string
const markdown = renderToMarkdown(MyWorkflow);

// Write to file
fs.writeFileSync('workflow.md', markdown);
```

---

## Files in This Directory

```
docs/specs/
├── index.md                      # This file
├── enums.ts                      # Shared enums for all components
├── AgentTypeDef.spec.tsx         # AgentTypeDef component
├── Broadcast.spec.tsx            # Broadcast component
├── Callout.spec.tsx              # Callout component (was Note)
├── CodeBlock.spec.tsx            # CodeBlock component
├── MarkdownTable.spec.tsx        # MarkdownTable component (was Table)
├── Message.spec.tsx              # Message component
├── OrchestrationPattern.spec.tsx # OrchestrationPattern component (was Pattern)
├── ParallelWorkers.spec.tsx      # ParallelWorkers component
├── Prompt.spec.tsx               # Prompt component
├── ShutdownSequence.spec.tsx     # ShutdownSequence component
├── SpawnBackend.spec.tsx         # SpawnBackend component (was Backend)
├── Swarm.spec.tsx                # Swarm component
├── TaskDef.spec.tsx              # TaskDef component
├── TaskPipeline.spec.tsx         # TaskPipeline component
├── TaskPool.spec.tsx             # TaskPool component
├── Team.spec.tsx                 # Team component
├── Teammate.spec.tsx             # Teammate component
├── Workflow.spec.tsx             # Workflow component
└── WorkflowSteps.spec.tsx        # WorkflowSteps component (was Lifecycle)
```
