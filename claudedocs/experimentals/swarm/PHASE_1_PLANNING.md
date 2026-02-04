# Phase 1: Type-Safe References — Planning Document

Implementation planning for `defineTask()`, `defineWorker()`, `defineTeam()`, `resetAllIds()`.

---

## Objective

Create type-safe reference factories that:
1. Generate predictable IDs for tasks
2. Map agent types to Claude Code `subagent_type` values
3. Track team membership
4. Support ID reset between workflows

---

## Technical Requirements

### From GOLDEN_PATH.md

```tsx
// Task refs - minimal, just subject
const Research = defineTask('Research best practices');
// Research.subject = "Research best practices" (no .id, no .name)

// Worker refs with type mapping
const Explorer = defineWorker('explorer', AgentType.Explore, Model.Haiku);
const Security = defineWorker('security', PluginAgentType.SecuritySentinel);

// Team refs with members
const ReviewTeam = defineTeam('pr-review', [Security, Perf]);
// ReviewTeam.name = "pr-review", ReviewTeam.members = [Security, Perf]
```

### Output Format Expectations

These refs are **compile-time only**. They don't emit markdown directly — they're consumed by:
- `<TaskDef task={ref}>` → emits `TaskCreate({ subject: ref.subject, ... })`
- `<Teammate worker={ref}>` → emits `Task({ name: ref.name, subagent_type: ref.type, ... })`
- `<Team team={ref}>` → emits `Teammate({ team_name: ref.name, ... })`
- `blockedBy={[ref1, ref2]}` → resolved at emit time using object identity (two-pass)

---

## Architecture Analysis

### Existing Patterns to Reuse

| Pattern | Source | Applies To |
|---------|--------|------------|
| Brand types | `src/components/runtime-var.ts` | All refs need `__isTaskRef`, `__isWorkerRef` markers |
| Registry pattern | `src/components/runtime-fn.ts` | Task ID counter, optional ref tracking |
| Type guards | `runtime-var.ts`, `runtime-fn.ts` | `isTaskRef()`, `isWorkerRef()`, `isTeamRef()` |
| Factory functions | `src/components/Agent.ts` | `defineWorker()` already exists (extend it) |
| Enum mapping | (new) | `AgentType` → `subagent_type` string |

### What Already Exists

1. **WorkerRef pattern** in `src/components/Agent.ts`:
   ```typescript
   interface WorkerRef<TInput = unknown> {
     name: string;
     path?: string;
     __isWorkerRef: true;
   }

   function defineWorker<TInput>(config): WorkerRef<TInput> { ... }
   ```

2. **Registry pattern** in `src/components/runtime-fn.ts`:
   ```typescript
   const runtimeFnRegistry = new Map<string, RuntimeFunction>();
   export function getRuntimeFnRegistry(): Map<...> { ... }
   export function clearRuntimeFnRegistry(): void { ... }
   ```

3. **Type guards** in multiple files:
   ```typescript
   export function isRuntimeVar(value): value is RuntimeVar { ... }
   export function isRuntimeFn(value): value is RuntimeFnComponent { ... }
   ```

---

## Decision Points

### 1. Where to Put Swarm Refs?

**Options:**

| Option | Location | Pros | Cons |
|--------|----------|------|------|
| A | `src/components/swarm/` (new) | Clean separation, dedicated folder | More import paths |
| B | `src/components/` (flat) | Simple, follows current pattern | May clutter as swarm grows |
| C | `src/swarm/` (top-level) | Indicates swarm is a major feature | Breaks `components/` convention |

**Recommendation:** Option A — `src/components/swarm/`

Rationale: Swarm is a coherent feature set. Dedicated folder allows:
- `src/components/swarm/refs.ts` — TaskRef, WorkerRef extensions, TeamRef
- `src/components/swarm/enums.ts` — AgentType, PluginAgentType, Model, MessageType
- `src/components/swarm/registry.ts` — ID counters, optional ref tracking
- `src/components/swarm/index.ts` — Clean re-exports

---

### 2. Relationship to Existing AgentRef

**RESOLVED:** Use separate types with distinct names.

**Existing file-based pattern** (unchanged):
```typescript
// src/components/Agent.ts
interface AgentRef<TInput = unknown> {
  name: string;
  path?: string;           // For file-based agents
  __isAgentRef: true;
}

function defineAgent<TInput>(config): AgentRef<TInput>;
```

**New swarm pattern:**
```typescript
// src/components/swarm/refs.ts
interface WorkerRef {
  name: string;
  type: string;            // subagent_type value
  model?: string;          // Model override
  __isWorkerRef: true;
}

function defineWorker(name, type, model?): WorkerRef;
```

**Decision:** Separate types with distinct names

