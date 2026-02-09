# Phase 38: Unified Assign with from Prop - Research

**Researched:** 2026-02-01
**Domain:** TSX component API design, TypeScript compile-time transformations, bash code generation
**Confidence:** HIGH

## Summary

Phase 38 unifies data assignment patterns by extending `<Assign>` with a single `from` prop that accepts different source types through helper functions: `file()`, `bash()`, `value()`, and existing `runtimeFn()`. This replaces the current mutually-exclusive prop approach (`bash=`, `value=`, `env=`) and the separate `<ReadFile>` component with a consistent, composable pattern.

The implementation is primarily a refactor of existing, well-understood patterns. The current codebase already handles:
1. Variable assignment with `useVariable()` and `<Assign>` (working)
2. File reading with `<ReadFile>` (working, Phase 36)
3. Runtime function calls with `runtimeFn().Call` (working, Phase 37)
4. Template string interpolation with runtime variable references (working)

The phase consolidates these into a unified source-based pattern without introducing new runtime semantics.

**Primary recommendation:** This is a straightforward API refactor building on proven patterns. Focus planning on systematic migration of existing components and tests, clear source helper typing, and comprehensive validation in both V1 and V3 transformers.

## Standard Stack

### Core

| Component | Current State | Role |
|-----------|---------------|------|
| `useVariable<T>()` | Exists (src/primitives/variables.ts) | Creates typed variable references |
| `<Assign>` | Exists (src/primitives/variables.ts) | Shell variable assignment primitive |
| `<AssignGroup>` | Exists (src/primitives/variables.ts) | Groups multiple assignments in one bash block |
| `<ReadFile>` | Exists (src/primitives/files.ts, Phase 36) | File reading primitive (to be replaced) |
| `runtimeFn()` | Exists (src/components/runtime-fn.ts) | Runtime function wrapper with `.Call` component |

### Implementation Components

| Module | Purpose | Existing Pattern |
|--------|---------|------------------|
| IR nodes (src/ir/nodes.ts) | AssignNode with assignment discriminated union | Exists, will extend |
| Transformer (src/parser/transformers/variables.ts) | Transforms Assign JSX to AssignNode IR | Exists, will refactor |
| Emitter (src/emitter/emitter.ts) | Emits bash code blocks from AssignNode | Exists, unchanged emit logic |
| Runtime emitter (src/emitter/runtime-markdown-emitter.ts) | Throws for V1-only nodes in runtime docs | Already excludes Assign |

### Type System

No external libraries needed. Pure TypeScript:

```typescript
// Branded types or discriminated unions for source helpers
interface FileSource { __sourceType: 'file'; path: string; optional?: boolean; }
interface BashSource { __sourceType: 'bash'; command: string; }
interface ValueSource { __sourceType: 'value'; value: string; raw?: boolean; }

// Helper functions return source objects
function file(path: string, options?: { optional?: boolean }): FileSource;
function bash(command: string): BashSource;
function value(val: string, options?: { raw?: boolean }): ValueSource;
```

## Architecture Patterns

### Pattern 1: Source Helper Functions (Claude's Discretion)

**What:** Pure TypeScript functions that return typed source objects consumed by `<Assign>`

**Implementation approaches:**

**Option A: Branded types** (simpler, recommended)
```typescript
export interface FileSource {
  __sourceType: 'file';
  path: string;
  optional?: boolean;
}

export function file(path: string, options?: { optional?: boolean }): FileSource {
  return { __sourceType: 'file', path, ...options };
}
```

**Option B: Class-based** (more boilerplate)
```typescript
export class FileSource {
  readonly __sourceType = 'file' as const;
  constructor(public path: string, public optional?: boolean) {}
}
```

**Recommendation:** Option A (branded types) — matches existing patterns in codebase (e.g., `runtimeFn` uses object markers, not classes).

### Pattern 2: Template String Interpolation

**What:** Convert TypeScript template literals with variable references to shell variable syntax

**Current implementation** (from src/parser/transformers/shared.ts):

