# Phase 4: ShutdownSequence — Planning Document

Implementation planning for `<ShutdownSequence>` component.

---

## Objective

Create a component that emits Claude Code's graceful shutdown sequence:
1. `Teammate({ operation: "requestShutdown", target_agent_id, reason })` for each worker
2. Instructions to wait for `shutdown_approved` messages
3. `Teammate({ operation: "cleanup" })` to remove team resources

---

## Technical Requirements

### From GOLDEN_PATH.md

```tsx
<ShutdownSequence
  workers={[Security, Perf]}
  reason="All reviews complete"
/>
```

### Expected Output Format

```markdown
## Shutdown

```javascript
// 1. Request shutdown for all workers
Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "All reviews complete" })
Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "All reviews complete" })

// 2. Wait for shutdown_approved messages
// Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
// {"type": "shutdown_approved", "from": "security", ...}
// {"type": "shutdown_approved", "from": "perf", ...}

// 3. Cleanup team resources
Teammate({ operation: "cleanup" })
```
```

### From Claude Code Documentation (swarm-claude-code.md)

**requestShutdown operation:**
```javascript
Teammate({
  operation: "requestShutdown",
  target_agent_id: "security-reviewer",
  reason: "All tasks complete, wrapping up"
})
```

**cleanup operation:**
```javascript
Teammate({ operation: "cleanup" })
```

**Important constraints from Claude Code:**
- `cleanup` **WILL FAIL** if teammates are still active
- Must call `requestShutdown` first and wait for approvals
- Shutdown approval comes as a message in leader's inbox:
  ```json
  {
    "type": "shutdown_approved",
    "requestId": "shutdown-abc123@worker-1",
    "from": "worker-1",
    "paneId": "%5",
    "backendType": "in-process",
    "timestamp": "2026-01-25T23:39:00.000Z"
  }
  ```

---

## Architecture Analysis

### Pipeline Overview

```
TSX Source → Parser → IR Nodes → Emitter → Markdown
```

### New Components Required

| Layer | New Item | Purpose |
|-------|----------|---------|
| IR | `ShutdownSequenceNode` | Represents shutdown + cleanup sequence |
| Parser | `transformShutdownSequence()` | Transforms `<ShutdownSequence>` JSX to IR |
| Emitter | `emitShutdownSequence()` | Emits requestShutdown + wait + cleanup markdown |
| Component | `ShutdownSequence` | JSX component for authoring |

### Dependencies from Previous Phases

| Phase | Item | Used By |
|-------|------|---------|
| Phase 1 | `WorkerRef`, `defineWorker()` | `workers` prop |
| Phase 3 | Team context pattern | Understanding shutdown in team context |

---

## Incoherences and Technical Issues (To Discuss)

These issues require resolution before implementation.

---

### INC-1. Team Context for ShutdownSequence

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH output references `{team}` in the wait instructions:
```javascript
// Check ~/.claude/teams/{team}/inboxes/team-lead.json for:
```

**Question:** Where does ShutdownSequence get the team name?

**Sources:**

| Source | Team Reference |
|--------|----------------|
| **GOLDEN_PATH** | Output shows `{team}` placeholder |
| **Claude Code doc** | `cleanup()` uses implicit team context (from environment) |
| **Phase 5 context** | ShutdownSequence shown inside `<Workflow team={...}>` |

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Require explicit `team` prop | Always explicit | Redundant if inside Workflow |
| B | Inherit from parent Team/Workflow | Clean, no duplication | Requires context passing |
| C | Use literal `{team}` placeholder | Simple, documentation-style | Less useful as executable |
| D | Optional `team` prop, placeholder fallback | Flexible | Two behaviors |

**Recommendation:** Option D — Optional `team` prop, placeholder fallback

**Rationale:**
- Inside Workflow: team context flows from parent
- Standalone: user provides `team` prop or gets placeholder
- Matches documentation purpose (showing what to do, not runtime execution)

**Proposed props:**
```typescript
interface ShutdownSequenceProps {
  workers: WorkerRef[];
  reason?: string;
  team?: TeamRef;  // Optional - for team name in output
}
```

