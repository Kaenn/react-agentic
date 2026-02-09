# Golden Path Gaps Analysis

Comparison between our swarm implementation output and Claude Code's `swarm-claude-code.md` primitives.

**Generated:** 2026-02-04

---

## Summary

| Category | Implemented | Missing | Priority |
|----------|-------------|---------|----------|
| Team Operations | 3/13 | 10 | Medium |
| Task System | 3/6 | 3 | Low |
| Orchestration Patterns | 2/6 | 4 | High |
| Output Format | 6/8 | 2 | Medium |
| Documentation | Partial | Multiple | Medium |

---

## GAP-1: Missing TeammateTool Operations

**Status:** DEFERRED → FUTURE_FEATURES.md (Phase 8)

**Decision:** These are future features, not golden path gaps. Most are runtime operations.

**What swarm-claude-code.md has:**

| Operation | Purpose | Our Support |
|-----------|---------|-------------|
| `spawnTeam` | Create a team | ✅ `<Team>` |
| `discoverTeams` | List available teams | ❌ |
| `requestJoin` | Request to join team | ❌ |
| `approveJoin` | Accept join request | ❌ |
| `rejectJoin` | Decline join request | ❌ |
| `write` | Message one teammate | ❌ |
| `broadcast` | Message all teammates | ❌ |
| `requestShutdown` | Ask teammate to exit | ✅ `<ShutdownSequence>` |
| `approveShutdown` | Accept shutdown | ❌ (teammate-side) |
| `rejectShutdown` | Decline shutdown | ❌ |
| `approvePlan` | Approve plan | ❌ |
| `rejectPlan` | Reject plan with feedback | ❌ |
| `cleanup` | Remove team resources | ✅ `<ShutdownSequence>` |

**Impact:** Users cannot author workflows with:
- Inter-agent messaging
- Plan approval workflows
- Dynamic team joining

**Potential Components:**
```tsx
<Message to={Security} value="Prioritize auth module" />
<Broadcast value="Status check: report progress" />
<ApprovePlan target={Architect} requestId="plan-123" />
<RejectPlan target={Architect} requestId="plan-123" feedback="Add rate limiting" />
```

**Resolution:** Already in FUTURE_FEATURES.md Phase 8. No action needed for golden path.

---

## GAP-2: Task Lifecycle Operations Missing

**Status:** DEFERRED → FUTURE_FEATURES.md (Phase 8.5)

**Decision:** Move to future features. Useful for complex workflows.

**What swarm-claude-code.md has:**

| Operation | Purpose | Our Support |
|-----------|---------|-------------|
| `TaskCreate` | Create work item | ✅ `<TaskDef>` |
| `TaskList` | See all tasks | ❌ (runtime only) |
| `TaskGet` | Get task details | ❌ (runtime only) |
| `TaskUpdate` (dependencies) | Set blockedBy | ✅ `<TaskDef blockedBy>` |
| `TaskUpdate` (claim) | Set owner | ❌ |
| `TaskUpdate` (status) | in_progress/completed | ❌ |

**Impact:** Our generated output only creates tasks and sets dependencies. It doesn't:
- Claim tasks for specific workers
- Update task status during execution
- Query task state

**Note:** These are likely runtime operations, not compile-time. May not need components.

**Resolution:** Added to FUTURE_FEATURES.md Phase 8.5 (`<TaskClaim>`, `<TaskStart>`, `<TaskComplete>`).

---

## GAP-3: Model Property Not Emitted in Task()

**Status:** ✅ FIXED (Already Implemented)

**What we have:**
```tsx
// TeammateProps includes model
model?: Model | string;
```

**What we emit:**
```javascript
Task({
  team_name: "db-migration",
  name: "planner",
  subagent_type: "Plan",
  description: "Plans migration strategy",
  prompt: `...`,
  run_in_background: true
  // ❌ No model property!
})
```

**What swarm-claude-code.md shows:**
```javascript
Task({
  subagent_type: "Explore",
  description: "Find auth files",
  prompt: "...",
  model: "haiku"  // ✅ model property
})
```

**Impact:** Users cannot specify model preference (haiku/sonnet/opus) for teammates.

**Fix Required:** Update `TeammateEmitter` to include `model` when specified.

**Resolution:** TO_FIX

