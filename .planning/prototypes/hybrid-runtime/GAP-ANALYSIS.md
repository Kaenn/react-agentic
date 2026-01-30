# Gap Analysis: Current Implementation vs V3 Target

## Executive Summary

This document analyzes the differences between the **current react-agentic implementation** and the **V3 hybrid runtime target**. The goal is to identify what must be **REMOVED** (legacy), what must be **MODIFIED**, and what must be **ADDED** to achieve V3.

V3 introduces a fundamental shift: **TypeScript runtime functions** for deterministic logic + **Markdown** for AI reasoning, connected via typed `runtimeFn()` components.

---

## Architecture Comparison

```
CURRENT:
┌─────────────────────────────────────────────────────┐
│                     command.tsx                      │
│  ┌────────────────────────────────────────────────┐ │
│  │  <Markdown>, <If test="...">, <Assign bash=...> │ │
│  │  (Everything compiles to markdown for Claude)   │ │
│  └────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
                         ↓ compile
┌───────────────────────────────────────────────────────┐
│                      COMMAND.md                       │
│              (Claude executes everything)             │
└───────────────────────────────────────────────────────┘

V3 TARGET:
┌─────────────────────────────────────────────────────────┐
│                      command.tsx                         │
│  ┌──────────────────┐     ┌───────────────────────────┐ │
│  │ TypeScript       │ ←→  │ Markdown/Claude           │ │
│  │ (runtimeFn)      │     │ (SpawnAgent, AskUser)     │ │
│  └──────────────────┘     └───────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↓ compile (dual output)
┌──────────────────────┐   ┌────────────────────────────────┐
│     runtime.js       │   │           COMMAND.md           │
│    (Node.js exec)    │←→│  (jq property access, Task())  │
└──────────────────────┘   └────────────────────────────────┘
```

---

## Components to REMOVE

These components/patterns are **legacy** and should be **deleted entirely**:

### 1. `<Markdown>` Component

**Current** (`src/primitives/markdown.ts`):
```tsx
<Markdown>
  ## Step 1
  This is markdown content.
</Markdown>
```

**V3**: Raw text inside `<Command>` IS markdown. No wrapper needed.
```tsx
<Command>
  {() => (
    <>
      ## Step 1
      This is markdown content.
    </>
  )}
</Command>
```

**Files to modify:**
- `src/primitives/markdown.ts` - Remove `Markdown` export (keep `XmlBlock`)
- `src/jsx.ts` - Remove `Markdown` export
- `src/index.ts` - Remove `Markdown` export
- `src/parser/transformers/markdown.ts` - Remove markdown transformer
- `src/ir/nodes.ts` - Keep `RawMarkdownNode` for internal use

---

### 2. `useVariable()` / `<Assign>` System

