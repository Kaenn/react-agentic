# Phase 36: Meta-Prompting Components - Research

**Phase:** 36-meta-prompting-components
**Researched:** 2026-02-01
**Status:** Ready for planning

## Executive Summary

This phase adds components for composing structured context from file reads into typed XML blocks for agent consumption. The goal is enabling runtime file reading with bash instructions (like GSD's `VAR=$(cat path)` pattern) rather than compile-time file embedding.

**Key Decision:** Most components should be **composites** built from existing primitives. Only `ReadFile` needs to be a new primitive due to its unique bash emission behavior.

## Component Classification: Primitives vs Composites

### Analysis Against Existing Architecture

The codebase distinguishes between:

1. **Primitives** - Compiler-owned components with direct IR nodes (see `src/ir/registry.ts`)
   - Infrastructure layer: control flow, agents, runtime (`if`, `spawnAgent`, `runtimeCall`)
   - Presentation layer: structural output (`table`, `xmlBlock`, `step`)
   - Document layer: root nodes (`document`, `frontmatter`)

2. **Composites** - User-definable wrappers built from primitives (see `docs/composites.md`)
   - No IR nodes - just TypeScript functions returning primitive trees
   - Examples: `IfElseBlock`, `DataTable`, `SpawnAgentWithRetry`

### Component-by-Component Classification

| Component | Type | Rationale |
|-----------|------|-----------|
| `ReadFile` | **Primitive** | Needs new `ReadFileNode` IR for unique bash emit: `VAR=$(cat path 2>/dev/null)`. No existing primitive provides this. |
| `MetaPrompt` | **Composite** | Just a grouping wrapper - can be implemented as React component returning children |
| `GatherContext` | **Composite** | Groups `ReadFile` calls - pure organizational wrapper |
| `ComposeContext` | **Composite** | Wraps `XmlBlock` (existing primitive) with structure - can be composite |
| `InlineField` | **Composite** | Renders `**Key:** value` markdown - can use existing `Markdown` primitive |
| `Preamble` | **Composite** | Renders markdown text - can use existing `Markdown` or `<p>` |

**Recommendation:** Add only ONE new primitive (`ReadFile`). Implement others as composites in `src/composites/meta-prompting/`.

## ReadFile Primitive Specification

### IR Node Design

```typescript
// src/ir/nodes.ts addition
export interface ReadFileNode {
  kind: 'readFile';
  path: string;           // File path (may contain variable refs like ${phaseDir})
  varName: string;        // Shell variable name from 'as' prop
  required: boolean;      // Whether file must exist (affects error handling)
}
```

### Component Interface

```typescript
// src/components/meta-prompting.ts
export interface ReadFileProps {
  path: string;           // File path relative to project root
  as: string;             // Required: shell variable name (e.g., "STATE_CONTENT")
  optional?: boolean;     // If true, suppress errors with 2>/dev/null
}

export function ReadFile(_props: ReadFileProps): null {
  // Compile-time only - transformed during build
  return null;
}
```

### Bash Emission Pattern

From GSD reference (`/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md` lines 239-252):

```bash
# Required files
STATE_CONTENT=$(cat .planning/STATE.md)
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)

# Optional files (empty string if missing)
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
CONTEXT_CONTENT=$(cat "${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null)
```

**Emitter logic** (add to `src/emitter/emitter.ts`):

```typescript
private emitReadFile(node: ReadFileNode): string {
  const quotedPath = node.path.includes('$') ? `"${node.path}"` : node.path;

  if (node.required) {
    return `\`\`\`bash\n${node.varName}=$(cat ${quotedPath})\n\`\`\``;
  } else {
    return `\`\`\`bash\n${node.varName}=$(cat ${quotedPath} 2>/dev/null)\n\`\`\``;
  }
}
```

### Transformer Implementation

Add to `src/parser/transformers/primitives.ts`:

```typescript
export function transformReadFile(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ReadFileNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const path = getAttributeValue(opening, 'path');
  const varName = getAttributeValue(opening, 'as');
  const optionalAttr = getAttributeValue(opening, 'optional');

  if (!path) {
    throw ctx.createError('ReadFile requires path prop', node);
  }
  if (!varName) {
    throw ctx.createError('ReadFile requires as prop', node);
  }

  const required = optionalAttr !== 'true';

  return {
    kind: 'readFile',
    path,
    varName,
    required,
  };
}
```

### Variable Name Format

**Decision needed:** Should `as` prop accept any string, or validate format?

**Options:**
1. **SCREAMING_SNAKE_CASE** - Enforce `STATE_CONTENT`, reject `stateContent` (strict bash convention)
2. **Any valid shell identifier** - Allow `STATE_CONTENT`, `state_content`, `stateContent` (permissive)
3. **No validation** - User responsibility (simplest)

**Recommendation:** Option 3 (no validation). Let bash fail at runtime if invalid. Matches existing `useVariable` pattern from Phase 23 which doesn't validate variable names.

## Composite Component Implementations

All composites should be in `src/composites/meta-prompting/` (new directory).

### 1. MetaPrompt Composite

**Purpose:** Top-level wrapper for context composition blocks

**Implementation:**
```tsx
import type { ReactNode } from 'react';

