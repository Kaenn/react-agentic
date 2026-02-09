# V2 Gap Analysis

Comparing proposed V2 components against full Claude Code swarm capabilities.

---

## Components in Full Example

| Component | Status | Value Assessment |
|-----------|--------|------------------|
| `<TaskPool>` | Recommended | **HIGH** - Core swarm pattern |
| `<Swarm>` | Recommended | **HIGH** - Core swarm pattern |
| `<ParallelWorkers>` | Recommended | **HIGH** - Common parallel review pattern |
| `<Message>` | Recommended | **MEDIUM** - Documents communication patterns |
| `<Broadcast>` | Under consideration | **LOW** - Expensive, rarely needed |
| `<TaskClaim>` | Under consideration | **LOW** - Verbose, same as inline JS |
| `<TaskStart>` | Under consideration | **LOW** - Verbose, same as inline JS |
| `<TaskComplete>` | Under consideration | **LOW** - Verbose, same as inline JS |

---

## What the Example Revealed

### 1. **TaskPool + Swarm Synergy**

These work together naturally:
```tsx
<TaskPool tasks={...} />  // Creates the work queue
<Swarm workerCount={3} /> // Creates workers to process it
```

**Gap identified:** Should `<Swarm>` auto-reference a preceding `<TaskPool>`?

**Option A:** Explicit (current)
```tsx
<TaskPool title="Reviews" tasks={...} />
<Swarm team={...} workerCount={3} prompt="..." />
```

**Option B:** Linked
```tsx
<TaskPool id="reviews" tasks={...} />
<Swarm pool="reviews" workerCount={3} />
```

**Recommendation:** Keep explicit. The prompt already tells workers what to look for.

---

### 2. **ParallelWorkers vs Multiple `<Teammate>`**

Current V1 already supports parallel specialists via `<Teammate>`:
```tsx
<Team team={...}>
  <Teammate worker={Security} prompt="..." />
  <Teammate worker={Perf} prompt="..." />
</Team>
```

`<ParallelWorkers>` adds:
- Explicit "these run in parallel" semantic
- Grouped mermaid visualization
- No need for wrapping `<Team>` context

**Question:** Is `<ParallelWorkers>` redundant with `<Teammate>`?

**Analysis:**
- `<Teammate>` inside `<Team>` = persistent team members
- `<ParallelWorkers>` = ad-hoc parallel execution (may or may not be team members)

**Recommendation:** Keep `<ParallelWorkers>` for clarity when you want N specialists to run simultaneously without team membership semantics.

---

### 3. **Task Lifecycle Components Are Verbose**

The example shows:
```tsx
<TaskClaim task={InventoryFiles} worker={Coordinator} />
<TaskStart task={InventoryFiles} />
<TaskComplete task={InventoryFiles} />
```

This generates:
```javascript
TaskUpdate({ taskId: "1", owner: "coordinator" })
TaskUpdate({ taskId: "1", status: "in_progress" })
TaskUpdate({ taskId: "1", status: "completed" })
```

**Problems:**
1. Same output as inline JS in prompts
2. These are runtime operations, not authoring patterns
3. Workers already do this via their prompts
4. Adds 3 components for marginal value

**Recommendation:** Skip. Workers handle task lifecycle in their prompts.

---

### 4. **Message vs Inline Teammate Call**

`<Message>` provides:
```tsx
<Message from={Security} to="team-lead">
  Found critical issue...
</Message>
```

Output:
```javascript
Teammate({ operation: "write", target_agent_id: "team-lead", value: "Found critical issue..." })
```

**Value:** Documents expected communication patterns in the workflow.

**Alternative:** Just write the JS in a code block manually.

**Recommendation:** Keep `<Message>` - it provides type safety (`from` accepts `WorkerRef`) and consistent formatting.

---

### 5. **Broadcast Is Rarely Needed**

From swarm-claude-code.md:
> **WARNING:** Broadcasting is expensive - sends N separate messages for N teammates.

The example shows:
```tsx
<Broadcast from="team-lead">
  ATTENTION ALL WORKERS: Critical vulnerability found...
</Broadcast>
```

**Use cases:**
- Emergency stop
- Major priority change
- End-of-workflow announcements

**Recommendation:** Include with strong warning annotation, or skip entirely.

---

## Missing from V2 Proposal

### 1. **Swarm Prompt Templates**

The swarm worker prompt is boilerplate:
```
1. TaskList() - find pending tasks
2. Claim: TaskUpdate({ taskId, owner: "$CLAUDE_CODE_AGENT_NAME" })
3. Start: TaskUpdate({ taskId, status: "in_progress" })
4. Do work
5. Complete: TaskUpdate({ taskId, status: "completed" })
6. Report to team-lead
7. Repeat
```

**Proposal: `SwarmPrompt` helper**
```tsx
import { SwarmPrompt } from 'react-agentic/swarm';

<Swarm
  prompt={SwarmPrompt.standard({
    taskFilter: 'subject contains "Audit"',
    reportTo: 'team-lead',
    exitCondition: 'no pending tasks after 2 checks'
  })}
/>
```

