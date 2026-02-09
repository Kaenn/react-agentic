# Plan: Spawn Feature Improvements

Three changes to close gaps between the golden path design and real usage.

---

## Decisions Log

All design questions resolved through discussion.

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Emitted field name for TaskDef prompt | `description` — match Claude Code TaskCreate API |
| 2 | Reuse `extractPromptChild()` for TaskDef | Yes — reuse existing Teammate pattern |
| 3 | Both `prompt` prop + `<Prompt>` child provided | Compile error — stricter than Teammate |
| 4 | Summary table column name | Keep "Description" — truncate long prompts |
| 5 | `defineWorker` type signature | No type change needed — resolution is compile-time only, `type` already accepts `string` |
| 6 | Replace `<Agent>` with `defineAgent()`? | No — keep `<Agent>` as JSX (TSX-native) |
| 7 | How to link internal agents to workers | Import-based cross-file resolution (compiler follows imports) |
| 8 | Remove ref-only `defineAgent(config)`? | Keep for now — still used by `SpawnAgent` |

---

## Change 1: TaskDef `description` → `prompt` (with child support)

### Problem

`TaskDef.description` is semantically misleading. The content IS the prompt — instructions for what the worker should do. `Teammate` already supports both a `prompt` prop and `<Prompt>` children. `TaskDef` should follow the same pattern.

### Current → Target

```tsx
// BEFORE
<TaskDef task={Research} description="Research OAuth2 providers" />

// AFTER — string prop (renamed)
<TaskDef task={Research} prompt="Research OAuth2 providers" />

// AFTER — rich JSX child (new capability)
<TaskDef task={Research} activeForm="Researching...">
  <Prompt>
    <h2>Research OAuth2 Providers</h2>
    <ul>
      <li>Compare Google, GitHub, Auth0</li>
      <li>Evaluate pricing, complexity, features</li>
    </ul>
  </Prompt>
</TaskDef>
```

### Emitted output (unchanged shape)

```javascript
// prompt prop → description in output (matches Claude Code API)
TaskCreate({ subject: "Research OAuth providers", description: "Research OAuth2 providers", activeForm: "Researching..." })
```

### Rules

- `prompt` prop OR `<Prompt>` child — one required
- Both provided → **compile error** (not silent override)
- Neither provided → compile error
- Summary table column stays "Description", truncates to 80 chars

### Files to Change

| File | Change |
|------|--------|
| `src/components/swarm/TaskDef.tsx` | Rename `description` → `prompt`, add `children?: ReactNode` |
| `src/ir/swarm-nodes.ts` | Rename `TaskDefNode.description` → `TaskDefNode.prompt` |
| `src/parser/transformers/swarm.ts` | `transformTaskDef()`: extract `prompt` prop OR `<Prompt>` child via `extractPromptChild()`. Error if both. |
| `src/emitter/swarm-emitter.ts` | `emitTaskDefCreate()`: read `node.prompt`, emit as `description` in TaskCreate |
| `src/emitter/swarm-emitter.ts` | `emitSummaryTable()`: truncate prompt to 80 chars in Description column |
| `src/components/swarm/pipeline-builder.ts` | Rename `PipelineStage.description` → `prompt`, rename `.task()` param `description` → `prompt` |
| `tests/emitter/swarm/swarm-emitter.test.ts` | Update all `TaskDefNode` objects: `description` → `prompt` (~20 instances) |
| `tests/grammar/SwarmComponents/task-pipeline.test.ts` | Update all `<TaskDef description="...">` → `prompt="..."` (~15 instances), add new tests for `<Prompt>` child and error cases |

---

## Change 2: `defineWorker` accepts imported Agent as type

### Problem

`defineWorker` only accepts `AgentType` enums or raw strings. Users defining custom agents via `<Agent>` cannot use them as worker types without manually duplicating the agent name as a string.

### Target: three accepted forms

```tsx
// 1. Built-in AgentType enum (unchanged)
const Explorer = defineWorker('explorer', AgentType.Explore);

// 2. Raw string — external plugins, third-party (unchanged)
const External = defineWorker('ext', PluginAgentType.SecuritySentinel);
const Custom = defineWorker('custom', 'some-external-agent');

// 3. Imported internal Agent (NEW)
import CodeReviewer from '../agents/code-reviewer.tsx';
const Reviewer = defineWorker('reviewer', CodeReviewer);
// Compiler follows import → finds <Agent name="code-reviewer">
// Emits: subagent_type: "code-reviewer"
```

### Cross-file resolution flow

```
defineWorker('reviewer', CodeReviewer)
        │
        ▼
  CodeReviewer is a default import from '../agents/code-reviewer.tsx'
        │
        ▼
  Transformer uses importDecl.getModuleSpecifierSourceFile() to get the imported SourceFile
        │
        ▼
  Searches for <Agent name="..."> in the default export
        │
        ▼
  Extracts name prop → "code-reviewer"
        │
        ▼
  Emits subagent_type: "code-reviewer"
```

### Files to Change

| File | Change |
|------|--------|
| `src/parser/transformers/swarm.ts` | `extractWorkerRefFromAttribute()`: when `defineWorker()` type arg is an Identifier (not enum/string), check if it's a default import and follow the import |
| `src/parser/transformers/swarm.ts` | New helper: `resolveAgentNameFromImport(varName, ctx)` — finds import declaration, resolves source file, extracts `<Agent name="...">` |
| `src/components/swarm/refs.ts` | No change — `type` param already accepts `string`, resolution is compile-time only |
| `src/ir/swarm-nodes.ts` | No change — `workerType` is already `string` |
| `src/emitter/swarm-emitter.ts` | No change — already emits `workerType` as-is |