export interface MetaPromptProps {
  children: ReactNode;
}

export const MetaPrompt = ({ children }: MetaPromptProps): ReactNode => {
  return <>{children}</>;
};
```

Just a pass-through container for semantic grouping.

### 2. GatherContext Composite

**Purpose:** Group file read operations together

**Implementation:**
```tsx
import type { ReactNode } from 'react';

export interface GatherContextProps {
  children: ReactNode;  // Should contain ReadFile components
}

export const GatherContext = ({ children }: GatherContextProps): ReactNode => {
  return <>{children}</>;
};
```

Also a pass-through. Alternative: Could emit a markdown comment `<!-- Gather Context -->` for clarity.

### 3. ComposeContext Composite

**Purpose:** Structure gathered content into XML blocks

**Implementation:**
```tsx
import { XmlBlock, type ReactNode } from 'react-agentic';

export interface ComposeContextProps {
  name: string;         // XML block name (e.g., "planning_context")
  children: ReactNode;  // Content (InlineFields, XmlBlocks, etc.)
}

export const ComposeContext = ({ name, children }: ComposeContextProps): ReactNode => {
  return (
    <XmlBlock name={name}>
      {children}
    </XmlBlock>
  );
};
```

Wraps existing `XmlBlock` primitive.

### 4. InlineField Composite

**Purpose:** Render simple key-value inline (e.g., `**Phase:** 08`)

**Implementation:**
```tsx
import { Markdown } from 'react-agentic';
import type { RuntimeVar } from 'react-agentic';

export interface InlineFieldProps {
  name: string;                          // Field name (e.g., "Phase")
  value: string | number | RuntimeVar<any>;  // Static or runtime value
}

export const InlineField = ({ name, value }: InlineFieldProps): ReactNode => {
  // If value is RuntimeVar, use Ref for shell syntax
  const displayValue = typeof value === 'object' && 'kind' in value
    ? `$${value.name}`  // Simple string interpolation for RuntimeVar
    : String(value);

  return <Markdown>{`**${name}:** ${displayValue}`}</Markdown>;
};
```

Uses existing `Markdown` primitive. Could also use `<p>` but Markdown gives more control.

### 5. Preamble Composite

**Purpose:** Render intro text before structured content

**Implementation:**
```tsx
import type { ReactNode } from 'react';

export interface PreambleProps {
  children: ReactNode;
}

export const Preamble = ({ children }: PreambleProps): ReactNode => {
  return <>{children}</>;
};
```

Another pass-through. User can just use markdown directly, but Preamble provides semantic clarity.

**Alternative:** Make Preamble render children in italic:
```tsx
export const Preamble = ({ children }: PreambleProps): ReactNode => {
  return <blockquote>{children}</blockquote>;
};
```

## Variable Reference Integration

### Using Ref Component

From Phase 29, the `<Ref>` component handles variable references:

```tsx
import { Ref, useRuntimeVar } from 'react-agentic';

const ctx = useRuntimeVar<{ phase: string }>('ARGS');

// In InlineField:
<InlineField name="Phase" value={ctx.phase} />