| Concept | Type | Factory | Use Case |
|---------|------|---------|----------|
| File-based agents | `AgentRef` | `defineAgent()` | Agents defined in `.tsx` files |
| Swarm workers | `WorkerRef` | `defineWorker()` | Claude Code built-in subagent types |

**Rationale:**
- Clear semantic distinction: "Agent" = you define the content, "Worker" = Claude Code's built-in types
- No namespace collision
- No breaking changes to existing `defineAgent()` usage
- Import from different paths:
  ```typescript
  import { defineAgent } from 'react-agentic';        // File-based AgentRef
  import { defineWorker } from 'react-agentic/swarm'; // Swarm WorkerRef
  ```

---

### 3. ID Generation Strategy

**RESOLVED:** Use object identity, assign numeric IDs at emit time.

**The Problem:**
- Claude Code assigns sequential numeric IDs when `TaskCreate` runs
- If we assign IDs at import time, cross-file task definitions have unpredictable IDs
- Import order ≠ intended task order
- Cross-file task definitions are a necessity

**The Solution:** Object identity with two-pass emit

| Aspect | Approach |
|--------|----------|
| Stable identifier | TaskRef object reference (identity) |
| Numeric ID | Assigned at emit time, based on JSX order |
| TaskRef.id | **Not needed** — removed from interface |
| TaskRef.name | **Not needed** — removed (not used in Claude Code API) |
| Cross-file safe | ✅ Yes |

**How it works:**

```typescript
// TaskRef has only subject - minimal interface
interface TaskRef {
  subject: string;   // "Research best practices" - maps to TaskCreate.subject
  __isTaskRef: true;
}

// Define tasks anywhere (order doesn't matter)
// tasks.ts
export const Research = defineTask('Research best practices');

// workflow.tsx
import { Research } from './tasks';
const Plan = defineTask('Create implementation plan');

// JSX order determines numeric IDs
<TaskPipeline>
  <TaskDef task={Research} />                    // Emitter assigns ID "1"
  <TaskDef task={Plan} blockedBy={[Research]} /> // Emitter assigns ID "2"
</TaskPipeline>
```

**At emit time (two-pass):**
1. **Pass 1:** Walk JSX tree, collect all TaskDefs, assign IDs by order
   - Builds `Map<TaskRef, string>` using object identity as key
   - `{ Research → "1", Plan → "2" }`
2. **Pass 2:** Emit TaskCreate calls, resolve blockedBy using the map

**Constraints:**
- Each TaskRef should be **used once** in `<TaskDef>` (duplicates = warning)
- Each TaskRef can be **referenced many times** in `blockedBy`
- Two tasks CAN have the same `subject` (object identity distinguishes them)

**Benefits:**
- No global counter needed
- No `resetTaskIds()` needed
- Cross-file task definitions work correctly
- Minimal interface: just `subject`

---

### 4. Enum Implementation

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | TypeScript enum | Native, familiar | Can't extend at runtime |
| B | const object with type | Extensible, tree-shakeable | Less familiar syntax |
| C | String literal union | Simplest | No namespace for values |

**Recommendation:** Option B — const objects with as const

Rationale:
- Allows extension for plugin agent types
- Tree-shakeable (unused values removed)
- Provides both type and runtime values

**Implementation:**
```typescript
// src/components/swarm/enums.ts
export const AgentType = {
  Bash: 'Bash',
  Explore: 'Explore',
  Plan: 'Plan',
  GeneralPurpose: 'general-purpose',
} as const;
export type AgentType = typeof AgentType[keyof typeof AgentType];

export const PluginAgentType = {
  SecuritySentinel: 'compound-engineering:review:security-sentinel',
  PerformanceOracle: 'compound-engineering:review:performance-oracle',
  ArchitectureStrategist: 'compound-engineering:review:architecture-strategist',
  BestPracticesResearcher: 'compound-engineering:research:best-practices-researcher',
} as const;
export type PluginAgentType = typeof PluginAgentType[keyof typeof PluginAgentType];

export const Model = {
  Haiku: 'haiku',
  Sonnet: 'sonnet',
  Opus: 'opus',
} as const;
export type Model = typeof Model[keyof typeof Model];
```

---

### 5. Type Safety for blockedBy

**Challenge:** `blockedBy={[Research, Plan]}` should:
1. Accept only `TaskRef[]`
2. Extract `.id` from each ref at transform time

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Accept `TaskRef[]` only | Type-safe | Requires transform-time ID extraction |
| B | Accept `(TaskRef \| string)[]` | Flexible | Loses type safety |
| C | Accept `TaskRef[]` and convert | Best of both | Slightly more complex |

**Recommendation:** Option C — Accept `TaskRef[]`, resolve to numeric IDs at emit time

