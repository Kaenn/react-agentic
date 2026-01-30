# Hybrid Runtime Architecture Analysis

## Overview

This document analyzes a new TSX compilation approach that enables seamless switching between TypeScript (deterministic) and Claude Code (AI reasoning) within a single command definition.

## Problem Statement

Current GSD commands like `plan-phase.md` mix:
- **Deterministic logic**: file checks, argument parsing, config reading, template generation
- **AI reasoning**: agent spawning, output interpretation, user interaction

All of this is written in markdown with embedded bash, forcing Claude to execute simple logic that could be pre-computed.

**Goals:**
1. Move deterministic work to TypeScript (testable, typed, efficient)
2. Keep AI reasoning in markdown (Claude's strength)
3. Enable clean data flow between TS and markdown
4. Maintain readable TSX source

## Proposed Architecture

### File Structure

```
.claude/
├── commands/
│   └── plan-phase/
│       ├── command.tsx        # TSX source
│       └── COMMAND.md         # Generated markdown (for Claude)
├── runtime/
│   └── plan-phase.js          # Compiled TS runtime
└── skills/
    └── js-proxy/
        └── SKILL.md           # Generic JS executor skill
```

### Compilation Flow

```
command.tsx ──┬──> COMMAND.md   (markdown for Claude)
              │
              └──> runtime.js   (extracted <Script> blocks)
```

### Runtime Flow

```
1. User runs /gsd:plan-phase 8
2. Claude reads COMMAND.md
3. Encounters <Script fn="init">
4. Executes: node runtime.js init '{"arguments":"8"}'
5. Captures JSON output to shell variable
6. Continues markdown with interpolated values
7. Spawns agents when needed (AI work)
8. Calls more <Script> functions as needed
```

## Core Components

### 1. `useScriptVar<T>(name)` Hook

Declares a typed variable that will hold script output at runtime.

```tsx
const ctx = useScriptVar<PlanPhaseContext>('ctx');
```

**Compile-time behavior:**
- Returns a Proxy that tracks property access
- TypeScript validates all property accesses against `T`
- Records access paths for emit phase

**Emit-time behavior:**
- Generates shell variable name (uppercase): `CTX`
- Property access compiles to jq expression

### 2. `<Script>` Component

Executes TypeScript at runtime via the JS proxy skill.

```tsx
<Script
  fn="init"
  args={{ arguments: "$ARGUMENTS" }}
  output={ctx}
/>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `fn` | string | Function name to call in runtime.js |
| `args` | object | Arguments passed as JSON |
| `output` | ScriptVar | Variable to store result |
| `runtime` | string? | Override runtime file (default: command name) |

**Compiles to:**
```bash
CTX=$(node .claude/runtime/plan-phase.js init '{"arguments":"'"$ARGUMENTS"'"}')
```

### 3. Property Access Compilation

| TSX Expression | Compiled Output |
|----------------|-----------------|
| `{ctx.phaseId}` | `$(echo "$CTX" \| jq -r '.phaseId')` |
| `{ctx.flags.gaps}` | `$(echo "$CTX" \| jq -r '.flags.gaps')` |
| `{ctx.error}` | `$(echo "$CTX" \| jq -r '.error')` |

### 4. Conditional Compilation

```tsx
<If condition={ctx.hasPlans}>
```

**Compiles to:**
```markdown
<If test="$(echo "$CTX" | jq -r '.hasPlans') = true">
```

**Boolean conditions:**
```tsx
<If condition={!ctx.flags.skipResearch && !ctx.hasResearch}>
```

**Compiles to:**
```markdown
<If test="$(echo "$CTX" | jq -r '.flags.skipResearch') = false -a $(echo "$CTX" | jq -r '.hasResearch') = false">
```

### 5. Control Flow Components

#### `<Loop>`
```tsx
<Loop max={3} var={iteration}>
  {/* body */}
  <If condition={checkerPassed}>
    <Break />
  </If>
</Loop>
```

#### `<Break>` / `<Continue>`
Exit or skip within loops.

#### `<Return>`
Early exit from command.

## Type Definitions

### ScriptVar Proxy

```typescript
type PropertyPath = string[];

interface ScriptVarProxy<T> {
  __varName: string;
  __path: PropertyPath;
  __type: T; // Phantom type
}

function useScriptVar<T>(name: string): DeepProxy<T, ScriptVarProxy<T>>;
```

### Script Component Props

```typescript
interface ScriptProps<T> {
  fn: string;
  args?: Record<string, any>;
  output?: ScriptVarProxy<T>;
  runtime?: string;
}
```

## Analysis: What Moves to TS vs Stays in Markdown

### Moves to TypeScript (Deterministic)

| Operation | Reason |
|-----------|--------|
| Environment validation | File existence checks |
| Argument parsing | String manipulation |
| Phase normalization | Regex, formatting |
| Config reading | JSON parsing |
| File existence checks | fs.existsSync |
| Context aggregation | Reading multiple files |
| Template generation | String building |
| Summary formatting | Structured output |

### Stays in Markdown (AI Reasoning)

| Operation | Reason |
|-----------|--------|
| Agent spawning | Task() orchestration |
| Output interpretation | Understanding agent returns |
| User interaction | AskUser, decisions |
| Error recovery | Contextual decisions |
| Revision logic | Understanding issues |

## Trade-offs

### Advantages

1. **Type Safety**: Full TypeScript validation at compile time
2. **Testability**: Runtime functions can be unit tested
3. **Efficiency**: Deterministic work doesn't consume AI context
4. **Clarity**: TSX clearly shows what's TS vs what's AI
5. **Reusability**: Runtime functions can be shared

### Disadvantages

1. **jq Dependency**: Requires jq for JSON access (standard on macOS/Linux)
2. **Verbose Output**: Generated markdown is more complex
3. **Debug Complexity**: Two systems to debug (TS + Claude)
4. **Learning Curve**: New mental model for command authors

### Mitigations

| Issue | Mitigation |
|-------|------------|
| jq dependency | Fallback flatten mode for simple cases |
| Verbose output | Users don't read generated markdown |
| Debug complexity | Good error messages, logging in runtime |
| Learning curve | Clear examples, gradual adoption |

## Open Questions

1. **Windows Support**: jq not standard on Windows. Options:
   - Bundle jq
   - Use Node for JSON access (slower)
   - Flatten mode only

2. **Async Scripts**: How to handle async operations?
   - Option A: All scripts are async, use await
   - Option B: Separate `<AsyncScript>` component

3. **Error Handling**: What if script throws?
   - Option A: Capture error in output, check in markdown
   - Option B: Special `<ScriptError>` handler component

4. **State Persistence**: Scripts stateless or stateful?
   - Current: Stateless (each call independent)
   - Future: Session context passed between calls

## Next Steps

1. **Prototype** `useScriptVar` and `<Script>` components
2. **Test** with simplified plan-phase example
3. **Validate** jq approach works in practice
4. **Iterate** based on DX feedback

## References

- Current plan-phase.md: `.claude/commands/plan-phase.md`
- JS Proxy skill prototype: `test/.claude/skills/script-runner/`
- TSX compiler: `src/parser/`, `src/emitter/`