**Fix Details:**
1. **Type:** Keep `Model | string` (Enum for known models, string for flexibility)
2. **Location:** Teammate emitter (transformer or emitter)
3. **Behavior:** Only emit `model` property when specified (not undefined)

**Expected Output After Fix:**
```javascript
Task({
  team_name: "db-migration",
  name: "planner",
  subagent_type: "Plan",
  description: "Plans migration strategy",
  prompt: `...`,
  model: "haiku",  // ✅ Now emitted
  run_in_background: true
})
```

**Files to Modify:**
- `src/emitter/swarm/TeammateEmitter.ts` (or equivalent)
- Verify `src/components/swarm/Teammate.tsx` already accepts `Model | string`

---

## GAP-4: Missing `mode: "plan"` Support

**Status:** ✅ FIXED

**What swarm-claude-code.md has:**
```javascript
Task({
  team_name: "careful-work",
  name: "architect",
  subagent_type: "Plan",
  prompt: "Design an implementation plan...",
  mode: "plan",  // Requires plan approval
  run_in_background: true
})
```

**Impact:** Cannot author workflows requiring plan approval before implementation.

**Potential Component:**
```tsx
<Teammate
  worker={Architect}
  description="Design implementation"
  prompt="..."
  requiresPlanApproval  // or mode="plan"
/>
```

**Resolution:** TO_FIX (use `mode` prop, not `requiresPlanApproval`)

**Fix Details:**
1. **Prop name:** `mode` (flexible for future modes)
2. **Type:** `TaskMode | string` (Enum for known modes, string for flexibility)
3. **Enum:** Create `TaskMode` enum with `Plan` value (extensible later)
4. **Behavior:** Only emit `mode` property when specified

**New Enum:**
```typescript
// src/components/swarm/enums.ts
export const TaskMode = {
  Plan: 'plan',
} as const;
export type TaskMode = (typeof TaskMode)[keyof typeof TaskMode];
```

**Component Update:**
```tsx
// TeammateProps
mode?: TaskMode | string;
```

**Usage:**
```tsx
<Teammate
  worker={Architect}
  description="Design implementation"
  prompt="..."
  mode="plan"  // or mode={TaskMode.Plan}
/>
```

**Expected Output After Fix:**
```javascript
Task({
  team_name: "careful-work",
  name: "architect",
  subagent_type: "Plan",
  description: "Design implementation",
  prompt: `...`,
  mode: "plan",  // ✅ Now emitted
  run_in_background: true
})
```

**Files to Modify:**
- `src/components/swarm/enums.ts` - Add `TaskMode` enum
- `src/components/swarm/Teammate.tsx` - Add `mode` prop to `TeammateProps`
- `src/components/swarm/index.ts` - Export `TaskMode`
- `src/index.ts` - Re-export `TaskMode`
- Teammate emitter/transformer - Emit `mode` when specified

---

## GAP-5: Missing Orchestration Patterns

**Status:** DEFERRED → FUTURE_FEATURES.md (Already covered)

**Patterns in swarm-claude-code.md:**

| Pattern | Our Support | Description |
|---------|-------------|-------------|
| Parallel Specialists | ✅ | Multiple reviewers in parallel |
| Pipeline | ✅ | Sequential dependencies with autoChain |
| Swarm (Self-Organizing) | ❌ | Workers poll and claim from task pool |
| Research + Implementation | ❌ | Sync research, then async implementation |
| Plan Approval Workflow | ❌ | Require approval before execution |
| Coordinated Multi-File | ❌ | Complex dependency graphs |

**Swarm Pattern Example (not supported):**
```javascript
// Worker that polls and claims tasks
const swarmPrompt = `
  1. Call TaskList() to see available tasks
  2. Find a pending task with no owner
  3. Claim it with TaskUpdate
  4. Do the work
  5. Mark it completed
  6. Repeat
`
```

**Impact:** Cannot author self-organizing swarms where workers autonomously claim work.

**Resolution:** DEFERRED
- Swarm pattern → FUTURE_FEATURES.md Phase 6 (`<TaskPool>`, `<Swarm>`)
- Plan Approval → Fixed by GAP-4 (`mode="plan"`)
- Coordinated Multi-File → Already works with `blockedBy`
- Research + Implementation → Usage pattern (document in examples)

---