**Implementation in emitter (Phase 2+):**
```typescript
// Emitter uses object identity as key (not name or subject)
const taskIdMap = new Map<TaskRef, string>();

// Pass 1: Assign IDs to all TaskDefs
function assignTaskIds(taskDefs: TaskDef[]): void {
  taskDefs.forEach((def, index) => {
    taskIdMap.set(def.task, String(index + 1));
  });
}

// Pass 2: Resolve blockedBy references
function resolveBlockedBy(refs: TaskRef[]): string[] {
  return refs.map(ref => {
    const id = taskIdMap.get(ref);  // Uses object identity
    if (!id) throw new Error(`TaskRef not found - ensure it has a <TaskDef>`);
    return id;
  });
}
```

---

## File Structure

```
src/components/swarm/
├── index.ts           # Re-exports all swarm utilities
├── refs.ts            # TaskRef, WorkerRef, TeamRef interfaces + factories
├── enums.ts           # AgentType, PluginAgentType, Model, MessageType, TaskStatus
└── guards.ts          # isTaskRef(), isWorkerRef(), isTeamRef()
```

Note: No `registry.ts` needed — numeric IDs assigned at emit time (Phase 2+), not in refs.

---

## Interface Definitions

### TaskRef

```typescript
// src/components/swarm/refs.ts

export interface TaskRef {
  /** Task subject - maps directly to TaskCreate.subject */
  subject: string;
  /** Type marker for guards */
  __isTaskRef: true;
}

// Minimal interface: only what Claude Code needs
// No .id - assigned at emit time using object identity
// No .name - not used in Claude Code's TaskCreate API

export function defineTask(subject: string): TaskRef {
  return {
    subject,
    __isTaskRef: true,
  };
}
```

### WorkerRef (Swarm)

```typescript
export interface WorkerRef {
  /** Agent name (e.g., "security", "explorer") */
  name: string;
  /** Claude Code subagent_type value */
  type: string;
  /** Optional model override */
  model?: string;
  /** Type marker for guards */
  __isWorkerRef: true;
}

export function defineWorker(
  name: string,
  type: AgentType | PluginAgentType | string,
  model?: Model | string
): WorkerRef {
  return {
    name,
    type,
    model,
    __isWorkerRef: true,
  };
}
```

### TeamRef

```typescript
export interface TeamRef {
  /** Team name (maps to team_name in Claude Code) */
  name: string;
  /** Team members (optional, for documentation) */
  members?: WorkerRef[];
  /** Type marker for guards */
  __isTeamRef: true;
}

export function defineTeam(name: string, members?: WorkerRef[]): TeamRef {
  return {
    name,
    members,
    __isTeamRef: true,
  };
}
```

---

## Type Guards

```typescript
// src/components/swarm/guards.ts

export function isTaskRef(value: unknown): value is TaskRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isTaskRef' in value &&
    (value as TaskRef).__isTaskRef === true
  );
}

export function isWorkerRef(value: unknown): value is WorkerRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isWorkerRef' in value &&
    (value as WorkerRef).__isWorkerRef === true
  );
}

export function isTeamRef(value: unknown): value is TeamRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isTeamRef' in value &&
    (value as TeamRef).__isTeamRef === true
  );
}
```

---

## Export Strategy

### From swarm/index.ts

```typescript
// src/components/swarm/index.ts

// Refs
export { TaskRef, WorkerRef, TeamRef } from './refs';
export { defineTask, defineWorker, defineTeam } from './refs';

// Enums
export { AgentType, PluginAgentType, Model, MessageType, TaskStatus } from './enums';

// Registry
export { resetAllIds } from './registry';

// Guards
export { isTaskRef, isWorkerRef, isTeamRef } from './guards';
```

### From main jsx.ts

```typescript
// src/jsx.ts (add)

// Swarm utilities
export * from './components/swarm';
```

### User Import Paths

```typescript
// Option 1: From main package
import { defineTask, defineWorker, defineTeam, AgentType } from 'react-agentic';

// Option 2: From swarm subpath (if configured in package.json exports)
import { defineTask, defineWorker, defineTeam, AgentType } from 'react-agentic/swarm';
```