---

### INC-2. Standalone ShutdownSequence Valid?

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Can `<ShutdownSequence>` be used outside a `<Team>` or `<Workflow>`?

```tsx
// Standalone - is this valid?
<Command name="cleanup-team">
  <ShutdownSequence workers={[Security, Perf]} reason="Done" />
</Command>
```

**Analysis:**

GOLDEN_PATH shows ShutdownSequence only inside Workflow:
```tsx
<Workflow name="Feature X" team={ReviewTeam}>
  <Team team={ReviewTeam}>...</Team>
  <TaskPipeline>...</TaskPipeline>
  <ShutdownSequence workers={[Security, Perf]} reason="Feature complete" />
</Workflow>
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Require inside Workflow only | Enforces correct lifecycle | Less flexible |
| B | Allow standalone with team prop | Flexible for cleanup scripts | May miss context |
| C | Allow anywhere, output always works | Maximum flexibility | May generate incomplete output |

**Recommendation:** Option C — Allow anywhere

**Rationale:**
- ShutdownSequence emits documentation/instructions
- Output is valid regardless of context
- If no team context, uses placeholder
- User can create standalone cleanup commands

---

### INC-3. `reason` Prop Required vs Optional

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows `reason` prop, but Claude Code makes it optional:

```javascript
// Claude Code docs - reason is optional
Teammate({
  operation: "requestShutdown",
  target_agent_id: "security-reviewer",
  reason: "All tasks complete, wrapping up"  // Optional
})
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Required prop | Encourages good practice | More verbose |
| B | Optional with default | Flexible, has sensible default | May miss intent |
| C | Optional, no default | Matches Claude Code exactly | Output may lack context |

**Recommendation:** Option B — Optional with sensible default

**Default value:** `"Shutdown requested"`

**Implementation:**
```typescript
interface ShutdownSequenceProps {
  workers: WorkerRef[];
  reason?: string;  // Default: "Shutdown requested"
}
```

---

### INC-4. Order of Operations in Output

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows a 3-step sequence:
1. Request shutdown for all workers
2. Wait for shutdown_approved messages
3. Cleanup team resources

**Question:** Should cleanup always be included, or configurable?

**Use cases:**

| Scenario | Include Cleanup? |
|----------|-----------------|
| Full team teardown | Yes |
| Partial worker shutdown (keep team alive) | No |
| Multiple phases, shutdown workers between phases | No |

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Always include cleanup | Simple, matches GOLDEN_PATH | Inflexible |
| B | Add `cleanup` boolean prop (default true) | Flexible | More props |
| C | Separate `<Cleanup>` component | Maximum flexibility | More components |

**Recommendation:** Option B — Add `cleanup` boolean prop, default `true`

**Implementation:**
```typescript
interface ShutdownSequenceProps {
  workers: WorkerRef[];
  reason?: string;
  cleanup?: boolean;  // Default: true
}
```

**Usage:**
```tsx
// Full shutdown with cleanup (default)
<ShutdownSequence workers={[Security, Perf]} reason="All done" />

// Just shutdown workers, keep team alive
<ShutdownSequence workers={[Security]} reason="Phase 1 done" cleanup={false} />
```

---

### INC-5. Empty Workers Array

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

What happens if `workers={[]}` is provided?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Throw error at transform time | Early failure | May be valid use case |
| B | Emit only cleanup (no requestShutdown) | Flexible | Odd but valid |
| C | Emit nothing | Silently skip | Confusing |

**Recommendation:** Option A — Throw error

**Rationale:**
- Empty workers array is likely a mistake
- If user wants just cleanup, they should explicitly indicate
- Better to fail early with clear message

**Error message:**
```
ShutdownSequence requires at least one worker in the workers array.
If you only need cleanup, use <Cleanup /> instead (Phase 5+).
```

---

### INC-6. Worker Validation

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Should we validate that workers in `workers` prop match teammates spawned in the Team?