## GAP-6: No Inbox Monitoring Guidance

**Status:** ✅ FIXED

**What swarm-claude-code.md provides:**
```bash
# Check teammate inboxes
cat ~/.claude/teams/{team}/inboxes/{agent}.json | jq '.'

# Watch for new messages
tail -f ~/.claude/teams/{team}/inboxes/team-lead.json
```

**What our generated output has:**
```javascript
// 2. Wait for shutdown_approved messages
// Check ~/.claude/teams/db-migration/inboxes/team-lead.json for:
// {"type": "shutdown_approved", "from": "planner", ...}
```

**Impact:** Comments mention inbox but no guidance on:
- How to poll/monitor inbox
- What message types to expect
- How to parse and respond

**Resolution:** TO_FIX

**Fix Details:**
1. **Location:** `<ShutdownSequence>` emitter output
2. **Enhancement:** Add explicit bash commands and polling guidance

**Current Output:**
```javascript
// 2. Wait for shutdown_approved messages
// Check ~/.claude/teams/db-migration/inboxes/team-lead.json for:
// {"type": "shutdown_approved", "from": "planner", ...}
```

**Expected Output After Fix:**
```javascript
// 2. Wait for shutdown_approved messages
// Poll inbox until all workers approve:

// Check inbox:
// cat ~/.claude/teams/db-migration/inboxes/team-lead.json | jq '.[] | select(.type == "shutdown_approved")'

// Expected messages:
// {"type": "shutdown_approved", "from": "planner", "requestId": "shutdown-xxx", ...}
// {"type": "shutdown_approved", "from": "executor", "requestId": "shutdown-xxx", ...}
// {"type": "shutdown_approved", "from": "validator", "requestId": "shutdown-xxx", ...}

// Once all 3 shutdown_approved messages received, proceed to cleanup
```

**Files to Modify:**
- `src/emitter/swarm/ShutdownSequenceEmitter.ts` (or equivalent)

---

## GAP-7: Environment Variables Not Documented

**Status:** DEFERRED (Low Priority - Documentation Only)

**What swarm-claude-code.md documents:**
```bash
CLAUDE_CODE_TEAM_NAME="my-project"
CLAUDE_CODE_AGENT_ID="worker-1@my-project"
CLAUDE_CODE_AGENT_NAME="worker-1"
CLAUDE_CODE_AGENT_TYPE="Explore"
CLAUDE_CODE_AGENT_COLOR="#4A90D9"
CLAUDE_CODE_PLAN_MODE_REQUIRED="false"
CLAUDE_CODE_PARENT_SESSION_ID="session-xyz"
```

**Usage in prompts:**
```javascript
prompt: "Your name is $CLAUDE_CODE_AGENT_NAME. Use it when sending messages."
```

**Impact:** Users don't know about available env vars for prompt templating.

**Resolution:** DEFERRED - Low priority documentation enhancement. Can add to `docs/swarm.md` later.

---

## GAP-8: Spawn Backends Not Documented

**Status:** DEFERRED (Low Priority - Documentation Only)

**What swarm-claude-code.md covers:**
- `in-process` - Same Node.js process (default)
- `tmux` - Separate terminal panes
- `iterm2` - iTerm2 split panes

**Impact:** Users don't understand visibility/persistence tradeoffs.

**Resolution:** DEFERRED - Low priority documentation enhancement.

---

## GAP-9: Error Handling Patterns Not Documented

**Status:** DEFERRED (Low Priority - Documentation Only)

**What swarm-claude-code.md covers:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Cannot cleanup with active members" | Teammates still running | requestShutdown first |
| "Already leading a team" | Team exists | cleanup first |
| "Agent not found" | Wrong name | Check config.json |
| "Team does not exist" | No team | spawnTeam first |

**Impact:** Users hit errors without guidance.

**Resolution:** DEFERRED - Low priority documentation enhancement.

---

## GAP-10: Message Format Structures Not Documented

**Status:** DEFERRED (Low Priority - Documentation Only)

**What swarm-claude-code.md documents:**