**Current** (`src/primitives/variables.ts`):
```tsx
const phaseDir = useVariable("PHASE_DIR");
<Assign var={phaseDir} bash={`ls -d .planning/phases/*`} />
<If test={`[ -z ${phaseDir.ref} ]`}>
```

**V3**: Replaced by `useScriptVar<T>()` and `runtimeFn()`.
```tsx
const ctx = useScriptVar<PlanPhaseContext>('ctx');
<Init.Call args={{ arguments: "$ARGUMENTS" }} output={ctx} />
<If condition={ctx.error}>
```

**Files to REMOVE entirely:**
- `src/primitives/variables.ts`

**Files to modify:**
- `src/jsx.ts` - Remove `useVariable`, `Assign`, `AssignGroup` exports
- `src/index.ts` - Remove variable exports
- `src/ir/nodes.ts` - Remove `AssignNode`, `AssignGroupNode`
- `src/parser/transformers/variables.ts` - Remove or repurpose
- `src/emitter/emitter.ts` - Remove assign emission logic

---

### 3. Current `<If test="...">` Pattern

**Current** (`src/primitives/control.ts`):
```tsx
<If test="[ -f config.json ]">
<If test={fileExists(configFile)}>
```

**V3**: Condition uses `ScriptVar` property access.
```tsx
<If condition={ctx.error}>
<If condition={!ctx.flags.skipResearch && ctx.config.workflowResearch}>
```

**Files to modify:**
- `src/primitives/control.ts` - Change `IfProps.test` to `IfProps.condition`

---

### 4. Test Builder Functions

**Current** (`src/primitives/control.ts`):
```tsx
fileExists(varRef)   // → "[ -f $VAR ]"
dirExists(varRef)    // → "[ -d $VAR ]"
isEmpty(varRef)      // → "[ -z $VAR ]"
notEmpty(varRef)     // → "[ -n $VAR ]"
equals(varRef, val)  // → "[ $VAR = val ]"
and(...tests)        // → "test1 && test2"
or(...tests)         // → "test1 || test2"
```

**V3**: Not needed. Conditions are TypeScript expressions on `ScriptVar`.
```tsx
// V3 uses TypeScript operators directly
<If condition={ctx.error}>                        // truthy check
<If condition={!ctx.flags.skipResearch}>          // negation
<If condition={ctx.hasPlans && !ctx.error}>       // AND
<If condition={ctx.flags.research || ctx.error}>  // OR
<If condition={checkerResult.status === 'BLOCKED'}> // equality
```

**Files to modify:**
- `src/primitives/control.ts` - Remove all test builder exports

---

### 5. Current `<Loop items={[]} as="x">` Pattern

**Current** (`src/primitives/control.ts`):
```tsx
<Loop items={users} as="user">
  Process {user}
</Loop>
```

**V3**: Loop with max iterations and counter.
```tsx
<Loop max={3} counter={iteration}>
  Iteration {iteration}/3
  <If condition={checkerPassed}>
    <Break />
  </If>
</Loop>
```

**Files to modify:**
- `src/primitives/control.ts` - Replace `LoopProps`
- `src/ir/nodes.ts` - Replace `LoopNode`

---

## Components to ADD

### 1. `useScriptVar<T>()` Hook

**New file:** `src/primitives/script-var.ts`

```typescript
declare const __scriptVarBrand: unique symbol;

export interface ScriptVar<T> {
  readonly [__scriptVarBrand]: T;
  readonly __varName: string;
  readonly __path: readonly string[];
}

export type ScriptVarProxy<T> = ScriptVar<T> & {
  readonly [K in keyof T]: T[K] extends object
    ? ScriptVarProxy<T[K]>
    : ScriptVar<T[K]>;
};

export function useScriptVar<T>(name: string): ScriptVarProxy<T>;
```

**IR Changes:** Add `ScriptVarNode` or similar to track variable declarations.

---

### 2. `runtimeFn()` Function

**New file:** `src/primitives/runtime-fn.ts`

```typescript
export type RuntimeFunction<TArgs, TReturn> = (args: TArgs) => Promise<TReturn>;

export interface RuntimeFnComponent<TArgs, TReturn> {
  Call: (props: InferCallProps<TArgs, TReturn>) => JSXElement;
  readonly fnName: string;
}

export function runtimeFn<TArgs, TReturn>(
  fn: RuntimeFunction<TArgs, TReturn>
): RuntimeFnComponent<TArgs, TReturn>;
```

**Compilation output:**
- `Call` component emits bash: `VAR=$(node runtime.js fnName '{"arg":"val"}')`
- Runtime functions are extracted to separate `runtime.js` file

---

### 3. `<If condition={}>` with ScriptVar

**Modify:** `src/primitives/control.ts`

```typescript
export interface IfProps {
  /** ScriptVar condition - compiles to jq expression */
  condition: ScriptVar<boolean> | ScriptVarProxy<any>;
  children?: ReactNode;
}
```

**Compilation:**
```tsx
<If condition={ctx.hasPlans}>
// Compiles to:
<If test="$(echo "$CTX" | jq -r '.hasPlans') = true">
```

---

### 4. `<Loop max={} counter={}>` Component

**Modify:** `src/primitives/control.ts`

```typescript
export interface LoopProps {
  /** Maximum iterations */
  max: number;
  /** Counter variable */
  counter?: ScriptVar<number>;
  children?: ReactNode;
}
```

---

### 5. `<Break />` Component

**Add to:** `src/primitives/control.ts`

```typescript
export function Break(): null {
  return null;
}
```

**IR:** Add `BreakNode`
**Emitter:** Emits as `**Break loop**` or similar directive.

---

### 6. `<Return />` Component

**Add to:** `src/primitives/control.ts`

```typescript
export function Return(): null {
  return null;
}
```

**IR:** Add `ReturnNode`
**Emitter:** Emits as `**End command**` or similar directive.

---

### 7. `<AskUser>` Component

**New file:** `src/workflow/AskUser.ts`

```typescript
export interface AskUserOption {
  value: string;
  label: string;
}