```tsx
const Security = defineWorker('security', ...);
const Perf = defineWorker('perf', ...);
const Random = defineWorker('random', ...);  // Never spawned

<Team team={ReviewTeam}>
  <Teammate worker={Security} ... />
  <Teammate worker={Perf} ... />
</Team>

<ShutdownSequence workers={[Security, Random]} />  // Random was never spawned!
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | No validation | Simple, user responsibility | May produce invalid output |
| B | Warn at transform time | Helpful but non-blocking | Requires tracking spawned workers |
| C | Error at transform time | Strict, prevents mistakes | Complex cross-component validation |

**Recommendation:** Option A — No validation

**Rationale:**
- Validation requires tracking all Teammates across the document
- ShutdownSequence is often in different context than Team
- Output is still valid for Claude Code (will just fail at runtime)
- User responsibility to match workers

---

### INC-7. Output Message Type Marker

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

GOLDEN_PATH shows waiting for specific message type:
```javascript
// {"type": "shutdown_approved", "from": "security", ...}
```

Should we include the full message structure or simplified version?

**Options:**

| Option | Full Structure | Simplified |
|--------|---------------|------------|
| Output | `{"type": "shutdown_approved", "requestId": "...", "from": "security", "paneId": "...", "backendType": "..."}` | `{"type": "shutdown_approved", "from": "security", ...}` |

**Recommendation:** Simplified (matches GOLDEN_PATH)

**Rationale:**
- Full structure is implementation detail
- `...` clearly indicates more fields exist
- User only needs to know what to look for (`type` and `from`)

---

### INC-8. Workflow Context Passing (Phase 5 Preview)

**Status:** 🟡 FOR FUTURE REFERENCE

**The Problem:**

Phase 5 introduces `<Workflow>` which wraps Team, TaskPipeline, and ShutdownSequence:

```tsx
<Workflow name="Feature X" team={ReviewTeam}>
  <Team team={ReviewTeam}>...</Team>
  <TaskPipeline>...</TaskPipeline>
  <ShutdownSequence workers={[Security, Perf]} />
</Workflow>
```

**Question:** How does team context flow from Workflow to ShutdownSequence?

**Options:**

| Option | Approach |
|--------|----------|
| A | Workflow passes team via IR context | Complex, requires context threading |
| B | ShutdownSequence gets team from sibling Team node | Emitter-time resolution |
| C | Require explicit team prop on ShutdownSequence | Simple, explicit |

**Recommendation:** Defer to Phase 5

For Phase 4:
- ShutdownSequence works standalone with optional `team` prop
- If no team, uses `{team}` placeholder
- Phase 5 Workflow can handle context passing

---

### INC-9. Multiple ShutdownSequence Components

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

What if a document has multiple ShutdownSequence components?

```tsx
<Workflow>
  <Team team={Team1}>...</Team>
  <ShutdownSequence workers={[Worker1]} reason="Phase 1 done" cleanup={false} />

  <Team team={Team2}>...</Team>
  <ShutdownSequence workers={[Worker2]} reason="Phase 2 done" />
</Workflow>
```

**Analysis:**

This is valid in Claude Code — you can shut down workers at different points.

**Decision:** Allow multiple ShutdownSequence components

**Output:** Each emits independently

---

### INC-10. Prop Name: `workers` vs `teammates` (Spec Mismatch)

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

The spec file uses different prop name and type than GOLDEN_PATH:

| Source | Prop Name | Type |
|--------|-----------|------|
| **GOLDEN_PATH.md** | `workers` | `WorkerRef[]` |
| **ShutdownSequence.spec.tsx** | `teammates` | `string[]` |
| **PHASE_4_PLANNING.md** | `workers` | `WorkerRef[]` |

**Spec definition:**
```typescript
interface ShutdownSequenceProps {
  teammates: string[];  // Plain strings, not WorkerRef
  // ...
}
```

**GOLDEN_PATH definition:**
```tsx
<ShutdownSequence workers={[Security, Perf]} reason="..." />
// Security, Perf are WorkerRef objects
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Use `workers: WorkerRef[]` (GOLDEN_PATH) | Type-safe, consistent with Phase 1 pattern | Spec needs update |
| B | Use `teammates: string[]` (Spec) | Simpler, matches Claude Code terminology | Loses type safety |