### Transformer implementation: ts-morph approach

Access to the ts-morph Project is through `ctx.sourceFile.getProject()`. The resolution uses ts-morph's built-in import resolution:

```typescript
function resolveAgentNameFromImport(varName: string, ctx: TransformContext): string | null {
  const sourceFile = ctx.sourceFile;
  if (!sourceFile) return null;

  // 1. Find the import declaration for this variable
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport?.getText() === varName) {
      // 2. Resolve the imported source file (ts-morph handles path resolution)
      const importedFile = importDecl.getModuleSpecifierSourceFile();
      if (!importedFile) return null;

      // 3. Find <Agent name="..."> in the imported file's default export
      // Search JSX elements for Agent component, extract name prop
      return extractAgentNameFromFile(importedFile);
    }
  }
  return null;
}
```

Key: `getModuleSpecifierSourceFile()` handles relative paths, extensions, and tsconfig aliases — no manual path resolution needed.

### Edge cases

- Import points to a non-Agent file → compile error: "Imported file does not contain an <Agent> component"
- Import points to a file with multiple `<Agent>` → error: "Agent files should contain exactly one <Agent>"
- Circular imports → ts-morph handles this (files are already parsed)
- Named imports (not default) → not supported initially, only default export
- Agent with render props children → only `name` prop is extracted, children are ignored

---

## Change 3: Update Docs, Examples, and Tests

### Files to Update

| File | Change |
|------|--------|
| `claudedocs/experimentals/swarm/GOLDEN_PATH.md` | Update all TaskDef examples (`description` → `prompt`), add import-based defineWorker examples |
| `docs/swarm.md` | Update TaskDef prop tables and examples |
| `src/app/examples/tech-compare.tsx` | Update TaskDef props |
| `src/app/examples/migration-workflow.tsx` | Update TaskDef props |
| `src/app/examples/pr-review-pipeline.tsx` | Update TaskDef props |
| `src/app/examples/oauth-pipeline.tsx` | Update TaskDef props |
| `src/app/tests/oauth-pipeline.tsx` | Update TaskDef props |
| `tests/grammar/SwarmComponents/workflow.test.ts` | Update any TaskDef references |

### New Tests Needed

| File | Tests |
|------|-------|
| `tests/grammar/SwarmComponents/task-pipeline.test.ts` | Add: `<Prompt>` child works, both prop+child errors, neither errors |
| `tests/grammar/SwarmComponents/` (new file or extend) | Add: cross-file import resolution for defineWorker with imported Agent |

---

## Execution Order

```
Change 1 (TaskDef prompt) ─── independent
    │
    ├── 1a: Rename props/IR (TaskDef.tsx, swarm-nodes.ts, pipeline-builder.ts)
    ├── 1b: Update transformer (extract prompt prop + Prompt child, error on both)
    ├── 1c: Update emitter (prompt → description mapping, truncation)
    ├── 1d: Update existing tests
    └── 1e: Add new test cases (Prompt child, error cases)

Change 2 (defineWorker + cross-file) ─── independent
    │
    ├── 2a: Add resolveAgentNameFromImport() helper to transformer
    ├── 2b: Wire into extractWorkerRefFromAttribute() for Identifier type args
    ├── 2c: Add tests for import resolution
    └── 2d: Test with example agent + worker

Change 3 (Docs + Examples) ─── after 1 and 2
    │
    ├── 3a: Update all example files (description → prompt)
    ├── 3b: Update GOLDEN_PATH.md with both changes
    └── 3c: Update docs/swarm.md
```

Changes 1 and 2 are independent — can be worked in parallel.
Change 3 depends on both 1 and 2.

---

## Test Scenarios

### Change 1: TaskDef prompt
- `<TaskDef task={Ref} prompt="short string" />` → compiles, emits `description` in TaskCreate
- `<TaskDef task={Ref}><Prompt><h2>Rich</h2></Prompt></TaskDef>` → compiles, emits markdown as `description`
- `<TaskDef task={Ref} prompt="x"><Prompt>y</Prompt></TaskDef>` → **compile error**
- `<TaskDef task={Ref} />` (neither) → **compile error**
- `<TaskPipeline>` with mixed prompt/child TaskDefs → all compile correctly
- Summary table truncates prompts > 80 chars
- Emitted TaskCreate uses `description` field (not `prompt`)
- `createPipeline().task('Subject', 'name', 'prompt text')` → works with renamed param

### Change 2: defineWorker + imported Agent
- `defineWorker('name', AgentType.Explore)` → still works (backward compat)
- `defineWorker('name', PluginAgentType.SecuritySentinel)` → still works
- `defineWorker('name', 'custom-string')` → still works
- `defineWorker('name', ImportedAgent)` where ImportedAgent is default import from Agent file → resolves to agent name
- Import points to non-Agent file → clear compile error
- Teammate using import-backed worker emits correct `subagent_type`
- Full Workflow with mixed enum + imported workers compiles

---

## Open Issues (all resolved)

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Teammate `description` vs TaskDef `prompt` naming asymmetry | Acceptable — different APIs justify different prop shapes |
| 2 | Cross-file: `getModuleSpecifierSourceFile()` reliability | Accept risk — if null, emit clear error with fallback: "Could not resolve import. Use a string literal instead." |