export interface AskUserProps {
  question: string;
  options: AskUserOption[];
  output: ScriptVar<string>;
}

export function AskUser(_props: AskUserProps): null {
  return null;
}
```

**IR:** Add `AskUserNode`
**Emitter:** Emits `AskUserQuestion()` tool call syntax.

---

### 8. Modified `<SpawnAgent>` with Output

**Modify:** `src/workflow/agents/Agent.ts`

```typescript
export interface SpawnAgentProps<TInput = unknown, TOutput = unknown> {
  type: string;              // Agent type name
  model: string | ScriptVar<string>;
  description: string;
  input: TInput | ScriptVar<TInput>;
  output?: ScriptVar<TOutput>;  // NEW: capture agent result
  children?: ReactNode;
}
```

---

## IR Node Changes Summary

### REMOVE
| Node | Reason |
|------|--------|
| `AssignNode` | Replaced by `ScriptCallNode` |
| `AssignGroupNode` | No longer needed |

### MODIFY
| Node | Change |
|------|--------|
| `IfNode` | `test: string` → `condition: ScriptVarCondition` |
| `LoopNode` | `items/as` → `max/counter` |
| `SpawnAgentNode` | Add `output?: string` for result capture |

### ADD
| Node | Purpose |
|------|---------|
| `ScriptVarDeclNode` | `useScriptVar()` declaration |
| `ScriptCallNode` | `<X.Call>` invocation |
| `BreakNode` | Loop break directive |
| `ReturnNode` | Early command exit |
| `AskUserNode` | User interaction |
| `RuntimeFunctionNode` | Function extraction marker |

---

## Emitter Changes Summary

### New Emission Patterns

| Component | Current Output | V3 Output |
|-----------|----------------|-----------|
| `useScriptVar` | N/A | (declaration tracked, no output) |
| `<X.Call>` | N/A | `VAR=$(node runtime.js fn '{"args":"val"}')` |
| `<If condition={ctx.x}>` | `**If [ -f $VAR ]:**` | `**If $(echo "$CTX" \| jq -r '.x') = true:**` |
| `<Loop max={3}>` | `**For each item in items:**` | `**Loop up to 3 times:**` |
| `<Break />` | N/A | `**Break loop**` |
| `<Return />` | N/A | `**End command**` |
| `<AskUser>` | N/A | `AskUserQuestion(...)` |
| `{ctx.property}` | `$VAR` | `$(echo "$CTX" \| jq -r '.property')` |

### Dual Output Mode

V3 requires emitting **two files**:
1. `COMMAND.md` - Markdown for Claude
2. `runtime.js` - Extracted TypeScript functions compiled to JS

**Build pipeline change:**
```
command.tsx → parser → IR → emitter → COMMAND.md
                                   ↘ runtime.js
```

---

## Parser Changes Summary

### New Transformers Needed

| Transformer | Purpose |
|-------------|---------|
| `script-var.ts` | Handle `useScriptVar<T>()` calls |
| `runtime-fn.ts` | Handle `runtimeFn()` and `<X.Call>` |
| `ask-user.ts` | Handle `<AskUser>` component |

### Modified Transformers

| Transformer | Change |
|-------------|--------|
| `control.ts` | `test` → `condition`, add `Break`, `Return` |
| `spawner.ts` | Add `output` prop handling |

### Removed Transformers

| Transformer | Reason |
|-------------|--------|
| `variables.ts` | System replaced by `script-var.ts` |

---

## Type System Changes

### Branded Types for Safety

V3 uses **branded types** (nominal typing) to prevent type mismatches:

```typescript
// Current: Structural typing allows wrong assignments
type A = { name: string };
type B = { name: string };
// A and B are interchangeable!

// V3: Branded types prevent misuse
declare const __brand: unique symbol;
interface ScriptVar<T> {
  readonly [__brand]: T;  // T becomes the "brand"
}
// ScriptVar<string> !== ScriptVar<number> at type level
```

### Key Type Definitions

```typescript
// ScriptVar - compile-time variable reference
interface ScriptVar<T> {
  readonly [__scriptVarBrand]: T;
  readonly __varName: string;
  readonly __path: readonly string[];
}

// ScriptVarProxy - enables property access
type ScriptVarProxy<T> = ScriptVar<T> & {
  readonly [K in keyof T]: T[K] extends object
    ? ScriptVarProxy<T[K]>
    : ScriptVar<T[K]>;
};

