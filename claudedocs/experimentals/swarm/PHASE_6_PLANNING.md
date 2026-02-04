# Phase 6: Documentation + Examples — Planning Document

Implementation planning for comprehensive documentation and real-world examples.

---

## Document Hierarchy

| Document | Purpose | Authority |
|----------|---------|-----------|
| **swarm-claude-code.md** | Claude Code primitives (Task, Teammate, TaskCreate) | API reference |
| **GOLDEN_PATH.md** | TSX component API design | **Source of truth for implementation** |
| **specs/** | Component specifications (detailed, but contains inconsistencies) | Reference only |
| **PHASE_5_PLANNING.md** | Phase 5 implementation decisions | Resolved INC references |

**Critical Note:** The specs directory contains a SUPERSET of components beyond what GOLDEN_PATH defines. Phase 6 documentation should cover ONLY what's implemented per GOLDEN_PATH (Phases 1-5).

---

## Objective

Create comprehensive user-facing documentation and real-world examples that:
1. Teach users how to author swarm workflows in TSX
2. Provide copy-paste examples for common patterns
3. Integrate with existing documentation structure

---

## Technical Requirements

### From GOLDEN_PATH.md Phase 6

**Documentation deliverables:**
- `docs/swarm.md` — comprehensive API documentation
- `docs/README.md` — update to include swarm in index

**Example deliverables:**
- `src/app/commands/oauth-pipeline.tsx` — OAuth workflow (TaskPipeline focused)
- `src/app/commands/pr-review-pipeline.tsx` — PR review (parallel + sequential tasks)
- `src/app/examples/migration-workflow.tsx` — Full workflow with Team, Teammates, Shutdown

### Success Criteria (from GOLDEN_PATH)

Phase 6 is complete when:
1. `docs/swarm.md` exists with complete API documentation
2. `docs/README.md` updated to reference swarm documentation
3. At least 2 real examples in `src/app/commands/`
4. Examples compile successfully with `npm run build`
5. Output matches expected format from GOLDEN_PATH.md

---

## Incoherences and Technical Decisions

### INC-1. Example File Location

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Current file structure shows:
- `src/app/tests/oauth-pipeline.tsx` — exists as test fixture
- GOLDEN_PATH specifies `src/app/commands/oauth-pipeline.tsx`

**Question:** Should examples live in `src/app/commands/` or `src/app/tests/`?

**Analysis:**

| Location | Purpose | Build Output |
|----------|---------|--------------|
| `src/app/tests/` | Test fixtures for development | `.claude/commands/oauth.md` |
| `src/app/commands/` | Production commands | `.claude/commands/oauth.md` |
| `src/app/examples/` | Showcase examples | `.claude/commands/migration-workflow.md` |

GOLDEN_PATH mentions both `src/app/commands/` and `src/app/examples/`.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Move tests to commands/ | Matches GOLDEN_PATH | Mixes tests with production |
| B | Keep separate, add new examples | Clean separation | Duplication |
| C | Create examples/ dir for showcase | Clear purpose | New directory |
| D | Rename tests/ to examples/ | Simple rename | Breaks existing references |

**Recommendation:** Option C — Create `src/app/examples/` for showcase examples

**Rationale:**
- `src/app/tests/` stays for development fixtures
- `src/app/examples/` contains showcase examples referenced in docs
- `src/app/commands/` reserved for production commands
- Clear separation of concerns

---

### INC-2. docs/swarm.md Structure

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

How should `docs/swarm.md` be organized?

**Options:**

| Option | Structure | Pros | Cons |
|--------|-----------|------|------|
| A | Single monolithic file | Consistent with existing docs | Long file |
| B | Split into multiple files | Modular | More navigation |
| C | Main file + sub-sections | Best of both | Complex linking |

**Recommendation:** Option A — Single monolithic file

**Rationale:**
- Consistent with `docs/command.md`, `docs/agent.md` pattern
- Users can search within one file
- Easy to maintain

**Proposed Structure:**
```markdown
# Swarm System

## Quick Start
## Factory Functions
  ### defineTask()
  ### defineWorker()
  ### defineTeam()
## Components
  ### <TaskDef>
  ### <TaskPipeline>
  ### <Team>
  ### <Teammate>
  ### <ShutdownSequence>
  ### <Workflow>
## Builder API
  ### createPipeline()
## Output Formats
## Best Practices
## API Reference Tables
```

---

### INC-3. Import Path Convention

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

GOLDEN_PATH shows:
```tsx
import { defineTask, TaskDef, TaskPipeline } from 'react-agentic/swarm';
```

But current `src/app/tests/oauth-pipeline.tsx` uses:
```tsx
import { Command, defineTask, TaskDef, TaskPipeline } from '../../index.js';
```

**Question:** What's the canonical import path for documentation?

**Analysis:**

Looking at `src/index.ts` exports (not read, but inferred from patterns):
- Core exports: `Command`, `Agent`, etc.
- Swarm exports: likely re-exported from `src/components/swarm/index.ts`

**Options:**

| Option | Import Path | Pros | Cons |
|--------|-------------|------|------|
| A | `react-agentic` | Single entry point | Large import |
| B | `react-agentic/swarm` | Clear namespace | Subpath export needed |
| C | Show both in docs | Flexible | Confusing |

**Recommendation:** Option A — `react-agentic` with destructuring

**Rationale:**
- Simpler for users
- No subpath export configuration needed
- Consistent with core component imports

**Documentation example:**
```tsx
import {
  // Core
  Command,
  // Swarm
  defineTask,
  defineWorker,
  defineTeam,
  TaskDef,
  TaskPipeline,
  Team,
  Teammate,
  Workflow,
  ShutdownSequence,
} from 'react-agentic';
```

**Action needed:** Verify `src/index.ts` re-exports all swarm components.

---

### INC-4. Existing oauth-pipeline.tsx Enhancement

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Current `src/app/tests/oauth-pipeline.tsx` is Phase 2 only:
```tsx
<TaskPipeline title="OAuth Implementation" autoChain>
  <TaskDef task={Research} ... />
  <TaskDef task={Plan} ... />
  <TaskDef task={Implement} ... />
</TaskPipeline>
```

GOLDEN_PATH Phase 6 shows a more complete example with 6 tasks.

**Question:** Should we enhance the existing file or create new?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Enhance existing | Single file | Breaks existing tests |
| B | Create new in examples/ | Clean separation | Duplication |
| C | Leave existing, docs reference new | Both available | Two similar files |

**Recommendation:** Option B — Create new in `src/app/examples/`

**Rationale:**
- `src/app/tests/oauth-pipeline.tsx` serves as minimal test fixture
- `src/app/examples/oauth-pipeline.tsx` serves as complete showcase
- Docs reference the showcase version

---

### INC-5. docs/README.md Integration

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Where should swarm docs appear in the README index?

**Current structure:**
```markdown
## User Guides
| [Command](./command.md) | ...
| [Agent](./agent.md) | ...
| [Communication](./communication.md) | ...
...
```

**Options:**

| Option | Placement | Description |
|--------|-----------|-------------|
| A | After Communication | Part of core workflow |
| B | New "Advanced" section | Clearly advanced feature |
| C | New "Orchestration" section | Semantic grouping |
| D | At end of User Guides | Simple append |

**Recommendation:** Option C — New "Orchestration" section

**Rationale:**
- Swarm is a distinct feature set
- Groups well with future orchestration features
- Clear navigation

**Proposed README update:**
```markdown
## User Guides
...existing entries...

## Orchestration
| Guide | Description |
|-------|-------------|
| [Swarm System](./swarm.md) | Multi-agent orchestration with Teams, Tasks, and Workflows |
```

---

### INC-6. Builder API Documentation

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

GOLDEN_PATH defines `createPipeline()` builder:
```tsx
const pipeline = createPipeline('OAuth Implementation')
  .task('Research OAuth providers', 'research')
  .task('Create implementation plan', 'plan')
  .build();
```

**Question:** Is `createPipeline()` implemented? If so, how thoroughly should we document it?

**Analysis:**

From `src/components/swarm/index.ts`:
```typescript
export { createPipeline, type Pipeline, type PipelineBuilder, type PipelineStage } from './pipeline-builder.js';
```

The builder is exported. Need to verify implementation matches GOLDEN_PATH.

**Documentation needs:**
- Usage example
- Builder interface
- Pipeline interface
- Use cases (when to use builder vs direct JSX)

**Recommendation:** Include builder API in docs with clear use cases

---

### INC-7. Example Compilation Verification

**Status:** 🔴 NEEDS RESOLUTION

**The Problem:**

Success criteria requires: "Examples compile successfully with `npm run build`"

**Questions:**
1. How do we verify swarm examples compile?
2. Do we need a CI step?
3. Should docs include expected output?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Manual verification | Simple | Error-prone |
| B | Add test script | Automated | More setup |
| C | Include in existing test suite | Integrated | May slow tests |

**Recommendation:** Option A for Phase 6, consider B for future

**Implementation:**
```bash
# Manual verification
node dist/cli/index.js build "src/app/examples/*.tsx"
# Verify .claude/commands/ output matches expected
```

---

### INC-8. Enum Documentation

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

GOLDEN_PATH defines enums:
```typescript
AgentType.Explore // "Explore"
AgentType.Plan // "Plan"
Model.Haiku // "haiku"
PluginAgentType.SecuritySentinel // "compound-engineering:review:security-sentinel"
```

**Question:** How thoroughly should we document enum values?

**Options:**

| Option | Coverage |
|--------|----------|
| A | Full table with all values | Complete reference |
| B | Common values + link to source | Balanced |
| C | Just usage examples | Minimal |

**Recommendation:** Option A — Full table

**Rationale:**
- Users need to know valid values
- Plugin agent types are not discoverable
- Reference table aids selection

---

### INC-9. Output Format Documentation

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Should docs include expected markdown output for each component?

**GOLDEN_PATH includes output for each component.** This is valuable for understanding what the compiler produces.

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Include output for all components | Complete understanding | Long doc |
| B | Include output for key components | Balanced | Incomplete |
| C | Link to GOLDEN_PATH for output | Single source | External reference |

**Recommendation:** Option B — Key components with output

Include output for:
- `TaskPipeline` (mermaid + code)
- `Team` + `Teammate` (spawn + Task)
- `Workflow` (full orchestration)

Skip output for simple components where usage is clear.

---

### INC-10. Prompt Component Documentation

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

`<Prompt>` component is exported but not prominently featured in GOLDEN_PATH:
```tsx
<Teammate worker={Security} description="Security audit">
  <Prompt>
    <h2>Security Review Task</h2>
    <XmlBlock name="focus_areas">...</XmlBlock>
  </Prompt>
</Teammate>
```

**Question:** Should `<Prompt>` have its own section?

**Options:**

| Option | Approach |
|--------|----------|
| A | Own section | Clear visibility |
| B | Part of Teammate section | Contextual |
| C | Brief mention only | Minimal |

**Recommendation:** Option B — Part of Teammate section

**Rationale:**
- `<Prompt>` is a Teammate child, not standalone
- Usage is clear in Teammate context
- Avoids documentation fragmentation

---

### INC-11. Example Complexity Levels

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

GOLDEN_PATH Phase 6 specifies three examples with increasing complexity:

| Example | Complexity | Components |
|---------|------------|------------|
| oauth-pipeline | Basic | TaskDef, TaskPipeline |
| pr-review-pipeline | Intermediate | TaskDef, TaskPipeline (mixed dependencies) |
| migration-workflow | Advanced | Full Workflow with Team, Teammates, Shutdown |

**Question:** Is this the right progression?

**Analysis:**

The progression makes sense:
1. **Basic** — TaskPipeline with autoChain (sequential)
2. **Intermediate** — TaskPipeline with explicit blockedBy (DAG)
3. **Advanced** — Full orchestration with team coordination

**Recommendation:** Follow GOLDEN_PATH progression

**Enhancement:** Add comments in examples explaining what each demonstrates.

---

### INC-12. Cross-Reference with swarm-claude-code.md

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

Should `docs/swarm.md` reference `claudedocs/experimentals/swarm/docs/swarm-claude-code.md`?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Include reference | Users can see underlying API | Exposes internal docs |
| B | Self-contained | Clean user experience | Duplication |
| C | Link sparingly | Balanced | Maintenance burden |

**Recommendation:** Option B — Self-contained

**Rationale:**
- User docs should be self-sufficient
- Internal docs may change
- Users don't need to know Claude Code primitives

---

## File Structure

### New Files

```
docs/
└── swarm.md                          # Main swarm documentation (NEW)

src/app/examples/                      # NEW directory
├── oauth-pipeline.tsx                 # Basic example
├── pr-review-pipeline.tsx             # Intermediate example
└── migration-workflow.tsx             # Advanced example
```

### Modified Files

```
docs/README.md                         # Add Orchestration section
```

### Unchanged Files

```
src/app/tests/oauth-pipeline.tsx       # Keep as test fixture
```

---

## Documentation Content Outline

### docs/swarm.md Structure

```markdown
# Swarm System

Type-safe task orchestration for Claude Code's multi-agent capabilities.

## Quick Start

[Minimal example with TaskPipeline]

## Factory Functions

### defineTask(subject, name?)
[Props table, example, output]

### defineWorker(name, type, model?)
[Props table, AgentType enum, PluginAgentType enum, example]

### defineTeam(name, members?)
[Props table, example]

## Components

### <TaskDef>
[Props table, example, output]

### <TaskPipeline>
[Props table, autoChain explanation, example, mermaid output]

### <Team>
[Props table, example, output]

### <Teammate>
[Props table, Prompt child pattern, example, output]

### <ShutdownSequence>
[Props table, team inheritance, example, output]

### <Workflow>
[Props table, context propagation, full example, output]

## Builder API

### createPipeline()
[Builder pattern, interface, example]

## Enums Reference

### AgentType
[Full table]

### PluginAgentType
[Full table]

### Model
[Full table]

## Best Practices

[Common patterns, dos and don'ts]

## Examples

[Link to src/app/examples/]
```

---

## Implementation Order

1. **Verify swarm exports** — Check `src/index.ts` re-exports all swarm components
2. **Create examples directory** — `src/app/examples/`
3. **Write oauth-pipeline.tsx** — Basic TaskPipeline example
4. **Write pr-review-pipeline.tsx** — Intermediate DAG example
5. **Write migration-workflow.tsx** — Advanced Workflow example
6. **Verify examples compile** — Run build, check output
7. **Write docs/swarm.md** — Complete documentation
8. **Update docs/README.md** — Add Orchestration section
9. **Final verification** — All examples compile, docs are accurate

---

## Dependencies

- **Phase 1-5 complete:** All components implemented and exported
- **Compiler working:** `npm run build` functional
- **Existing docs structure:** Follow patterns from `docs/command.md`

---

## Resolution Summary

| ID | Issue | Status | Decision |
|----|-------|--------|----------|
| INC-1 | Example file location | 🔴 NEEDS RESOLUTION | Option C — Create `src/app/examples/` |
| INC-2 | docs/swarm.md structure | 🟡 FOR DISCUSSION | Option A — Single monolithic file |
| INC-3 | Import path convention | 🔴 NEEDS RESOLUTION | Option A — `react-agentic` single entry |
| INC-4 | oauth-pipeline enhancement | 🟡 FOR DISCUSSION | Option B — Create new in examples/ |
| INC-5 | README integration | 🟡 FOR DISCUSSION | Option C — New "Orchestration" section |
| INC-6 | Builder API documentation | 🟡 FOR DISCUSSION | Include with clear use cases |
| INC-7 | Compilation verification | 🔴 NEEDS RESOLUTION | Option A — Manual verification |
| INC-8 | Enum documentation | 🟡 FOR DISCUSSION | Option A — Full tables |
| INC-9 | Output format docs | 🟡 FOR DISCUSSION | Option B — Key components only |
| INC-10 | Prompt component | 🟡 FOR DISCUSSION | Option B — Part of Teammate section |
| INC-11 | Example complexity | 🟡 FOR DISCUSSION | Follow GOLDEN_PATH progression |
| INC-12 | Cross-reference internal docs | 🟡 FOR DISCUSSION | Option B — Self-contained |

---

## Pre-Implementation Checklist

Before starting Phase 6 implementation, resolve:

1. [ ] **INC-1:** Confirm `src/app/examples/` directory creation
2. [ ] **INC-3:** Verify `src/index.ts` exports all swarm components
3. [ ] **INC-7:** Establish compilation verification process

---

## Estimated Scope

| Deliverable | Complexity | Files |
|-------------|------------|-------|
| docs/swarm.md | High | 1 |
| docs/README.md update | Low | 1 |
| oauth-pipeline.tsx | Medium | 1 |
| pr-review-pipeline.tsx | Medium | 1 |
| migration-workflow.tsx | High | 1 |
| Export verification | Low | 1 |

**Total: 6 files, 1 verification task**

---

## Cross-Document Incoherences (GOLDEN_PATH vs specs)

The following critical inconsistencies were discovered between GOLDEN_PATH.md and specs/*.

---

### INC-13. defineTask() Signature Inconsistency

**Status:** ✅ RESOLVED

**The Problem:**

**GOLDEN_PATH.md:**
```tsx
const Research = defineTask('Research best practices', 'research');
// defineTask(subject, name?)
```

**specs/enums.ts:**
```tsx
const Research = defineTask('research', 'Research best practices');
// defineTask(name, subject)
```

The argument order is **reversed** between the two sources.

**Verification:** Checked `src/components/swarm/refs.ts` lines 54-61:

```typescript
export function defineTask(subject: string, name?: string): TaskRef {
  return {
    subject,
    name: name ?? deriveNameFromSubject(subject),
    __id: randomUUID(),
    __isTaskRef: true,
  };
}
```

**Resolution:** Implementation matches GOLDEN_PATH: `defineTask(subject, name?)`

**Action:** specs/enums.ts needs updating. Document using GOLDEN_PATH signature.

---

### INC-14. TaskRef Interface Field Names

**Status:** ✅ RESOLVED

**The Problem:**

**GOLDEN_PATH.md:**
```typescript
interface TaskRef {
  subject: string;           // Human-readable title
  name: string;              // Short label for mermaid
  __id: string;              // UUID (internal)
  readonly __isTaskRef: true; // Type guard marker
}
```

**specs/enums.ts:**
```typescript
interface TaskRef {
  readonly id: string;       // Auto-generated unique ID
  readonly name: string;     // Human-readable name
  readonly subject: string;  // The task subject
}
```

**Verification:** Checked `src/components/swarm/refs.ts` lines 18-27:

```typescript
export interface TaskRef {
  subject: string;           // ✅ Matches GOLDEN_PATH
  name: string;              // ✅ Matches GOLDEN_PATH
  __id: string;              // ✅ Matches GOLDEN_PATH
  readonly __isTaskRef: true; // ✅ Matches GOLDEN_PATH
}
```

**Resolution:** Implementation matches GOLDEN_PATH exactly.

**Action:** specs/enums.ts needs updating. Document using GOLDEN_PATH interface.

---

### INC-15. WorkerRef/TeamRef Type Guard Markers

**Status:** ✅ RESOLVED

**The Problem:**

**GOLDEN_PATH.md:**
```typescript
interface WorkerRef {
  name: string;
  type: string;
  model?: string;
  __id: string;
  readonly __isWorkerRef: true;  // Type guard marker
}

interface TeamRef {
  name: string;
  members?: WorkerRef[];
  __id: string;
  readonly __isTeamRef: true;    // Type guard marker
}
```

**specs/enums.ts:**
```typescript
interface WorkerRef {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType | PluginAgentType | string;
  readonly model?: Model;
  // NO type guard marker
}

interface TeamRef {
  readonly id: string;
  readonly name: string;
  readonly members: WorkerRef[];
  // NO type guard marker
}
```

**Verification:** Checked `src/components/swarm/refs.ts`:

```typescript
// WorkerRef (lines 71-82)
export interface WorkerRef {
  name: string;
  type: string;
  model?: string;
  __id: string;
  readonly __isWorkerRef: true;  // ✅ Present
}

// TeamRef (lines 117-126)
export interface TeamRef {
  name: string;
  members?: WorkerRef[];
  __id: string;
  readonly __isTeamRef: true;    // ✅ Present
}
```

**Resolution:** Implementation matches GOLDEN_PATH. Type guard markers are present.

**Action:** specs/enums.ts needs updating. Document using GOLDEN_PATH interfaces.

---

### INC-16. specs Contains Unimplemented Components

**Status:** 🔴 NEEDS RESOLUTION — Documentation Scope

**The Problem:**

specs/ defines many components NOT in GOLDEN_PATH Phases 1-5:

| Component | In GOLDEN_PATH | In specs | Status |
|-----------|----------------|----------|--------|
| `<TaskPool>` | ❌ | ✅ | Not implemented |
| `<Swarm>` | ❌ | ✅ | Not implemented |
| `<Message>` | ❌ | ✅ | Not implemented |
| `<Broadcast>` | ❌ | ✅ | Not implemented |
| `<ParallelWorkers>` | ❌ | ✅ | Not implemented |
| `<OrchestrationPattern>` | ❌ | ✅ | Not implemented |
| `<Callout>` | ❌ | ✅ | Not implemented |
| `<CodeBlock>` | ❌ | ✅ | Not implemented |
| `<MarkdownTable>` | ❌ | ✅ | Not implemented |
| `<SpawnBackend>` | ❌ | ✅ | Not implemented |
| `<WorkflowSteps>` | ❌ | ✅ | Not implemented |
| `<AgentTypeDef>` | ❌ | ✅ | Not implemented |

**Question:** Should Phase 6 docs mention these as "Future Features"?

**Options:**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| A | Document only GOLDEN_PATH components | Accurate | Users miss potential |
| B | Add "Roadmap" section with future components | Informative | May confuse users |
| C | Ignore specs components entirely | Simple | Wastes specs effort |

**Recommendation:** Option A — Document only implemented components

**Rationale:**
- Documentation should reflect what users can actually use
- Unimplemented components should not appear in user docs
- specs/ is for internal planning, not user reference

---

### INC-17. specs Contains Advanced Helpers Not in GOLDEN_PATH

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

specs/enums.ts defines many helpers not mentioned in GOLDEN_PATH:

**Workflow Factories:**
- `createReviewWorkflow(config)`
- `createPipelineWorkflow(config)`
- `createSwarmWorkflow(config)`

**Dependency Combinators:**
- `combine(...refs)`
- `allOf(...sources)`
- `dependencyGroup(name, tasks)`
- `atLeast(n, tasks)`

**Iteration Helpers:**
- `mapToTasks(items, mapper)`
- `mapToWorkers(items, mapper)`
- `batchTasks(prefix, configs)`
- `batchWorkers(prefix, configs)`

**Variable Interpolation:**
- `interpolate(template, vars)`
- `createPromptTemplate(template)`
- `` t`template` `` (tagged template)

**Question:** Are these implemented? Should they be documented?

**Analysis:**

From `src/components/swarm/index.ts`, only these are exported:
- `createPipeline` ✅

The advanced helpers from specs are NOT exported.

**Recommendation:** Do not document unimplemented helpers. Document only `createPipeline()`.

---

### INC-18. specs/examples.md Uses Old API

**Status:** 🔴 NEEDS RESOLUTION — Specs Sync

**The Problem:**

**specs/examples.md Example 7:**
```tsx
<ShutdownSequence
  teammates={['security', 'perf']}  // ❌ Old API
  reason="Work complete"
/>
```

**GOLDEN_PATH.md (and implementation):**
```tsx
<ShutdownSequence
  workers={[Security, Perf]}  // ✅ Current API
  reason="Work complete"
/>
```

**Differences:**
- Prop name: `teammates` (old) vs `workers` (current)
- Type: `string[]` (old) vs `WorkerRef[]` (current)

**Status:** Phase 4 implemented `workers: WorkerRef[]` per GOLDEN_PATH.

**Action:** specs/examples.md needs updating. **Not a Phase 6 blocker** — but flag for post-Phase 6 cleanup.

---

### INC-19. Team Component Dual API

**Status:** 🟡 FOR DISCUSSION

**The Problem:**

**specs/Team.spec.tsx supports two patterns:**

```tsx
// Pattern 1: TeamRef (GOLDEN_PATH)
<Team team={ReviewTeam} description="...">

// Pattern 2: Legacy string name
<Team name="code-review">
```

**GOLDEN_PATH only shows Pattern 1.**

**Question:** Should docs mention legacy pattern?

**Options:**

| Option | Approach |
|--------|----------|
| A | Document only TeamRef pattern | Clean, forward-looking |
| B | Document both with deprecation note | Complete |
| C | Document TeamRef, brief legacy mention | Balanced |

**Recommendation:** Option A — Document only TeamRef pattern

**Rationale:**
- GOLDEN_PATH is authoritative
- Legacy pattern should be discouraged
- Simpler documentation

---

### INC-21. Missing Exports in src/index.ts

**Status:** 🔴 CRITICAL — BLOCKING

**The Problem:**

`src/components/swarm/index.ts` exports ALL components, but `src/index.ts` only re-exports SOME:

**Exported from swarm/index.ts:**
```typescript
export { Team, type TeamProps } from './Team.js';
export { Teammate, type TeammateProps } from './Teammate.js';
export { Prompt, type PromptProps } from './Prompt.js';
export { Workflow, type WorkflowProps } from './Workflow.js';
```

**Currently re-exported in src/index.ts:**
```typescript
export {
  // ✅ Exported
  TaskDef,
  TaskPipeline,
  ShutdownSequence,
  createPipeline,
  defineTask,
  defineWorker,
  defineTeam,
  // ...types

  // ❌ MISSING
  // Team,
  // Teammate,
  // Prompt,
  // Workflow,
} from './components/swarm/index.js';
```

**Impact:**

Users cannot import Phase 3, 4, 5 components from `react-agentic`:
```tsx
// ❌ This will fail
import { Team, Teammate, Workflow } from 'react-agentic';
```

**Root Cause:**

When Phase 3-5 were implemented, the exports were added to `swarm/index.ts` but NOT to the main `src/index.ts`.

**Required Fix (Before Phase 6):**

Update `src/index.ts` to include:
```typescript
export {
  // Existing...

  // ADD Phase 3
  Team,
  Teammate,
  Prompt,

  // ADD Phase 5
  Workflow,

  // ADD Types
  type TeamProps,
  type TeammateProps,
  type PromptProps,
  type WorkflowProps,
} from './components/swarm/index.js';
```

**Status:** This is a **BLOCKING BUG** that must be fixed before Phase 6 documentation can accurately describe imports.

---

### INC-20. createPipeline() Signature Inconsistency

**Status:** ✅ RESOLVED

**The Problem:**

**GOLDEN_PATH.md:**
```tsx
const pipeline = createPipeline('OAuth Implementation')
  .task('Research OAuth providers', 'research')  // (subject, name)
  .task('Create implementation plan', 'plan')
  .build();
```

**specs/enums.ts:**
```tsx
const pipeline = createPipeline('OAuth Implementation')
  .task('research', 'Research OAuth providers')  // (name, subject)
  .build();
```

**Verification:** Checked `src/components/swarm/pipeline-builder.ts` lines 40-48:

```typescript
/**
 * Add a task to the pipeline
 *
 * @param subject - Human-readable task title (maps to TaskCreate.subject)
 * @param name - Optional short label for diagrams (derived from subject if not provided)
 * @param description - Optional description for the stage
 */