**Recommendation:** Option A — Use `workers: WorkerRef[]`

**Rationale:**
- Consistent with Phase 1 factory pattern (`defineWorker()` returns `WorkerRef`)
- Type safety catches errors at compile time
- `WorkerRef.name` maps directly to `target_agent_id`
- Spec file needs to be updated to match GOLDEN_PATH

**Action Required:** Update `ShutdownSequence.spec.tsx` to use `workers: WorkerRef[]`

---

### INC-11. Cleanup Prop Name: `cleanup` vs `includeCleanup` (Spec Mismatch)

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Different naming for the cleanup prop:

| Source | Prop Name | Default |
|--------|-----------|---------|
| **GOLDEN_PATH.md** | *(not defined)* | — |
| **ShutdownSequence.spec.tsx** | `includeCleanup` | `true` |
| **PHASE_4_PLANNING.md** | `cleanup` | `true` |

**Spec definition:**
```typescript
interface ShutdownSequenceProps {
  includeCleanup?: boolean;  // default: true
}
```

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Use `cleanup` | Shorter, matches React conventions (`disabled`, `hidden`) | Spec needs update |
| B | Use `includeCleanup` | More explicit about what it controls | Verbose |

**Recommendation:** Option A — Use `cleanup`

**Rationale:**
- Shorter prop name
- Matches React/HTML pattern of boolean attributes (`disabled`, `checked`, `hidden`)
- `cleanup={false}` reads naturally

**Action Required:** Update `ShutdownSequence.spec.tsx` to use `cleanup` instead of `includeCleanup`

---

### INC-12. Section Header: `## Shutdown` vs `### Graceful Shutdown` (Spec Mismatch)

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Different section headers in output:

| Source | Header |
|--------|--------|
| **GOLDEN_PATH.md** | `## Shutdown` |
| **ShutdownSequence.spec.tsx** | `### Graceful Shutdown` |
| **PHASE_4_PLANNING.md** | `## Shutdown` |

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | `## Shutdown` (GOLDEN_PATH) | Consistent with GOLDEN_PATH, cleaner | Less descriptive |
| B | `### Graceful Shutdown` (Spec) | More descriptive | Different heading level, verbose |
| C | `## Graceful Shutdown` | Descriptive + correct level | Longest |

**Recommendation:** Option A — Use `## Shutdown`

**Rationale:**
- Matches GOLDEN_PATH exactly
- Section context makes "graceful" implied
- Consistent heading level with other sections

**Action Required:** Update `ShutdownSequence.spec.tsx` to use `## Shutdown`

---

### INC-13. Cleanup Skip Message When `cleanup={false}`

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

When cleanup is disabled, spec shows a note but current emitter doesn't:

**Spec output (cleanup disabled):**
```javascript
// 1. Request shutdown for all teammates
Teammate({ operation: "requestShutdown", target_agent_id: "researcher", reason: "..." })

// 2. Wait for shutdown approvals
// Check for {"type": "shutdown_approved", ...} messages

// Note: Cleanup skipped - team resources preserved for next phase
```

**Current PHASE_4_PLANNING emitter:** Just omits step 3 entirely, no note.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Omit silently | Simpler output | May confuse user |
| B | Add skip note | Clear why cleanup missing | Extra line |

**Recommendation:** Option B — Add skip note

**Rationale:**
- Explicit is better than implicit
- User understands why step 3 is missing
- Matches spec behavior

**Implementation:**
```typescript
if (node.includeCleanup) {
  lines.push('');
  lines.push('// 3. Cleanup team resources');
  lines.push('Teammate({ operation: "cleanup" })');
} else {
  lines.push('');
  lines.push('// Note: Cleanup skipped - team resources preserved for next phase');
}
```

---

### INC-14. Comment Terminology: "workers" vs "teammates"

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Output comments use different terms:

| Source | Term in comments |
|--------|------------------|
| **GOLDEN_PATH.md** | `// 1. Request shutdown for all workers` |
| **ShutdownSequence.spec.tsx** | `// 1. Request shutdown for all teammates` |