```typescript
export function extractTemplateContent(expr: TemplateExpression): string {
  const head = expr.getHead().getLiteralValue();
  const spans = expr.getTemplateSpans();

  let result = head;
  for (const span of spans) {
    const spanExpr = span.getExpression();

    // Property access: ${ctx.phaseDir} → $CTX_phaseDir
    if (Node.isPropertyAccessExpression(spanExpr)) {
      const varName = getRuntimeVarName(spanExpr);
      const path = getRuntimeVarPath(spanExpr);
      result += `$${varName}_${path.join('_')}`;
    }
    // Identifier: ${phaseId} → $PHASE_ID (simple variable)
    else if (Node.isIdentifier(spanExpr)) {
      const varRef = ctx.variables.get(spanExpr.getText());
      result += `$${varRef.envName}`;
    }

    result += span.getLiteral().getLiteralValue();
  }
  return result;
}
```

**Pattern applies to:**
- `file(\`./.planning/phases/${phaseIdRef}.md\`)` → path becomes `./.planning/phases/$PHASE_ID.md`
- `bash(\`git log ${commitRef}\`)` → command becomes `git log $COMMIT`

**Note:** This pattern is already implemented and working. Source helpers leverage existing infrastructure.

### Pattern 3: Discriminated Unions in IR

**Current AssignNode structure:**

```typescript
export interface AssignNode {
  kind: 'assign';
  variableName: string;
  assignment: {
    type: 'bash' | 'value' | 'env';
    content: string;
  };
  comment?: string;
  blankBefore?: boolean;  // For <br/> in AssignGroup
}
```

**Extension for new sources:**

```typescript
export interface AssignNode {
  kind: 'assign';
  variableName: string;
  assignment:
    | { type: 'bash'; content: string; }
    | { type: 'value'; content: string; raw?: boolean; }
    | { type: 'file'; path: string; optional?: boolean; }
    | { type: 'runtimeFn'; fnName: string; args: Record<string, unknown>; }
    | { type: 'env'; content: string; };  // Keep for backward compat if needed
  comment?: string;
  blankBefore?: boolean;
}
```

**Emitter discriminates by type:**

```typescript
switch (assignment.type) {
  case 'bash': return `${varName}=$(${assignment.content})`;
  case 'file':
    const cmd = assignment.optional
      ? `cat ${path} 2>/dev/null`
      : `cat ${path}`;
    return `${varName}=$(${cmd})`;
  case 'value':
    return assignment.raw
      ? `${varName}=${assignment.content}`
      : `${varName}="${assignment.content}"`;
  case 'runtimeFn':
    return `${varName}=$(node runtime.js ${assignment.fnName} '${JSON.stringify(assignment.args)}')`;
}
```

This pattern is already used throughout the IR system (proven approach).

### Pattern 4: file() as bash() Wrapper (Decision from CONTEXT.md)

**What:** `file()` internally becomes a bash command, sharing emit logic

**Implementation:**

```typescript
export function file(path: string, options?: { optional?: boolean }): BashSource {
  // Convert to bash source with cat command
  const catCmd = options?.optional
    ? `cat ${path} 2>/dev/null`
    : `cat ${path}`;

  return {
    __sourceType: 'bash',
    command: catCmd,
    // Mark with metadata for better errors/debugging (optional)
    _originalSource: 'file',
    _filePath: path,
    _fileOptional: options?.optional
  };
}
```

**Alternative (if distinct IR node preferred):**

Keep `file` as separate source type in IR for clearer semantics, but emit identically to bash. This is Claude's discretion per CONTEXT.md.

**Recommendation:** Distinct IR type (`{ type: 'file', path, optional }`) for clarity in debugging and error messages, even if emit logic converges.

### Recommended Project Structure (No changes needed)

Current structure already supports this:

```
src/
├── primitives/
│   ├── variables.ts       # useVariable, Assign, AssignGroup
│   └── sources.ts         # NEW: file(), bash(), value() helpers
├── ir/
│   └── nodes.ts           # Extend AssignNode union
├── parser/transformers/
│   └── variables.ts       # Refactor transformAssign
└── emitter/
    └── emitter.ts         # Update emitAssignmentLine
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type guards for source objects | Custom type checking logic | TypeScript discriminated unions with `__sourceType` literal | Compiler enforces exhaustiveness, zero runtime cost |
| Template string parsing | Custom regex parsing | Existing `extractTemplateContent()` from shared.ts | Already handles RuntimeVar refs and identifiers correctly |
| Path quoting logic | New path escaping | Existing `smartQuotePath()` from emitter.ts | Handles globs, spaces, and variable refs correctly |
| Bash syntax generation | String concatenation | Existing `emitAssignmentLine()` pattern | Proven emit logic with proper quoting |

**Key insight:** This phase is API surface refactoring, not new functionality. Nearly all implementation pieces exist. Don't rewrite what works — compose existing utilities.

## Common Pitfalls

### Pitfall 1: Mixing Build-Time and Runtime Resolution in value()

**What goes wrong:** Attempting to pass runtime variable references to `value()`

```typescript
// WRONG - value() is build-time only
const phase = useRuntimeVar('PHASE');
<Assign var={x} from={value(phase.id)} />  // Compile error
```

**Why it happens:** Confusion about which sources support runtime refs

**How to avoid:**
- Document clearly: `value()` = build-time, `file()`/`bash()` = runtime-aware
- Add TypeScript check in `value()` helper: reject RuntimeVar proxies

**Prevention in transformer:**

```typescript
// In value() helper
export function value(val: string, options?: { raw?: boolean }): ValueSource {
  if (typeof val !== 'string') {
    throw new Error('value() requires a string literal at compile time. Use bash() or file() for runtime values.');
  }
  return { __sourceType: 'value', value: val, raw: options?.raw };
}
```

### Pitfall 2: Breaking V1 Transformer Compatibility

**What goes wrong:** Only updating V3 transformer (runtime-dispatch.ts), forgetting V1 transformer

**Why it happens:** Phase 37 established dual transformer pattern (V1 for Commands, V3 for runtime)

**Warning signs:**
- Tests pass for runtime agents but fail for commands
- `npm run build` succeeds but command markdown is malformed

**How to avoid:**
- Update BOTH transformers: `src/parser/transformers/variables.ts` (V1) AND `src/parser/transformers/runtime-dispatch.ts` (V3)
- Check emitter switch: V1 emitter (emitter.ts) handles Assign, V3 throws error (runtime-markdown-emitter.ts)
- Integration tests must cover both Command and Agent documents

### Pitfall 3: Incomplete Migration from Old Syntax

**What goes wrong:** Removing old props without migrating all tests and docs

**Affected files:**
- Tests: `tests/grammar/VariableComponents/assign*.test.ts`
- Docs: Any examples showing `<Assign var={x} bash="..." />`
- App code: `src/app/commands/*.tsx` may use old syntax

**How to avoid:**
1. Grep for old patterns: `bash=`, `value=`, `env=` in Assign
2. Grep for `<ReadFile` usage
3. Update sequentially: tests → app code → docs
4. Consider keeping old props with deprecation warning temporarily, then remove in follow-up

**Migration checklist:**
```bash
# Find old Assign syntax
rg '<Assign[^>]*\b(bash|value|env)=' --type tsx

# Find ReadFile usage
rg '<ReadFile' --type tsx

# Find documentation examples
rg 'bash=|value=|ReadFile' docs/
```

### Pitfall 4: runtimeFn Integration Edge Cases

**What goes wrong:** Assuming runtimeFn fits the same pattern as other sources

**Why it's different:**
- runtimeFn returns a component with `.Call`, not a source object
- Current usage: `<Init.Call args={{}} output={ctx} />`
- New usage: `<Assign var={x} from={Init} args={{}} />`

**Challenges:**
- Type checking: `from` prop must accept both source objects AND RuntimeFnComponent
- Transformer: Detect RuntimeFnComponent vs source object
- Emit: RuntimeFn has different bash pattern (node runtime.js call)

**How to handle:**

```typescript
// In AssignProps
export interface AssignProps {
  var: VariableRef;
  from: FileSource | BashSource | ValueSource | RuntimeFnComponent<any, any>;
  args?: Record<string, unknown>;  // Only for RuntimeFn
  comment?: string;
}

// In transformer
if (isRuntimeFn(fromExpr)) {
  // Extract function name and args
  return {
    kind: 'assign',
    variableName: variable.envName,
    assignment: { type: 'runtimeFn', fnName: fromExpr.fnName, args: extractArgs() }
  };
}
```

**Warning:** This is the trickiest part of the phase. runtimeFn has a different shape (component with `.Call` vs plain object). Existing `.Call` component may need to remain for backward compatibility while also supporting `<Assign from={Fn}>` syntax.

### Pitfall 5: Quoted vs Unquoted value() Emit

**What goes wrong:** Default quoted emit breaks cases expecting raw values

**Examples:**
```typescript
// Needs quoting (spaces)
<Assign var={x} from={value('hello world')} />
// Emits: X="hello world" ✓

// Doesn't need quoting (path)
<Assign var={x} from={value('/tmp/file')} />
// Emits: X="/tmp/file" (works but unnecessary quotes)

// BREAKS if quoted (used in arithmetic)
<Assign var={x} from={value('42')} />
// Emits: X="42" (string, not number in bash)
```

**How to avoid:**
- Default to quoting (safer)
- Provide `{ raw: true }` option for unquoted emit
- Document when to use raw (numbers, paths without spaces, bash variables)

```typescript
<Assign var={count} from={value('0', { raw: true })} />
// Emits: COUNT=0 (unquoted)
```

## Code Examples

### Basic Source Usage

```typescript
import { useVariable, Assign, file, bash, value } from 'react-agentic';

const state = useVariable('STATE');
const phase = useVariable('PHASE');
const name = useVariable('NAME');

<Assign var={state} from={file('.planning/STATE.md')} />
// Emits: STATE=$(cat .planning/STATE.md)

<Assign var={phase} from={bash('echo 1')} />
// Emits: PHASE=$(echo 1)

<Assign var={name} from={value('my-project')} />
// Emits: NAME="my-project"
```

### Optional Files

```typescript
const research = useVariable('RESEARCH');

<Assign var={research} from={file('.planning/RESEARCH.md', { optional: true })} />
// Emits: RESEARCH=$(cat .planning/RESEARCH.md 2>/dev/null)
```

### Runtime Variable Interpolation

```typescript
const phaseId = useVariable('PHASE_ID');
const phaseDir = useVariable('PHASE_DIR');
const planContent = useVariable('PLAN_CONTENT');

<Assign var={phaseId} from={bash('echo 38')} />
<Assign
  var={phaseDir}
  from={bash(`ls -d .planning/phases/${phaseId}* | head -1`)}
/>
<Assign
  var={planContent}
  from={file(`${phaseDir}/38-PLAN.md`, { optional: true })}
/>

// Emits:
// PHASE_ID=$(echo 38)
// PHASE_DIR=$(ls -d .planning/phases/$PHASE_ID* | head -1)
// PLAN_CONTENT=$(cat "$PHASE_DIR"/38-PLAN.md 2>/dev/null)
```

Note: Path quoting handled by existing `smartQuotePath()` in emitter.

### RuntimeFn Integration

```typescript
import { runtimeFn, useVariable, Assign } from 'react-agentic';

async function readConfig(): Promise<Config> {
  const fs = await import('fs/promises');
  const content = await fs.readFile('.planning/config.json', 'utf-8');
  return JSON.parse(content);
}

const ReadConfig = runtimeFn(readConfig);
const config = useVariable('CONFIG');

<Assign var={config} from={ReadConfig} />
// Emits: CONFIG=$(node runtime.js readConfig '{}')
```

### Grouped Assignments

```typescript
<AssignGroup>
  <Assign var={state} from={file('.planning/STATE.md')} comment="Load state" />
  <Assign var={roadmap} from={file('.planning/ROADMAP.md')} comment="Load roadmap" />
  <br />
  <Assign var={phase} from={bash('echo 38')} />
</AssignGroup>

// Emits:
// ```bash
// # Load state
// STATE=$(cat .planning/STATE.md)
//
// # Load roadmap
// ROADMAP=$(cat .planning/ROADMAP.md)
//
// PHASE=$(echo 38)
// ```
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple mutually-exclusive props (`bash=`, `value=`, `env=`) | Single `from` prop with source helpers | Phase 38 (this phase) | Cleaner API, composable sources |
| Separate `<ReadFile as="VAR" path="..." />` component | `<Assign var={ref} from={file(...)} />` | Phase 38 | Unified pattern, type-safe variable refs |
| No standard for runtime function data assignment | `<Assign var={x} from={RuntimeFn} />` | Phase 38 | Consistent with other sources |

**Deprecated/outdated:**
- `<Assign bash="..." />` syntax → use `from={bash(...)}`
- `<Assign value="..." />` syntax → use `from={value(...)}`
- `<Assign env="..." />` syntax → use `from={bash('echo $ENV')}` or keep `env=` if useful
- `<ReadFile as="VAR" path="..." />` → use `<Assign var={useVariable('VAR')} from={file(...)} />`

**Not deprecated (continues to work):**
- `useVariable()` — unchanged
- `<AssignGroup>` — unchanged
- `runtimeFn()` — unchanged, extended to work with `<Assign from={...}>`

## Open Questions

### 1. Should `env=` prop be kept alongside `from=`?

**What we know:**
- CONTEXT.md removal strategy says "remove old props entirely"
- `env=` is sugar for `bash('echo $VAR')`
- Current tests use `env=` in `tests/grammar/VariableComponents/assign-group.test.ts`

**What's unclear:**
- Does the ergonomic benefit justify keeping `env=` as special case?
- Alternative: `from={env('VAR_NAME')}` helper function

**Recommendation:**
- Add `env()` helper for consistency: `from={env('HOME')}`
- Remove `env=` prop per CONTEXT decision
- Update the one test that uses it

### 2. Should runtimeFn.Call component remain, or only support Assign pattern?

**What we know:**
- Current `.Call` usage: `<Init.Call args={{}} output={ctx} />`
- New `Assign` pattern: `<Assign var={x} from={Init} args={{}} />`
- `.Call` is more explicit about what's happening (runtime execution)
- `Assign` is more consistent with other data sources

**What's unclear:**
- Is `.Call` syntactic sugar worth maintaining?
- Does removing it break existing commands?

**Recommendation:**
- Support BOTH patterns initially (Phase 38)
- `.Call` component continues to work (no breaking change)
- Document `<Assign from={...}>` as preferred pattern
- Deprecate `.Call` in future phase if adoption is good

### 3. Source helper placement — primitives/ or separate sources/ module?

**What we know:**
- Current structure: primitives/ contains low-level components
- file(), bash(), value() are helper functions, not components
- components/runtime-fn.ts already exists for runtimeFn

**What's unclear:**
- Should helpers live with components (primitives/variables.ts) or separate (primitives/sources.ts)?

**Recommendation:**
- Create `src/primitives/sources.ts` for file(), bash(), value(), env()
- Export from src/jsx.ts and src/index.ts
- Keeps variables.ts focused on component definitions

## Sources

### Primary (HIGH confidence)

- Existing codebase implementation (src/primitives/variables.ts, src/parser/transformers/variables.ts, src/emitter/emitter.ts)
- Phase 38 CONTEXT.md (locked decisions from /gsd:discuss-phase)
- Phase 36/37 implementation (ReadFile component, runtimeFn patterns)
- claudedocs/proposals/data-abstraction.md (original proposal)

### Secondary (MEDIUM confidence)

- Existing test patterns (tests/grammar/VariableComponents/assign-group.test.ts)
- Documentation patterns (docs/runtime.md, docs/command.md)

### Tertiary (LOW confidence)

- None — all research based on existing codebase and explicit decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all components exist and are working
- Architecture: HIGH — patterns proven in current codebase (discriminated unions, source helpers, template interpolation)
- Pitfalls: HIGH — based on analysis of existing transformer patterns and dual-mode (V1/V3) architecture
- runtimeFn integration: MEDIUM — requires careful handling of component vs object distinction

**Research date:** 2026-02-01
**Valid until:** 30 days (stable domain, no fast-moving dependencies)

**Scope coverage:**
- ✓ Source helper API design
- ✓ IR node extensions
- ✓ Transformer refactoring approach
- ✓ Emitter emit patterns
- ✓ Migration strategy from old syntax
- ✓ Integration with existing runtimeFn
- ✓ Type safety patterns
- ✓ Template string interpolation
- ✓ V1/V3 transformer dual support
- ✓ Test migration requirements

**Key insight:** This is a refactor, not new functionality. Success depends on systematic migration and thorough testing across both transformer modes. The heavy lifting (template interpolation, bash emit, type tracking) already exists.