task(subject: string, name?: string, description?: string): PipelineBuilder;
```

**Resolution:** Implementation matches GOLDEN_PATH: `.task(subject, name?, description?)`

**Action:** specs/enums.ts needs updating. Document using GOLDEN_PATH signature.

---

## Resolution Summary (FINAL)

All items have been resolved through user decisions.

| ID | Issue | Status | Decision |
|----|-------|--------|----------|
| INC-1 | Example file location | ✅ RESOLVED | Create `src/app/examples/` |
| INC-2 | docs/swarm.md structure | ✅ RESOLVED | Single monolithic file |
| INC-3 | Import path convention | ✅ RESOLVED | `import from 'react-agentic'` |
| INC-4 | oauth-pipeline enhancement | ✅ RESOLVED | Create new in examples/ |
| INC-5 | README integration | ✅ RESOLVED | New "Orchestration" section |
| INC-6 | Builder API documentation | ✅ RESOLVED | Full documentation with examples |
| INC-7 | Compilation verification | ✅ RESOLVED | Manual verification |
| INC-8 | Enum documentation | ✅ RESOLVED | Full enum tables |
| INC-9 | Output format docs | ✅ RESOLVED | Key components only |
| INC-10 | Prompt component | ✅ RESOLVED | Part of Teammate section |
| INC-11 | Example complexity | ✅ RESOLVED | Follow GOLDEN_PATH progression |
| INC-12 | Cross-reference internal docs | ✅ RESOLVED | Self-contained |
| INC-13 | defineTask() signature | ✅ VERIFIED | `defineTask(subject, name?)` |
| INC-14 | TaskRef interface fields | ✅ VERIFIED | Matches GOLDEN_PATH |
| INC-15 | Type guard markers | ✅ VERIFIED | Present in implementation |
| INC-16 | Unimplemented components | ✅ RESOLVED | Document only GOLDEN_PATH |
| INC-17 | Advanced helpers | ✅ RESOLVED | Only `createPipeline()` |
| INC-18 | specs/examples.md old API | ✅ DONE | Fixed BEFORE Phase 6 |
| INC-19 | Team dual API | ✅ RESOLVED | Only TeamRef pattern |
| INC-20 | createPipeline() signature | ✅ VERIFIED | `.task(subject, name?)` |
| INC-21 | Missing exports | ✅ RESOLVED | Include in Phase 6 |

---

## Pre-Implementation Checklist (Updated)

Before starting Phase 6 implementation:

**Resolved (Verified):**
- [x] **INC-13:** `defineTask(subject, name?)` — matches GOLDEN_PATH ✅
- [x] **INC-14:** TaskRef interface matches GOLDEN_PATH exactly ✅
- [x] **INC-15:** Type guard markers present in all refs ✅
- [x] **INC-20:** `createPipeline().task(subject, name?)` — matches GOLDEN_PATH ✅
- [x] **INC-18:** specs/enums.ts and specs/examples.md — synced with implementation ✅

**Part of Phase 6 Implementation:**
1. [ ] **INC-21:** Fix missing exports in `src/index.ts`:
   - Add `Team`, `Teammate`, `Prompt`, `Workflow`
   - Add `TeamProps`, `TeammateProps`, `PromptProps`, `WorkflowProps`

**Still Needs Resolution:**
2. [ ] **INC-1:** Create `src/app/examples/` directory
3. [ ] **INC-3:** Import path verified (after INC-21 fix)
4. [ ] **INC-7:** Manual compilation verification
5. [ ] **INC-16:** Document only GOLDEN_PATH components

---

## Post-Phase 6 Tasks

After Phase 6 documentation is complete:

1. **Specs sync completed (INC-18):**
   - ✅ Updated specs/examples.md — Examples 1, 2, 7, 8, 12 fixed
   - ✅ Updated specs/enums.ts — All signatures match implementation:
     - `defineTask(subject, name?)` ✅
     - `TaskRef.__id` and `__isTaskRef` ✅
     - `WorkerRef.__id` and `__isWorkerRef` ✅
     - `TeamRef.__id` and `__isTeamRef` ✅
     - `createPipeline().task(subject, name?)` ✅
   - [ ] Update specs/Team.spec.tsx to deprecate legacy pattern (INC-19)

2. **Consider future phases:**
   - Evaluate which specs components should be implemented
   - Create roadmap for unimplemented components (INC-16)

---

## Open Questions for Review

1. Should `docs/grammar.md` be updated to include swarm components in the EBNF?
2. Should we add swarm components to the "Component Overview" diagram in README?
3. ~~Is `createPipeline()` fully implemented per GOLDEN_PATH spec?~~ ✅ Yes, verified
4. Should examples include inline comments explaining each section?
5. ~~What is the correct `defineTask()` signature?~~ ✅ `defineTask(subject, name?)` verified
6. Should specs be updated to match implementation after Phase 6?

---

## Summary of Findings

### Critical Issues Found

| Issue | Severity | Status |
|-------|----------|--------|
| **INC-21:** Missing exports in src/index.ts | 🔴 BLOCKING | Must fix as part of Phase 6 |
| specs/enums.ts signature mismatch | ✅ | **FIXED** |
| specs/examples.md old API | ✅ | **FIXED** |

### Implementation Verification Results

| Component | GOLDEN_PATH | Implementation | Status |
|-----------|-------------|----------------|--------|
| `defineTask(subject, name?)` | ✅ | ✅ Matches | Verified |
| `TaskRef` interface | ✅ | ✅ Matches | Verified |
| `WorkerRef` interface | ✅ | ✅ Matches | Verified |
| `TeamRef` interface | ✅ | ✅ Matches | Verified |
| `createPipeline().task()` | ✅ | ✅ Matches | Verified |
| Main exports complete | ✅ | ❌ Missing | **BLOCKING** |

### Specs vs Implementation Drift

The `specs/` directory drift has been **FIXED**:

| Item | Before | After | Status |
|------|--------|-------|--------|
| `defineTask()` arg order | `(name, subject)` | `(subject, name?)` | ✅ Fixed |
| `TaskRef.id` field | `id` | `__id` + `__isTaskRef` | ✅ Fixed |
| `WorkerRef` type guard | Missing | `__id` + `__isWorkerRef` | ✅ Fixed |
| `TeamRef` type guard | Missing | `__id` + `__isTeamRef` | ✅ Fixed |
| `createPipeline().task()` | `(name, subject)` | `(subject, name?)` | ✅ Fixed |
| `ShutdownSequence.teammates` | `string[]` | `workers: WorkerRef[]` | ✅ Fixed |
| Example 1-12 syntax | Old API | New API | ✅ Fixed |

All specs files now match the implementation.