**Context:**
- Prop is called `workers` (WorkerRef[])
- Claude Code calls them "teammates" in documentation
- Both terms refer to the same thing

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Use "workers" | Matches prop name | Differs from Claude Code terminology |
| B | Use "teammates" | Matches Claude Code docs | Differs from prop name |

**Recommendation:** Option A — Use "workers"

**Rationale:**
- Consistent with prop name (`workers={...}`)
- User sees the connection between prop and output
- GOLDEN_PATH uses "workers"

---

### INC-15. GOLDEN_PATH Missing `cleanup` Prop in Phase 4 Definition

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH Phase 4 section doesn't document the `cleanup` prop:

**GOLDEN_PATH Phase 4 Props Table:**
```markdown
| Prop | Type | Required | Maps to |
|------|------|----------|---------|
| `workers` | `WorkerRef[]` | Yes | `Teammate.target_agent_id` |
| `reason` | `string` | No | `Teammate.reason` |
```

Missing: `cleanup` boolean prop that spec and PHASE_4_PLANNING both include.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Add `cleanup` prop to GOLDEN_PATH | Complete documentation | Changes source of truth |
| B | Remove `cleanup` prop from implementation | Simpler, matches current GOLDEN_PATH | Loses flexibility |

**Recommendation:** Option A — Add `cleanup` prop to GOLDEN_PATH

**Rationale:**
- Spec already includes it (`includeCleanup`)
- Valid use case: partial shutdown without team cleanup
- Better to update GOLDEN_PATH than lose functionality

**Action Required:** Update GOLDEN_PATH.md Phase 4 section to include `cleanup` prop

---

## File Structure

### New Files

```
src/components/swarm/
├── index.ts                    # Add ShutdownSequence export
└── ShutdownSequence.tsx        # ShutdownSequence component (NEW)
```

### Modified Files

```
src/ir/swarm-nodes.ts           # Add ShutdownSequenceNode
src/ir/nodes.ts                 # Add to BlockNode union
src/parser/transformers/swarm.ts    # Add transformShutdownSequence
src/parser/transformers/dispatch.ts # Add ShutdownSequence dispatch
src/emitter/swarm-emitter.ts    # Add emitShutdownSequence
src/emitter/emitter.ts          # Add shutdownSequence case
src/jsx.ts                      # Export ShutdownSequence
src/components/swarm/index.ts   # Export new component
```

---

## IR Node Definition

### ShutdownSequenceNode

```typescript
// src/ir/swarm-nodes.ts (add to existing file)

/**
 * ShutdownSequence IR node - represents graceful shutdown
 *
 * Emits as:
 * 1. Teammate({ operation: "requestShutdown", ... }) for each worker
 * 2. Comments about waiting for shutdown_approved
 * 3. Teammate({ operation: "cleanup" }) if includeCleanup is true
 */
export interface ShutdownSequenceNode {
  kind: 'shutdownSequence';
  /** Workers to shutdown (WorkerRef data) */
  workers: Array<{
    workerId: string;    // WorkerRef.__id
    workerName: string;  // WorkerRef.name (used as target_agent_id)
  }>;
  /** Reason for shutdown (optional) */
  reason?: string;
  /** Whether to include cleanup call (default: true) */
  includeCleanup: boolean;
  /** Team name for output comments (optional, uses placeholder if not provided) */
  teamName?: string;
}
```

---

## Component Definition

### ShutdownSequence Component

