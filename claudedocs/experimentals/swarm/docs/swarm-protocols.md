# Swarm Protocols Reference

Extracted from `swarm-claude-code.md` — separating leader and worker responsibilities.

---

## Leader Protocols

### Team Lifecycle

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Create Team** | `Teammate({ operation: "spawnTeam", team_name: "..." })` | Before any swarm work. Creates team config and task directories. |
| **Cleanup Team** | `Teammate({ operation: "cleanup" })` | After all workers shut down. Removes team files. |

### Spawning Workers

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Spawn Subagent** | `Task({ subagent_type: "...", prompt: "..." })` | Short-lived, focused work. Returns result directly. No team membership. |
| **Spawn Teammate** | `Task({ team_name: "...", name: "...", subagent_type: "...", prompt: "...", run_in_background: true })` | Persistent workers. Join team, use inbox, claim tasks. |

### Task Management

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Create Task** | `TaskCreate({ subject: "...", description: "...", activeForm: "..." })` | Define work items before or during swarm execution. |
| **Set Dependencies** | `TaskUpdate({ taskId: "X", addBlockedBy: ["Y", "Z"] })` | Create pipeline — task X waits for Y and Z. |
| **Check Progress** | `TaskList()` | Monitor task states, see who owns what. |
| **Get Task Details** | `TaskGet({ taskId: "X" })` | Read full description, blockedBy, blocks. |

### Communication (Leader → Worker)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Message One Worker** | `Teammate({ operation: "write", target_agent_id: "worker-1", value: "..." })` | Direct instruction to specific worker. |
| **Message All Workers** | `Teammate({ operation: "broadcast", value: "..." })` | Critical announcements only (expensive — N messages). |

### Worker Lifecycle Control

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Request Shutdown** | `Teammate({ operation: "requestShutdown", target_agent_id: "worker-1", reason: "..." })` | Ask worker to exit gracefully. Worker must approve. |
| **Approve Join** | `Teammate({ operation: "approveJoin", target_agent_id: "...", request_id: "..." })` | Accept external agent joining team. |
| **Reject Join** | `Teammate({ operation: "rejectJoin", target_agent_id: "...", request_id: "...", reason: "..." })` | Decline join request. |
| **Approve Plan** | `Teammate({ operation: "approvePlan", target_agent_id: "...", request_id: "..." })` | Allow worker with `plan_mode_required` to proceed. |
| **Reject Plan** | `Teammate({ operation: "rejectPlan", target_agent_id: "...", request_id: "...", feedback: "..." })` | Send worker back to revise plan. |

### Monitoring

| Protocol | Method | When to Use |
|----------|--------|-------------|
| **Poll Task States** | `TaskList()` | Check completed/in_progress/pending counts. |
| **Read Inbox** | `cat ~/.claude/teams/{team}/inboxes/team-lead.json` | See worker messages and findings. |
| **Watch Inbox** | `tail -f ~/.claude/teams/{team}/inboxes/team-lead.json` | Real-time worker updates. |
| **Check Team Config** | `cat ~/.claude/teams/{team}/config.json` | See active members, backends. |

---

## Worker Protocols

### Task Claiming (Self-Organizing)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **List Available Tasks** | `TaskList()` | Find pending, unowned, unblocked tasks. |
| **Claim Task** | `TaskUpdate({ taskId: "X", owner: "$CLAUDE_CODE_AGENT_NAME" })` | Take ownership before starting work. |
| **Start Task** | `TaskUpdate({ taskId: "X", status: "in_progress" })` | Signal work has begun. |
| **Complete Task** | `TaskUpdate({ taskId: "X", status: "completed" })` | Signal work is done. Auto-unblocks dependents. |

### Task Execution (Assigned)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Get Assigned Task** | `TaskGet({ taskId: "X" })` | Read full description when leader assigns specific task. |
| **Update Progress** | `TaskUpdate({ taskId: "X", metadata: { checkpoint: "..." } })` | Store intermediate state (optional). |

### Communication (Worker → Leader)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Send Findings** | `Teammate({ operation: "write", target_agent_id: "team-lead", value: "..." })` | Report results, issues, completion. **Required** — text output not visible to team. |
| **Request Plan Approval** | Auto-sent when `plan_mode_required: true` | Worker in plan mode must wait for leader approval. |

### Communication (Worker → Worker)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Peer Message** | `Teammate({ operation: "write", target_agent_id: "worker-2", value: "..." })` | Coordinate with sibling worker. Share discoveries. |

### Shutdown

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Approve Shutdown** | `Teammate({ operation: "approveShutdown", request_id: "..." })` | **Required** when receiving `shutdown_request`. Terminates process. |
| **Reject Shutdown** | `Teammate({ operation: "rejectShutdown", request_id: "...", reason: "..." })` | Still working, need more time. |

### Joining Teams (External Agent)

| Protocol | Tool | When to Use |
|----------|------|-------------|
| **Discover Teams** | `Teammate({ operation: "discoverTeams" })` | Find teams to join. |
| **Request Join** | `Teammate({ operation: "requestJoin", team_name: "...", proposed_name: "...", capabilities: "..." })` | Ask leader for membership. |

---

## Protocol Dependencies

### Leader Must Do First