// RuntimeFnComponent - typed call component
interface RuntimeFnComponent<TArgs, TReturn> {
  Call: (props: InferCallProps<TArgs, TReturn>) => JSXElement;
  readonly fnName: string;
}
```

---

## File Structure Changes

### Files to DELETE
```
src/primitives/variables.ts          # Entire file - replaced by script-var.ts
```

### Files to CREATE
```
src/primitives/script-var.ts         # useScriptVar, ScriptVar types
src/primitives/runtime-fn.ts         # runtimeFn(), RuntimeFnComponent
src/workflow/AskUser.ts              # AskUser component
src/parser/transformers/script-var.ts
src/parser/transformers/runtime-fn.ts
src/parser/transformers/ask-user.ts
src/emitter/runtime-emitter.ts       # Extracts runtime.js
```

### Files to MODIFY Significantly
```
src/primitives/control.ts            # If condition, Loop max/counter, Break, Return
src/primitives/markdown.ts           # Remove Markdown, keep XmlBlock
src/workflow/agents/Agent.ts         # SpawnAgent output prop
src/ir/nodes.ts                      # Many node changes (see above)
src/parser/transformer.ts            # New dispatch logic
src/emitter/emitter.ts               # New emission patterns, jq expressions
src/jsx.ts                           # Update exports
src/index.ts                         # Update exports
```

---

## Migration Checklist

### Phase 1: Remove Legacy
- [ ] Remove `Markdown` component
- [ ] Remove `useVariable`, `Assign`, `AssignGroup`
- [ ] Remove test builder functions (`fileExists`, `dirExists`, etc.)
- [ ] Remove `AssignNode`, `AssignGroupNode` from IR

### Phase 2: Add Core Types
- [ ] Add `ScriptVar<T>` branded type
- [ ] Add `ScriptVarProxy<T>` proxy type
- [ ] Add `useScriptVar<T>()` hook
- [ ] Add `runtimeFn()` function

### Phase 3: Add Components
- [ ] Add `<Break />` component
- [ ] Add `<Return />` component
- [ ] Add `<AskUser>` component
- [ ] Modify `<If>` to use `condition` prop
- [ ] Modify `<Loop>` to use `max`/`counter` props
- [ ] Modify `<SpawnAgent>` to support `output` prop

### Phase 4: Update IR
- [ ] Add `ScriptVarDeclNode`
- [ ] Add `ScriptCallNode`
- [ ] Add `BreakNode`
- [ ] Add `ReturnNode`
- [ ] Add `AskUserNode`
- [ ] Modify `IfNode` for conditions
- [ ] Modify `LoopNode` for max/counter
- [ ] Modify `SpawnAgentNode` for output

### Phase 5: Update Parser
- [ ] Add script-var transformer
- [ ] Add runtime-fn transformer
- [ ] Add ask-user transformer
- [ ] Modify control transformer
- [ ] Modify spawner transformer
- [ ] Remove variables transformer

### Phase 6: Update Emitter
- [ ] Add jq expression generation
- [ ] Add script call emission
- [ ] Add break/return emission
- [ ] Add ask-user emission
- [ ] Add runtime.js extraction
- [ ] Add dual output mode

### Phase 7: Update Exports
- [ ] Update `src/jsx.ts`
- [ ] Update `src/index.ts`
- [ ] Update documentation

---

## Risks and Considerations

### Breaking Changes
- **All existing commands using `useVariable`/`Assign` will break**
- **All `<If test="...">` usage will break**
- **All `<Markdown>` usage will break**

### Mitigation
- Consider a migration codemod
- Document clear upgrade path
- Version bump to 2.0.0

### Dependencies
- **jq required** on target systems (standard on macOS/Linux)
- Windows support may need fallback (node-based JSON access)

### Complexity
- Dual output (COMMAND.md + runtime.js) adds build complexity
- Runtime extraction needs careful TypeScript-to-JS compilation
- ScriptVar proxy implementation needs thorough testing

---

## Conclusion

The V3 architecture represents a significant evolution from "everything in markdown" to "hybrid TypeScript + markdown". Key benefits:

1. **Type Safety**: Full TypeScript validation at compile time
2. **Testability**: Runtime functions can be unit tested
3. **Efficiency**: Deterministic work doesn't consume AI context
4. **Clarity**: Clear separation of TS (deterministic) vs Claude (AI reasoning)

The migration requires substantial changes across the entire codebase, but the resulting DX and type safety improvements justify the investment.