**Recommendation:** Support both. Add `exports` field to package.json:
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./swarm": "./dist/components/swarm/index.js"
  }
}
```

---

## Testing Strategy

### Unit Tests

1. **defineTask creates TaskRef:**
   ```typescript
   test('defineTask creates TaskRef with subject only', () => {
     const task = defineTask('Research best practices');
     expect(task.subject).toBe('Research best practices');
     expect(task.__isTaskRef).toBe(true);
   });
   ```

2. **TaskRef is minimal (no id, no name):**
   ```typescript
   test('TaskRef has only subject and marker', () => {
     const task = defineTask('Research');
     expect(Object.keys(task).sort()).toEqual(['__isTaskRef', 'subject']);
   });
   ```

3. **Type guards:**
   ```typescript
   test('isTaskRef identifies TaskRef', () => {
     const task = defineTask('Research');
     expect(isTaskRef(task)).toBe(true);
     expect(isTaskRef({ subject: 'X' })).toBe(false); // missing __isTaskRef
   });
   ```

4. **Object identity for cross-file:**
   ```typescript
   test('same subject creates different TaskRefs', () => {
     const task1 = defineTask('Research');
     const task2 = defineTask('Research');
     expect(task1).not.toBe(task2);  // Different objects
     expect(task1.subject).toBe(task2.subject);  // Same subject is fine
   });
   ```

4. **Enum values:**
   ```typescript
   test('AgentType values match Claude Code', () => {
     expect(AgentType.Explore).toBe('Explore');
     expect(AgentType.GeneralPurpose).toBe('general-purpose');
   });
   ```

### Integration Tests (Phase 2+)

Integration tests with components (`<TaskDef>`, `<Teammate>`) are deferred to Phase 2.

---

## Questions to Resolve Before Starting

### Critical

1. **~~Namespace collision with existing AgentRef?~~** ✅ RESOLVED
   - Existing `AgentRef` in `src/components/Agent.ts` is for file-based agents
   - New swarm `WorkerRef` is a separate type with distinct name
   - **Decision:** Use separate names — `AgentRef`/`defineAgent()` for files, `WorkerRef`/`defineWorker()` for swarm

2. **~~Build-time vs runtime ID assignment?~~** ✅ RESOLVED
   - TaskRef has no `.id` property — use **object identity** as stable identifier
   - Numeric IDs assigned at emit time based on JSX order (two-pass)
   - Cross-file task definitions work correctly
   - **Decision:** Object identity + two-pass emit for ID assignment

3. **~~Should refs be extractable during build?~~** ✅ RESOLVED
   - `runtimeFn` extracts to runtime.js for execution (wraps callable code)
   - Swarm refs are **compile-time only** — no extraction needed
   - Refs hold metadata that becomes string literals in markdown output
   - **Decision:** Compile-time only, no extraction mechanism required

### Nice to Have

4. **~~Support for custom ID prefixes?~~** N/A
   - No longer relevant — IDs assigned at emit time using object identity
   - No user-facing IDs to customize

5. **~~Team member validation?~~** ✅ RESOLVED
   - Should `defineTeam()` validate that members are WorkerRefs?
   - **Decision:** Type-only validation — trust TypeScript, no runtime checks
   - Rationale: TS prevents invalid values; runtime checks add overhead for no benefit

---

## Implementation Order

1. **Create folder structure** — `src/components/swarm/`
2. **Implement enums** — `enums.ts` (no dependencies)
3. **Implement refs** — `refs.ts` (TaskRef, WorkerRef, TeamRef + factories)
4. **Implement guards** — `guards.ts` (type guards)
5. **Create index** — `index.ts` (re-exports)
6. **Update main exports** — `jsx.ts`, `index.ts`

Note: No registry/counter needed for Phase 1 — numeric IDs assigned at emit time (Phase 2+).
8. **Add tests** — Unit tests for all above
9. **Update package.json** — Add `exports` field for subpath

---

## Estimated Scope

| Item | Files | Lines (approx) |
|------|-------|----------------|
| Enums | 1 | 40 |
| Registry | 1 | 20 |
| Refs | 1 | 60 |
| Guards | 1 | 30 |
| Index | 1 | 15 |
| Main exports update | 2 | 5 |
| Tests | 1 | 100 |
| **Total** | **8** | **~270** |

---

## Dependencies

- No external dependencies
- Uses only TypeScript features
- No changes to parser/emitter (Phase 1 is refs-only)

---

## Success Criteria

Phase 1 is complete when:

1. ✅ Can import `defineTask`, `defineWorker`, `defineTeam` from package
2. ✅ `defineTask(subject)` returns `TaskRef` with only `subject` (no `.id`, no `.name`)
3. ✅ `defineWorker()` returns `WorkerRef` with type mapping
4. ✅ `defineTeam()` returns `TeamRef` with member tracking
5. ✅ Type guards (`isTaskRef`, `isWorkerRef`, `isTeamRef`) work correctly
6. ✅ Enums (`AgentType`, `PluginAgentType`, `Model`) export correct values
7. ✅ All unit tests pass
8. ✅ No breaking changes to existing functionality

---

## Next Steps After Phase 1

Phase 2 (`<TaskDef>` + `<TaskPipeline>`) will:
- Add IR nodes: `taskDef`, `taskPipeline`
- Add transformer: `transformTaskDef()`, `transformTaskPipeline()`
- Add emitter: emit `TaskCreate()` and `TaskUpdate()` syntax
- Consume `TaskRef` from Phase 1