| Before This... | Leader Must... |
|----------------|----------------|
| Spawning teammates | `spawnTeam` to create team |
| Workers claiming tasks | `TaskCreate` to populate queue |
| Workers respecting pipeline | `TaskUpdate` with `addBlockedBy` |
| Cleanup | `requestShutdown` all workers and wait for approvals |

### Worker Depends On

| Worker Action | Requires |
|---------------|----------|
| `TaskUpdate({ owner: "..." })` | Task exists (leader created it) |
| `Teammate({ target_agent_id: "team-lead" })` | Team exists, worker is member |
| Task auto-unblocking | Leader set up `blockedBy` correctly |
| `approveShutdown` | Leader sent `requestShutdown` |

### Bidirectional Dependencies

| Flow | Leader | Worker |
|------|--------|--------|
| **Task Assignment** | Creates task, spawns worker with "do task #X" | Claims and executes |
| **Task Swarm** | Creates task pool, spawns workers with claim-loop | Polls, claims, executes, repeats |
| **Findings Delivery** | Must poll/watch inbox | Must `Teammate write` (text output invisible) |
| **Shutdown** | Sends `requestShutdown` | Must `approveShutdown` or `rejectShutdown` |
| **Plan Approval** | Must `approvePlan` or `rejectPlan` | Waits after submitting plan |

---

## Protocol Sequences

### Minimal Swarm (Leader Assigns)

```
Leader                              Worker
  │                                   │
  ├─ spawnTeam ─────────────────────► │
  ├─ TaskCreate ────────────────────► │
  ├─ Task(team_name, name, prompt) ──►│ (spawned)
  │                                   ├─ TaskUpdate(owner)
  │                                   ├─ TaskUpdate(in_progress)
  │                                   ├─ [work]
  │                                   ├─ TaskUpdate(completed)
  │◄─ Teammate write (findings) ──────┤
  ├─ requestShutdown ────────────────►│
  │◄─ approveShutdown ────────────────┤ (exits)
  ├─ cleanup ───────────────────────► │
  │                                   │
```

### Self-Organizing Swarm

```
Leader                              Workers (N)
  │                                   │
  ├─ spawnTeam ─────────────────────► │
  ├─ TaskCreate (×M tasks) ──────────►│
  ├─ Task (worker-1) ────────────────►│──┐
  ├─ Task (worker-2) ────────────────►│──┼─ (spawned in parallel)
  ├─ Task (worker-3) ────────────────►│──┘
  │                                   │
  │                                   ├─ TaskList (all workers)
  │                                   ├─ [race to claim]
  │                                   ├─ TaskUpdate(owner) ──► (winner)
  │                                   ├─ [work]
  │                                   ├─ TaskUpdate(completed)
  │◄─ Teammate write ─────────────────┤
  │                                   ├─ TaskList (repeat)
  │                                   │   ...until queue empty
  │                                   │
  ├─ requestShutdown (×N) ───────────►│
  │◄─ approveShutdown (×N) ───────────┤
  ├─ cleanup ───────────────────────► │
  │                                   │
```

### Pipeline (Sequential Dependencies)

```
Leader                              Workers
  │                                   │
  ├─ TaskCreate #1 (Research) ───────►│
  ├─ TaskCreate #2 (Plan) ───────────►│
  ├─ TaskCreate #3 (Implement) ──────►│
  ├─ TaskUpdate #2 blockedBy:[1] ────►│
  ├─ TaskUpdate #3 blockedBy:[2] ────►│
  │                                   │
  ├─ Task (researcher) ──────────────►│ claims #1
  ├─ Task (planner) ─────────────────►│ waits...
  ├─ Task (implementer) ─────────────►│ waits...
  │                                   │
  │                                   ├─ #1 completed
  │                                   │   └─► #2 unblocks
  │                                   ├─ #2 completed
  │                                   │   └─► #3 unblocks
  │                                   ├─ #3 completed
  │◄─ findings ───────────────────────┤
  │                                   │
```

---

## Quick Reference: Who Does What

| Action | Leader | Worker |
|--------|:------:|:------:|
| `spawnTeam` | ✅ | ❌ |
| `cleanup` | ✅ | ❌ |
| `TaskCreate` | ✅ | ✅ (if general-purpose) |
| `TaskUpdate` | ✅ | ✅ |
| `TaskList` | ✅ | ✅ |
| `TaskGet` | ✅ | ✅ |
| `write` to teammate | ✅ | ✅ |
| `broadcast` | ✅ | ⚠️ (expensive) |
| `requestShutdown` | ✅ | ❌ |
| `approveShutdown` | ❌ | ✅ |
| `approvePlan` | ✅ | ❌ |

---

## Anti-Patterns

| Don't | Why | Do Instead |
|-------|-----|------------|
| Worker uses `print`/text output for findings | Team can't see it | `Teammate write` to leader |
| Leader calls `cleanup` with active workers | Will fail | `requestShutdown` first, wait for approvals |
| Worker ignores `shutdown_request` | Leader blocks forever | Always `approveShutdown` or `rejectShutdown` |
| `broadcast` for routine messages | O(N) messages | `write` to specific target |
| Leader assigns same task to multiple workers | Race condition | Let workers self-claim OR assign 1:1 |
