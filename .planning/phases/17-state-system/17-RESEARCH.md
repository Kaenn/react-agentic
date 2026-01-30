# Phase 17: State System - Research

**Researched:** 2026-01-22
**Domain:** TypeScript state management with compile-time validation, persistent JSON storage
**Confidence:** HIGH

## Summary

This research examines how to implement a typed, persistent state system for react-agentic that follows existing codebase patterns. The codebase uses a consistent pattern for new features: (1) define TypeScript interfaces in `jsx.ts`, (2) add IR nodes in `ir/nodes.ts`, (3) transform JSX to IR in `parser/transformer.ts`, (4) emit markdown in `emitter/emitter.ts`, and (5) route output in `cli/commands/build.ts`.

For state management, we need compile-time dot-notation path validation (achievable via TypeScript template literal types), a registry pattern for defining states with schemas and defaults, React-like hooks (`useStateRef`) for component binding, and JSX components (`ReadState`, `WriteState`) that emit bash/JSON operations. The FileAdapter pattern can follow the existing Skill file handling approach.

**Primary recommendation:** Follow the existing `useVariable`/`Assign` pattern exactly, creating `useStateRef`/`ReadState`/`WriteState` components with corresponding IR nodes and emitter logic.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | (existing) | YAML frontmatter parsing | Already in codebase for Command/Agent frontmatter |
| ts-morph | (existing) | TypeScript AST manipulation | Already in codebase for JSX parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node fs/promises | (native) | File system operations | Already used for Skill static file copying |
| path | (native) | Path resolution | Already used throughout build.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom JSON file handling | lowdb/conf | Adds dependency; simple fs.readFile/writeFile suffices for v1 |
| Runtime schema validation | zod/typia | Adds complexity; compile-time TypeScript validation is sufficient per CONTEXT.md |

**Installation:**
```bash
# No new dependencies required - uses existing stack
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── state/                    # New directory for state system
│   ├── registry.ts           # StateRegistry, StateKey enum, state definitions
│   ├── adapters/             # Storage adapters
│   │   └── file-adapter.ts   # FileAdapter for JSON persistence
│   └── index.ts              # Exports
├── jsx.ts                    # Add: useStateRef, ReadState, WriteState, StateRef
├── ir/nodes.ts               # Add: ReadStateNode, WriteStateNode
├── parser/transformer.ts     # Add: transformReadState, transformWriteState
├── emitter/emitter.ts        # Add: emitReadState, emitWriteState
└── cli/
    └── commands/
        ├── build.ts          # (existing)
        └── state.ts          # New: state-read, state-write CLI commands
```

### Pattern 1: Hook + Component Pattern (existing pattern)
**What:** Separate declaration hook from emission component
**When to use:** When runtime values need compile-time binding to shell variables
**Example:**
```typescript
// From jsx.ts - existing useVariable pattern
export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}

// New: useStateRef follows same pattern
export function useStateRef<TSchema>(key: StateKey): StateRef<TSchema> {
  return { key, _schema: undefined as unknown as TSchema };
}
```

### Pattern 2: Transform + Emit Pipeline (existing pattern)
**What:** JSX -> IR Node -> Markdown emission
**When to use:** All JSX components that produce markdown output
**Example:**
```typescript
// transformer.ts - existing Assign transform
private transformAssign(node: JsxElement | JsxSelfClosingElement): AssignNode {
  // Extract props from JSX attributes
  // Build and return IR node
}

// emitter.ts - existing Assign emit
private emitAssign(node: AssignNode): string {
  // Convert IR node to markdown string
  return `\`\`\`bash\n${variableName}=$(${content})\n\`\`\``;
}
```

### Pattern 3: TypeScript Dot-Notation Path Validation
**What:** Compile-time validation of nested object paths like `"user.preferences.theme"`
**When to use:** For typed field access in `<ReadState field="path">` and `<WriteState field="path">`
**Example:**
```typescript
// Type for generating all valid paths
type Paths<T> = T extends object
  ? { [K in keyof T]-?: K extends string | number
      ? `${K}` | Join<K, Paths<T[K]>>
      : never
    }[keyof T]
  : '';