```typescript
// src/components/swarm/ShutdownSequence.tsx

import type { WorkerRef, TeamRef } from './refs.js';

export interface ShutdownSequenceProps {
  /**
   * Workers to request shutdown for.
   * Maps to Teammate({ operation: "requestShutdown", target_agent_id: worker.name })
   */
  workers: WorkerRef[];
  /**
   * Reason for shutdown (optional).
   * Maps to Teammate({ ..., reason: "..." })
   * @default "Shutdown requested"
   */
  reason?: string;
  /**
   * Whether to include cleanup call after shutdown approvals.
   * @default true
   */
  cleanup?: boolean;
  /**
   * Team reference for output comments (optional).
   * If not provided, uses {team} placeholder.
   */
  team?: TeamRef;
  /**
   * Section title (optional).
   * @default "Shutdown"
   */
  title?: string;
}

/**
 * Generates graceful shutdown sequence for Claude Code teams.
 *
 * Emits:
 * 1. requestShutdown for each worker
 * 2. Instructions to wait for shutdown_approved messages
 * 3. cleanup call (if cleanup prop is true)
 *
 * @example
 * <ShutdownSequence
 *   workers={[Security, Perf]}
 *   reason="All reviews complete"
 * />
 */
export function ShutdownSequence(_props: ShutdownSequenceProps): null {
  return null;
}
```

---

## Transformer Implementation

### transformShutdownSequence

```typescript
// src/parser/transformers/swarm.ts (add to existing file)

import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';
import type { ShutdownSequenceNode } from '../../ir/swarm-nodes.js';
import { getAttributeValue } from '../utils/index.js';
import type { TransformContext } from './types.js';

/**
 * Transform <ShutdownSequence> to ShutdownSequenceNode
 */
export function transformShutdownSequence(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ShutdownSequenceNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Extract workers array (required)
  const workers = extractWorkerRefArrayProp(opening, 'workers', ctx);
  if (workers.length === 0) {
    throw new Error(
      'ShutdownSequence requires at least one worker in the workers array.'
    );
  }

  // Extract reason (optional)
  const reason = getAttributeValue(opening, 'reason') ?? undefined;

  // Extract cleanup (optional, default true)
  const cleanupStr = getAttributeValue(opening, 'cleanup');
  const includeCleanup = cleanupStr !== 'false';

  // Extract team (optional)
  const teamRef = extractTeamRefProp(opening, 'team', ctx);
  const teamName = teamRef?.name;

  return {
    kind: 'shutdownSequence',
    workers: workers.map(w => ({
      workerId: w.__id,
      workerName: w.name,
    })),
    reason,
    includeCleanup,
    teamName,
  };
}

/**
 * Extract WorkerRef[] from prop value
 * Handles: workers={[Security, Perf]}
 */
function extractWorkerRefArrayProp(
  opening: JsxOpeningElement | JsxSelfClosingElement,
  propName: string,
  ctx: TransformContext
): WorkerRef[] {
  // Implementation: extract array of WorkerRefs
  // Similar to extractTaskRefArrayProp from Phase 2
}
```

---

## Emitter Implementation

### emitShutdownSequence