```json
// Shutdown Request
{
  "type": "shutdown_request",
  "requestId": "shutdown-abc123@worker-1",
  "from": "team-lead",
  "reason": "All tasks complete",
  "timestamp": "2026-01-25T23:38:32.588Z"
}

// Idle Notification
{
  "type": "idle_notification",
  "from": "worker-1",
  "timestamp": "...",
  "completedTaskId": "2"
}

// Permission Request
{
  "type": "permission_request",
  "requestId": "perm-123",
  "toolName": "Bash",
  ...
}
```

**Impact:** Users don't know what message structures to expect/parse.

**Resolution:** DEFERRED - Low priority documentation enhancement.

---

## Final Summary

### ✅ FIXED (Golden Path - Phase 6.1)

| Gap | Issue | Resolution |
|-----|-------|------------|
| **GAP-3** | Model not emitted in Task() | Already implemented in emitter (lines 261-265) |
| **GAP-4** | Missing `mode: "plan"` | Added `TaskMode` enum + `mode` prop to Teammate |
| **GAP-6** | No inbox monitoring guidance | Enhanced ShutdownSequence emitter with jq command |

### DEFERRED (Future Features)

| Gap | Issue | Location |
|-----|-------|----------|
| GAP-1 | TeammateTool operations | FUTURE_FEATURES.md Phase 8 |
| GAP-2 | Task lifecycle operations | FUTURE_FEATURES.md Phase 8.5 |
| GAP-5 | Orchestration patterns | FUTURE_FEATURES.md Phase 6 |

### DEFERRED (Low Priority Documentation)

| Gap | Issue |
|-----|-------|
| GAP-7 | Environment variables |
| GAP-8 | Spawn backends |
| GAP-9 | Error handling patterns |
| GAP-10 | Message format structures |

---

## Priority Matrix (Original)

### High Priority (Core Functionality Gaps)

| Gap | Issue | Effort | Value |
|-----|-------|--------|-------|
| GAP-3 | Model not emitted | Low | High |
| GAP-5 | Swarm pattern | Medium | High |

### Medium Priority (Enhanced Workflows)

| Gap | Issue | Effort | Value |
|-----|-------|--------|-------|
| GAP-1 | Message/Broadcast | Medium | Medium |
| GAP-4 | Plan approval mode | Low | Medium |

### Low Priority (Documentation/Future)

| Gap | Issue | Effort | Value |
|-----|-------|--------|-------|
| GAP-2 | Task lifecycle | N/A | Low (runtime) |
| GAP-6-10 | Documentation | Medium | Medium |

---

## Recommended Actions

### Immediate (Bug Fix)

1. **Fix GAP-3:** Emit `model` property in Task() when specified in `<Teammate>`

### Short-term (Phase 7?)

2. **Address GAP-1 (partial):** Add `<Message>` and `<Broadcast>` components
3. **Address GAP-4:** Add `requiresPlanApproval` or `mode` prop to `<Teammate>`
4. **Update docs/swarm.md:** Add environment variables, spawn backends, error handling

### Future Phases

5. **GAP-5:** Consider `<SwarmWorker>` component for self-organizing patterns
6. **GAP-1 (full):** Add approval/rejection components if needed

---

## Notes

### What We Got Right

1. **Task() syntax matches exactly:**
   ```javascript
   Task({
     team_name: "db-migration",
     name: "planner",
     subagent_type: "Plan",
     description: "...",
     prompt: `...`,
     run_in_background: true
   })
   ```

2. **Teammate spawnTeam syntax matches:**
   ```javascript
   Teammate({ operation: "spawnTeam", team_name: "db-migration", description: "..." })
   ```

3. **TaskCreate/TaskUpdate syntax matches:**
   ```javascript
   TaskCreate({ subject: "...", description: "...", activeForm: "..." })
   TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
   ```

4. **Shutdown sequence matches:**
   ```javascript
   Teammate({ operation: "requestShutdown", target_agent_id: "worker", reason: "..." })
   Teammate({ operation: "cleanup" })
   ```

### Design Decisions to Discuss

1. **Should runtime operations have components?**
   - `TaskList()`, `TaskGet()`, `TaskUpdate({ status })` are runtime
   - May not need compile-time components

2. **Inbox monitoring - component or documentation?**
   - Could add `<WaitForMessage type="shutdown_approved" />` component
   - Or just document the manual process

3. **Swarm pattern - new component or example?**
   - Could add `<SwarmWorker>` that generates the polling prompt
   - Or just provide prompt templates in docs