type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

// Usage: field prop is constrained to valid paths
interface StateRef<TSchema> {
  key: StateKey;
}

interface ReadStateProps<TSchema> {
  state: StateRef<TSchema>;
  field?: Paths<TSchema>;  // Compile-time validated paths
}
```

### Pattern 4: CLI Skill Structure (Claude Code skills format)
**What:** Skills provide direct CLI access via `/skill-name` invocation
**When to use:** For operations that need to be invokable outside TSX commands
**Example from existing deploy skill:**
```yaml
---
name: deploy
description: Deploy the application to production. Use when deploying.
disable-model-invocation: true
allowed-tools:
  - Read
  - 'Bash(git:*)'
argument-hint: '[environment]'
---

# Deploy Skill
Instructions for Claude...
```

### Anti-Patterns to Avoid
- **Runtime schema validation:** CONTEXT.md specifies compile-time TypeScript validation only
- **Multiple adapter instances per state:** CONTEXT.md specifies one adapter per state
- **Versioning/migration:** Explicitly deferred to future phase
- **File locking:** Not needed for typical single-agent usage per CONTEXT.md

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter | Custom parser | `gray-matter` | Already used for Command/Agent; handles edge cases |
| JSON serialization | Custom stringify | `JSON.stringify(..., null, 2)` | CONTEXT.md specifies pretty JSON for local files |
| Path validation types | Simple string | Template literal types | TypeScript can validate at compile-time |
| JSX attribute extraction | Manual parsing | Existing `getAttributeValue`, `getTestAttributeValue` | Handles all edge cases already |

**Key insight:** The codebase already has battle-tested patterns for JSX-to-markdown transformation. Following these patterns exactly ensures consistency and reduces bugs.

## Common Pitfalls

### Pitfall 1: Breaking the Hook/Component Separation
**What goes wrong:** Putting assignment logic in the hook instead of the component
**Why it happens:** Wanting hooks to "do more" like React useState
**How to avoid:** Follow useVariable/Assign pattern exactly - hook returns reference, component emits assignment
**Warning signs:** Hook returning values other than a simple reference object

### Pitfall 2: Forgetting IR Node Registration
**What goes wrong:** New components don't emit anything
**Why it happens:** Adding JSX component without corresponding IR node type and emitter case
**How to avoid:** Checklist: jsx.ts props + ir/nodes.ts type + transformer case + emitter case
**Warning signs:** `assertNever` errors at runtime; switch statement warnings

### Pitfall 3: File Path Resolution Issues
**What goes wrong:** State files created in wrong location or not found
**Why it happens:** Relative vs absolute paths, working directory assumptions
**How to avoid:** Use `path.resolve()` consistently; test from different working directories
**Warning signs:** "File not found" errors that work locally but fail in CI

### Pitfall 4: Type Inference Failure for Generics
**What goes wrong:** Compile-time path validation doesn't work; everything accepts `string`
**Why it happens:** Generic type parameter not properly threaded through components
**How to avoid:** Ensure `<ReadState<MySchema> state={ref}>` correctly constrains `field` prop
**Warning signs:** No autocomplete for field prop; invalid paths compile without error

### Pitfall 5: Shallow vs Deep Merge Confusion
**What goes wrong:** Nested state unexpectedly overwritten instead of merged
**Why it happens:** CONTEXT.md specifies "shallow merge" - replacing top-level keys only
**How to avoid:** Document clearly; use `{ ...existingState, ...partial }` not deep merge
**Warning signs:** User loses nested data they expected to be preserved

## Code Examples

Verified patterns from official sources (this codebase):

### JSX Hook Pattern (from jsx.ts)
```typescript
// Source: src/jsx.ts lines 242-244
export function useVariable<T = string>(name: string): VariableRef<T> {
  return { name, ref: name };
}
```

### IR Node Pattern (from ir/nodes.ts)
```typescript
// Source: src/ir/nodes.ts lines 191-202
export interface AssignNode {
  kind: 'assign';
  variableName: string;
  assignment: {
    type: 'bash' | 'value' | 'env';
    content: string;
  };
}
```

### Transformer Pattern (from parser/transformer.ts)
```typescript
// Source: src/parser/transformer.ts - transformAssign method structure
private transformAssign(node: JsxElement | JsxSelfClosingElement): AssignNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract props using existing helpers
  const varAttr = openingElement.getAttribute('var');
  // ... validation and extraction

  return {
    kind: 'assign',
    variableName: variable.envName,
    assignment,
  };
}
```

### Emitter Pattern (from emitter/emitter.ts)
```typescript
// Source: src/emitter/emitter.ts lines 515-538
private emitAssign(node: AssignNode): string {
  const { variableName, assignment } = node;
  let line: string;
  switch (assignment.type) {
    case 'bash':
      line = `${variableName}=$(${assignment.content})`;
      break;
    // ... other cases
  }
  return `\`\`\`bash\n${line}\n\`\`\``;
}
```

### Multi-File Output Pattern (from build.ts - Skill handling)
```typescript
// Source: src/cli/commands/build.ts lines 119-160
function processSkill(doc: SkillDocumentNode, inputFile: string): BuildResult[] {
  const skillName = doc.frontmatter.name;
  const skillDir = `.claude/skills/${skillName}`;
  const results: BuildResult[] = [];

  // 1. Generate SKILL.md
  const skillMd = emitSkill(doc);
  results.push({
    inputFile,
    outputPath: `${skillDir}/SKILL.md`,
    content: skillMd,
    size: Buffer.byteLength(skillMd, 'utf8'),
  });

  // 2. Handle additional files
  // ...
  return results;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| String field paths | Template literal type paths | TypeScript 4.1+ | Compile-time validation of nested paths |
| Runtime type guards | Compile-time generics | TypeScript 4.x | No runtime validation overhead |

**Deprecated/outdated:**
- None relevant - this is a new feature

## Open Questions

Things that couldn't be fully resolved:

1. **CLI Skill Output Location**
   - What we know: Skills go to `.claude/skills/{name}/SKILL.md`
   - What's unclear: Should state CLI skills be TSX-compiled or manually authored?
   - Recommendation: Manually author first for v1, migrate to TSX if pattern stabilizes

2. **StateKey Naming Convention**
   - What we know: CONTEXT.md specifies manual enum like `StateKey.PROJECT_CONTEXT`
   - What's unclear: Should keys be SCREAMING_CASE or PascalCase?
   - Recommendation: Follow TypeScript enum convention (PascalCase: `StateKey.ProjectContext`)

3. **State File Location Configuration**
   - What we know: CONTEXT.md says "configurable file location"
   - What's unclear: Should location be per-state or project-wide default?
   - Recommendation: Per-state in adapter config, with sensible default (`.state/{key}.json`)

## Sources

### Primary (HIGH confidence)
- `src/jsx.ts` - Component interface patterns (useVariable, VariableRef, AssignProps)
- `src/ir/nodes.ts` - IR node type patterns (AssignNode, IfNode, OnStatusNode)
- `src/parser/transformer.ts` - JSX to IR transformation patterns
- `src/emitter/emitter.ts` - IR to markdown emission patterns
- `src/cli/commands/build.ts` - Multi-file output pattern (processSkill)

### Secondary (MEDIUM confidence)
- https://evolved.io/articles/typescript-nested-object-paths - TypeScript Paths<T> type pattern
- CONTEXT.md decisions for implementation constraints

### Tertiary (LOW confidence)
- General TypeScript template literal types knowledge (training data)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using only existing codebase dependencies
- Architecture: HIGH - Following exact patterns from existing components
- Pitfalls: MEDIUM - Based on pattern analysis, not production experience with this feature

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (stable patterns, internal codebase)