// Emits:
// **Phase:** $ARGS.phase
```

**Challenge:** `InlineField` is a composite, not a primitive. How does it emit `$ARGS.phase` syntax?

**Solution:** Composites can't directly emit shell syntax. Two approaches:

1. **Document pattern in composite** - InlineField example shows using `<Ref>` explicitly:
   ```tsx
   <InlineField name="Phase">
     <Ref value={ctx.phase} />
   </InlineField>
   ```

2. **Accept only static values** - InlineField doesn't support RuntimeVar, user uses `<Ref>` manually:
   ```tsx
   **Phase:** <Ref value={ctx.phase} />
   ```

**Recommendation:** Approach 2 (static only). Keep composites simple. Users can compose `<Ref>` + markdown for dynamic values.

**Revised InlineField:**
```tsx
export interface InlineFieldProps {
  name: string;
  value: string | number;  // Remove RuntimeVar support
}

export const InlineField = ({ name, value }: InlineFieldProps) => (
  <Markdown>{`**${name}:** ${value}`}</Markdown>
);
```

## Integration with Existing ReadFiles Primitive

The codebase already has `ReadFilesNode` (plural) and `transformReadFiles` for batched file reading (see `src/ir/nodes.ts` lines 390-406, `src/parser/transformers/primitives.ts` lines 109-256).

### Comparison: ReadFiles vs ReadFile

| Aspect | ReadFiles (existing) | ReadFile (new) |
|--------|---------------------|----------------|
| **Purpose** | Batch read multiple files in one bash block | Single file read per component |
| **Props** | `files={defineFiles({...})}` schema object | `path="..." as="..." optional` |
| **Emit** | Single bash code block with all reads | One bash block per ReadFile |
| **Usage** | GSD's Step 7 pattern (read all context) | Incremental, semantic grouping |

**Decision:** Keep both. They serve different use cases:

- **ReadFiles** - When you know all files upfront, want one bash block (existing pattern)
- **ReadFile** - When building with composites, want semantic grouping with GatherContext

### Example: Using Both

```tsx
// Old style (still valid)
const contextFiles = defineFiles({
  state: { path: '.planning/STATE.md', required: true },
  roadmap: { path: '.planning/ROADMAP.md', required: true },
  requirements: { path: '.planning/REQUIREMENTS.md', required: false },
});

<ReadFiles files={contextFiles} />

// New style (more semantic)
<GatherContext>
  <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
  <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
  <ReadFile path=".planning/REQUIREMENTS.md" as="REQUIREMENTS_CONTENT" optional />
</GatherContext>
```

Both emit similar bash, but new style provides better semantic structure and composability.

## File Organization

```
src/
├── components/
│   └── meta-prompting.ts         # NEW: ReadFile primitive export
├── composites/
│   └── meta-prompting/           # NEW: directory
│       ├── index.ts              # Export all composites
│       ├── MetaPrompt.tsx
│       ├── GatherContext.tsx
│       ├── ComposeContext.tsx
│       ├── InlineField.tsx
│       └── Preamble.tsx
├── ir/
│   ├── nodes.ts                  # Add ReadFileNode
│   └── registry.ts               # Add 'readFile' to primitives
├── parser/transformers/
│   ├── primitives.ts             # Add transformReadFile
│   └── dispatch.ts               # Wire ReadFile -> transformReadFile
└── emitter/
    └── emitter.ts                # Add emitReadFile case

docs/
├── meta-prompting.md             # NEW: Full guide
└── grammar.md                    # Update with ReadFile entry
```

## Usage Example: GSD Plan-Phase Pattern

From `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md` translated to react-agentic:

```tsx
import { Command, SpawnAgent, useRuntimeVar } from 'react-agentic';
import {
  MetaPrompt,
  GatherContext,
  ReadFile,
  ComposeContext,
  InlineField,
  Preamble
} from 'react-agentic/composites/meta-prompting';