```typescript
// src/emitter/swarm-emitter.ts (add to existing file)

import type { ShutdownSequenceNode } from '../ir/swarm-nodes.js';

/**
 * Emit ShutdownSequence to markdown
 */
export function emitShutdownSequence(node: ShutdownSequenceNode): string {
  const lines: string[] = [];
  const teamPlaceholder = node.teamName ?? '{team}';
  const reason = node.reason ?? 'Shutdown requested';

  // Section header
  lines.push('## Shutdown');
  lines.push('');

  // Code block
  lines.push('```javascript');

  // Step 1: Request shutdown for all workers
  lines.push('// 1. Request shutdown for all workers');
  for (const worker of node.workers) {
    lines.push(
      `Teammate({ operation: "requestShutdown", target_agent_id: "${worker.workerName}", reason: ${JSON.stringify(reason)} })`
    );
  }

  // Step 2: Wait for shutdown_approved messages
  lines.push('');
  lines.push('// 2. Wait for shutdown_approved messages');
  lines.push(`// Check ~/.claude/teams/${teamPlaceholder}/inboxes/team-lead.json for:`);
  for (const worker of node.workers) {
    lines.push(`// {"type": "shutdown_approved", "from": "${worker.workerName}", ...}`);
  }

  // Step 3: Cleanup (if enabled)
  if (node.includeCleanup) {
    lines.push('');
    lines.push('// 3. Cleanup team resources');
    lines.push('Teammate({ operation: "cleanup" })');
  }

  lines.push('```');

  return lines.join('\n');
}
```

---

## Testing Strategy

### Unit Tests

1. **ShutdownSequence transformation:**
   ```typescript
   test('transformShutdownSequence creates node with workers', () => {
     const source = `
       <ShutdownSequence
         workers={[Security, Perf]}
         reason="All done"
       />
     `;
     const node = transformShutdownSequence(parseJsx(source), mockContext);

     expect(node.kind).toBe('shutdownSequence');
     expect(node.workers).toHaveLength(2);
     expect(node.reason).toBe('All done');
     expect(node.includeCleanup).toBe(true);
   });
   ```

2. **Empty workers validation:**
   ```typescript
   test('throws error for empty workers array', () => {
     const source = `<ShutdownSequence workers={[]} />`;
     expect(() => transformShutdownSequence(parseJsx(source), mockContext))
       .toThrow('at least one worker');
   });
   ```

3. **Cleanup disabled:**
   ```typescript
   test('cleanup can be disabled', () => {
     const source = `<ShutdownSequence workers={[Security]} cleanup={false} />`;
     const node = transformShutdownSequence(parseJsx(source), mockContext);

     expect(node.includeCleanup).toBe(false);
   });
   ```

4. **Emitter output format:**
   ```typescript
   test('emitShutdownSequence produces correct markdown', () => {
     const node: ShutdownSequenceNode = {
       kind: 'shutdownSequence',
       workers: [
         { workerId: 'w1', workerName: 'security' },
         { workerId: 'w2', workerName: 'perf' },
       ],
       reason: 'All reviews complete',
       includeCleanup: true,
       teamName: 'pr-review',
     };
     const output = emitShutdownSequence(node);

     expect(output).toContain('## Shutdown');
     expect(output).toContain('requestShutdown');
     expect(output).toContain('target_agent_id: "security"');
     expect(output).toContain('target_agent_id: "perf"');
     expect(output).toContain('pr-review');
     expect(output).toContain('operation: "cleanup"');
   });
   ```

5. **Team placeholder:**
   ```typescript
   test('uses {team} placeholder when team not provided', () => {
     const node: ShutdownSequenceNode = {
       kind: 'shutdownSequence',
       workers: [{ workerId: 'w1', workerName: 'security' }],
       includeCleanup: true,
       // No teamName
     };
     const output = emitShutdownSequence(node);

     expect(output).toContain('{team}');
   });
   ```

### Integration Tests

1. **Full compile:**
   ```typescript
   test('compiles ShutdownSequence to expected markdown', async () => {
     const result = await compile('fixtures/shutdown-workflow.tsx');
     expect(result).toMatchSnapshot();
   });
   ```

---

## Implementation Order

1. **Define IR node** — Add `ShutdownSequenceNode` to `swarm-nodes.ts`
2. **Add to BlockNode union** — `src/ir/nodes.ts`
3. **Implement emitter** — `emitShutdownSequence()`
4. **Implement transformer** — `transformShutdownSequence()`
5. **Add to dispatch** — `src/parser/transformers/dispatch.ts`
6. **Add to main emitter** — `src/emitter/emitter.ts`
7. **Create component stub** — `ShutdownSequence.tsx`
8. **Update exports** — `jsx.ts`, `swarm/index.ts`
9. **Write tests** — Unit and integration
10. **Update GOLDEN_PATH.md** — Reflect any decision changes

---

## Dependencies

- **Phase 1 complete:** `WorkerRef`, `TeamRef`, `defineWorker()`, `defineTeam()`
- **Phase 3 complete:** Team/Teammate patterns for context
- No external dependencies

---

## Success Criteria

Phase 4 is complete when:

1. ✅ `<ShutdownSequence>` compiles to `Teammate({ operation: "requestShutdown" })` calls
2. ✅ Output includes wait instructions with inbox path
3. ✅ Output includes `Teammate({ operation: "cleanup" })` by default
4. ✅ `cleanup={false}` prop disables cleanup output
5. ✅ `reason` prop maps to shutdown reason
6. ✅ `team` prop populates team name in output (placeholder otherwise)
7. ✅ Empty workers array throws helpful error
8. ✅ All unit and integration tests pass
9. ✅ Component exported from `react-agentic`

---

## Next Steps After Phase 4

Phase 5 (`<Workflow>`) will:
- Add IR node: `WorkflowNode`
- Add transformer: `transformWorkflow()`
- Compose Team, TaskPipeline, and ShutdownSequence
- Handle team context propagation
- Generate workflow-level mermaid diagrams

---

## Resolution Summary

| ID | Issue | Status | Decision |
|----|-------|--------|----------|
| INC-1 | Team context | ✅ RESOLVED | Optional `team` prop, `{team}` placeholder fallback |
| INC-2 | Standalone valid | ✅ RESOLVED | Allow anywhere, no restrictions |
| INC-3 | reason required | ✅ RESOLVED | Optional with default "Shutdown requested" |
| INC-4 | Include cleanup | ✅ RESOLVED | Add `cleanup` boolean prop, default true |
| INC-5 | Empty workers | ✅ RESOLVED | Throw error at transform time |
| INC-6 | Worker validation | 🟡 DISCUSSED | No validation, user responsibility |
| INC-7 | Message format | 🟡 DISCUSSED | Simplified with `...` |
| INC-8 | Workflow context | 🟡 DEFERRED | Phase 5 |
| INC-9 | Multiple components | 🟡 DISCUSSED | Allow multiple, emit independently |
| INC-10 | Prop name `workers` vs `teammates` | ✅ RESOLVED | Use `workers: WorkerRef[]`, update spec |
| INC-11 | Cleanup prop name | ✅ RESOLVED | Use `cleanup`, update spec |
| INC-12 | Section header | ✅ RESOLVED | Add `title` prop (default "Shutdown"), fixed h2 level |
| INC-13 | Cleanup skip message | ✅ RESOLVED | Omit silently (no note) |
| INC-14 | Comment terminology | 🟡 DISCUSSED | Use "workers" (matches prop name) |
| INC-15 | GOLDEN_PATH missing props | ✅ RESOLVED | Update GOLDEN_PATH with `cleanup`, `team`, `title` props |

---

## Questions for User

Before implementation, resolve these incoherences one by one:

---

### Group A: Original Design Decisions

1. **INC-1: Team Context**
   - Should `team` prop be required, or optional with placeholder?
   - Recommendation: Optional with `{team}` placeholder

2. **INC-2: Standalone Usage**
   - Allow `<ShutdownSequence>` outside `<Workflow>`?
   - Recommendation: Yes, allow anywhere

3. **INC-3: reason Prop**
   - Should `reason` have a default value or be truly optional (no default)?
   - Recommendation: Default `"Shutdown requested"`

4. **INC-4: cleanup Prop**
   - Should we add a `cleanup` boolean prop to control cleanup output?
   - Recommendation: Yes, default `true`

5. **INC-5: Empty Workers**
   - Should empty workers array throw error or emit cleanup-only?
   - Recommendation: Throw error with helpful message

---

### Group B: Spec File Alignment

6. **INC-10: Prop Name**
   - Use `workers: WorkerRef[]` (GOLDEN_PATH) or `teammates: string[]` (Spec)?
   - Recommendation: `workers: WorkerRef[]` — update spec

7. **INC-11: Cleanup Prop Name**
   - Use `cleanup` (shorter) or `includeCleanup` (spec)?
   - Recommendation: `cleanup` — update spec

8. **INC-12: Section Header**
   - Use `## Shutdown` (GOLDEN_PATH) or `### Graceful Shutdown` (Spec)?
   - Recommendation: `## Shutdown` — update spec

9. **INC-13: Cleanup Skip Message**
   - When `cleanup={false}`, add a note explaining why cleanup is omitted?
   - Recommendation: Yes, add note

---

### Group C: Documentation Updates

10. **INC-15: Update GOLDEN_PATH**
    - Add `cleanup` and `team` props to GOLDEN_PATH Phase 4 definition?
    - Recommendation: Yes, update GOLDEN_PATH

11. **Update Spec File**
    - After decisions made, update `ShutdownSequence.spec.tsx` to match?
    - Recommendation: Yes, update spec after all decisions finalized