**Priority:** Medium - reduces boilerplate, prevents errors.

---

### 2. **WorkerRef Array from Swarm**

`<Swarm>` generates N workers but doesn't return refs:
```tsx
<Swarm workerCount={3} ... />
// How to reference worker-1, worker-2, worker-3 in ShutdownSequence?
```

**Current workaround:**
```tsx
const swarmWorkers = [
  defineWorker('worker-1', AgentType.GeneralPurpose),
  defineWorker('worker-2', AgentType.GeneralPurpose),
  defineWorker('worker-3', AgentType.GeneralPurpose),
];

<Swarm workers={swarmWorkers} ... />
<ShutdownSequence workers={swarmWorkers} ... />
```

**Better API:**
```tsx
const swarm = createSwarm({
  count: 3,
  type: AgentType.GeneralPurpose,
  namePrefix: 'auditor'
});

<Swarm config={swarm} prompt="..." />
<ShutdownSequence workers={swarm.workers} ... />
```

**Priority:** High - needed for proper shutdown.

---

### 3. **Diamond Dependencies in TaskPipeline**

V1 `<TaskPipeline>` only supports linear chains with `autoChain`.

The example needs:
```
inventory -> classify -> prioritize
                              |
              +---------------+---------------+
              v               v               v
         audit-1          audit-2          audit-3
              |               |               |
              +---------------+---------------+
                              v
                          aggregate -> report -> tickets
```

**Current workaround:** Manual `blockedBy` props:
```tsx
<TaskDef task={AggregateFindings} blockedBy={[...allAuditTasks]} />
```

**Better API: Parallel branches**
```tsx
<TaskPipeline title="Audit">
  <TaskDef task={Prioritize} />
  <TaskParallel>
    <TaskDef task={Audit1} />
    <TaskDef task={Audit2} />
    <TaskDef task={Audit3} />
  </TaskParallel>
  <TaskDef task={Aggregate} />
</TaskPipeline>
```

**Priority:** Medium - manual blockedBy works, but this is cleaner.

---

### 4. **Pool-to-Pipeline Connection**

How do we express "wait for all pool tasks before starting synthesis"?

**Current:**
```tsx
<TaskPool tasks={criticalTasks} />
<TaskDef task={Aggregate} blockedBy={criticalTasks.map(t => t.task)} />
```

**Cleaner:**
```tsx
<TaskPool id="audits" tasks={criticalTasks} />
<TaskDef task={Aggregate} blockedBy={pool("audits")} />
```

Or:
```tsx
const auditPool = createTaskPool(criticalTasks);
<TaskPool pool={auditPool} />
<TaskDef task={Aggregate} blockedBy={auditPool.all()} />
```

**Priority:** Medium - explicit is fine, but helpers reduce errors.

---

### 5. **Swarm Exit Condition**

Swarm workers need to know when to stop. Currently in prompt:
```
EXIT when TaskList shows no pending audit tasks after 2 checks.
```

**Proposal: Explicit prop**
```tsx
<Swarm
  exitCondition={{
    type: 'no_pending_tasks',
    filter: 'subject contains "Audit"',
    retryCount: 2,
    retryDelaySeconds: 30
  }}
/>
```

**Priority:** Low - prompt is flexible enough.

---

## Revised V2 Recommendation

### Must Have (Core Swarm)
| Component | Rationale |
|-----------|-----------|
| `<TaskPool>` | Core swarm pattern |
| `<Swarm>` | Core swarm pattern |
| `createSwarm()` helper | Returns WorkerRef[] for shutdown |

### Should Have (Quality of Life)
| Component | Rationale |
|-----------|-----------|
| `<ParallelWorkers>` | Common pattern, clear semantics |
| `<Message>` | Type-safe communication documentation |
| `SwarmPrompt.standard()` | Reduces boilerplate |

### Nice to Have (V2.1?)
| Component | Rationale |
|-----------|-----------|
| `<TaskParallel>` | Diamond dependencies in pipelines |
| `createTaskPool()` | Pool refs for blockedBy |
| `<Broadcast>` | Rare but sometimes needed |

### Skip (Not Worth API Surface)
| Component | Rationale |
|-----------|-----------|
| `<TaskClaim>` | Runtime operation, use prompt |
| `<TaskStart>` | Runtime operation, use prompt |
| `<TaskComplete>` | Runtime operation, use prompt |

---

## Final V2 Component List

```typescript
// Core swarm
export { TaskPool } from './components/TaskPool';
export { Swarm } from './components/Swarm';
export { createSwarm } from './factories/createSwarm';

// Parallel execution
export { ParallelWorkers } from './components/ParallelWorkers';

// Communication
export { Message } from './components/Message';

// Helpers
export { SwarmPrompt } from './helpers/SwarmPrompt';
```

**Total: 4 components + 2 helpers**