export default (
  <Command name="gsd:plan-phase" description="Create phase plans">
    {({ args }) => {
      const phaseDir = useRuntimeVar<string>('PHASE_DIR');

      return <>
        {/* Step 7: Read Context Files (lines 236-252) */}
        <MetaPrompt>
          <GatherContext>
            <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
            <ReadFile path=".planning/ROADMAP.md" as="ROADMAP_CONTENT" />
            <ReadFile path=".planning/REQUIREMENTS.md" as="REQUIREMENTS_CONTENT" optional />
            <ReadFile path="${phaseDir}/*-CONTEXT.md" as="CONTEXT_CONTENT" optional />
            <ReadFile path="${phaseDir}/*-RESEARCH.md" as="RESEARCH_CONTENT" optional />
          </GatherContext>

          {/* Compose into structured context (lines 266-314) */}
          <ComposeContext name="planning_context">
            <Preamble>
              You will use this context to create executable phase plans.
              Output consumed by /gsd:execute-phase.
            </Preamble>

            <InlineField name="Phase" value="08" />
            <InlineField name="Mode" value="standard" />

            {/* Use variable references with Ref */}
            <Markdown>
              **Project State:**
              <Ref value={stateContent} />

              **Roadmap:**
              <Ref value={roadmapContent} />
            </Markdown>
          </ComposeContext>
        </MetaPrompt>

        <SpawnAgent
          agent="gsd-planner"
          model="opus"
        />
      </>;
    }}
  </Command>
);
```

**Emits (simplified):**

```markdown
```bash
STATE_CONTENT=$(cat .planning/STATE.md)
ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)
REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
CONTEXT_CONTENT=$(cat "${PHASE_DIR}"/*-CONTEXT.md 2>/dev/null)
RESEARCH_CONTENT=$(cat "${PHASE_DIR}"/*-RESEARCH.md 2>/dev/null)
```

<planning_context>

You will use this context to create executable phase plans.
Output consumed by /gsd:execute-phase.

**Phase:** 08
**Mode:** standard

**Project State:**
$STATE_CONTENT

**Roadmap:**
$ROADMAP_CONTENT

</planning_context>
```

## Testing Strategy

### Unit Tests

1. **ReadFile Transformer** (`tests/parser/meta-prompting.test.ts`)
   - Required file (no optional flag)
   - Optional file (optional=true)
   - Path with variable reference (`${VAR}`)
   - Missing `as` prop (error)
   - Missing `path` prop (error)

2. **ReadFile Emitter** (`tests/emitter/meta-prompting.test.ts`)
   - Required file emits `VAR=$(cat path)`
   - Optional file emits `VAR=$(cat path 2>/dev/null)`
   - Path quoting with variables

3. **Composite Behavior** (`tests/composites/meta-prompting.test.ts`)
   - MetaPrompt pass-through
   - GatherContext grouping
   - ComposeContext wraps XmlBlock
   - InlineField markdown output
   - Preamble rendering

### Integration Tests

Create example command matching GSD pattern:
- `src/app/example-meta-prompting.tsx` - Full plan-phase translation
- Build and verify emitted markdown matches GSD structure

## Documentation Requirements

### New Guide: docs/meta-prompting.md

Structure:
1. **Concept** - Runtime file reading vs compile-time embedding
2. **Components** - ReadFile primitive + composites
3. **Pattern** - GatherContext → ComposeContext flow
4. **Examples** - GSD-style orchestration
5. **Variable References** - Using Ref with gathered content
6. **Comparison** - ReadFile vs ReadFiles

### Update Existing Docs

- `docs/primitives.md` - Add ReadFile to primitive catalog
- `docs/composites.md` - Add meta-prompting composites section
- `docs/grammar.md` - Add ReadFile element specification
- `docs/README.md` - Add meta-prompting link

## Edge Cases & Considerations

### 1. Variable Name Collisions

**Issue:** User defines `STATE_CONTENT` twice
```tsx
<ReadFile path="state1.md" as="STATE_CONTENT" />
<ReadFile path="state2.md" as="STATE_CONTENT" />
```

**Behavior:** Bash overwrites - second read wins. No compile-time check.

**Mitigation:** Document best practice - use unique variable names.

### 2. Path with Spaces

**Issue:** `path="my file.md"` breaks bash

**Behavior:** Emitter quotes paths containing `$` (for variable refs). Should also quote paths with spaces.

**Fix:** Update emitter logic:
```typescript
const quotedPath = /[$\s]/.test(node.path) ? `"${node.path}"` : node.path;
```

### 3. File Not Found (Required)

**Issue:** Required file missing causes bash error

**Behavior:** Command fails with `cat: file: No such file or directory`

**Mitigation:** Document that required files must exist. User should validate environment first (like GSD's Step 1).

### 4. Empty Optional Files

**Issue:** Optional file missing - variable is empty string

**Behavior:** Correct - `VAR=$(cat missing 2>/dev/null)` sets `VAR=""`

**Usage:** XmlBlock with empty content emits empty block (acceptable).

## Requirements Coverage

Mapping to REQUIREMENTS.md:

| Req | Component | Type | Notes |
|-----|-----------|------|-------|
| META-01 | MetaPrompt | Composite | Pass-through wrapper |
| META-02 | GatherContext | Composite | Grouping container |
| META-03 | ReadFile | **Primitive** | New IR node for bash emit |
| META-04 | ComposeContext | Composite | Wraps XmlBlock primitive |
| META-05 | InlineField | Composite | Uses Markdown primitive |
| META-06 | Preamble | Composite | Pass-through (or blockquote) |

**All requirements satisfied** with 1 primitive + 5 composites.

## Open Questions for Planning

1. **InlineField RuntimeVar Support**
   Should InlineField accept RuntimeVar values? If yes, needs special handling for shell syntax.
   **Recommendation:** No - keep simple, users compose with `<Ref>` manually.

2. **Preamble Visual Style**
   Should Preamble render children in blockquote (italic), or just pass through?
   **Recommendation:** Blockquote for visual distinction.

3. **GatherContext Comment**
   Should GatherContext emit markdown comment for debugging?
   **Recommendation:** No - keep output clean. Comments can be added manually if needed.

4. **Variable Name Validation**
   Should `as` prop validate shell identifier format?
   **Recommendation:** No - let bash handle, matches existing patterns.

5. **ReadFile vs ReadFiles**
   Should we deprecate ReadFiles in favor of ReadFile composability?
   **Recommendation:** No - keep both. ReadFiles efficient for known sets, ReadFile better for semantic structure.

## Prior Art & Patterns

### Similar Components in Codebase

1. **AssignNode** (`src/ir/nodes.ts` lines 228-249)
   Already handles bash variable assignment: `VAR=$(command)`
   ReadFile follows same pattern but specialized for file reading.

2. **ReadFilesNode** (`src/ir/nodes.ts` lines 390-406)
   Batch file reading with `defineFiles()` schema.
   ReadFile is single-file equivalent for compositional use.

3. **XmlBlock** (`src/components/markdown.ts`)
   Generic XML block wrapper - ComposeContext wraps this.

4. **ExecutionContext** (`src/workflow/sections/index.ts`)
   Semantic wrapper around XmlBlock for `@` file references.
   Shows pattern for domain-specific XML wrappers.

### GSD Reference Implementation

From `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md`:

- **Lines 236-252:** File reading pattern we're replicating
- **Lines 266-314:** Structured context composition with inline fields + XML blocks
- **Pattern:** Read → Store → Compose → Inline in agent prompt

## Success Criteria

Planning phase should produce plans that deliver:

1. ✅ `ReadFile` primitive component with path, as, optional props
2. ✅ ReadFileNode IR definition with path, varName, required fields
3. ✅ Bash emitter for ReadFile (with/without error suppression)
4. ✅ Transformer for ReadFile component → IR
5. ✅ 5 composite components in `src/composites/meta-prompting/`
6. ✅ All composites exported from main package
7. ✅ Unit tests for ReadFile transform + emit
8. ✅ Integration test (example command)
9. ✅ Documentation: new guide + grammar update
10. ✅ Requirements META-01 through META-06 satisfied

## References

- **GSD Pattern:** `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md`
- **Context Decisions:** `.planning/phases/36-meta-prompting-components/36-CONTEXT.md`
- **Requirements:** `.planning/REQUIREMENTS.md` (META-01 through META-06)
- **Existing ReadFiles:** `src/parser/transformers/primitives.ts` lines 109-256
- **Primitives Registry:** `src/ir/registry.ts`
- **Composites Guide:** `docs/composites.md`

---

**Research Complete**
Ready for planning phase to create executable implementation plans.
