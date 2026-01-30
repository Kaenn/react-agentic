# Phase 8: IR Extensions - Research

**Researched:** 2026-01-21
**Domain:** TypeScript IR type system, discriminated unions
**Confidence:** HIGH

## Summary

Phase 8 extends the existing IR layer with new node types to support Agent documents and SpawnAgent invocations. This is foundation work that enables Phases 9-11. The existing IR in `src/ir/nodes.ts` provides clear patterns to follow:

1. All nodes use discriminated unions with `kind` as the discriminator
2. The `IRNode` union combines all types for exhaustive switch handling
3. `assertNever()` in both `src/ir/nodes.ts` and `src/emitter/utils.ts` enables compile-time exhaustiveness checking

**Primary recommendation:** Add 4 new node types (`AgentDocumentNode`, `AgentFrontmatterNode`, `SpawnAgentNode`, `TypeReference`) following existing patterns exactly, then update the `IRNode` union.

## Standard Stack

No new dependencies needed. The existing codebase provides everything required.

### Core
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| TypeScript | ^5.9.3 | Type system with discriminated unions | Already in place, enables exhaustiveness checking |
| ts-morph | ^27.0.2 | AST parsing | Not used in IR layer itself, but IR enables parser/emitter |

### Patterns Used
| Pattern | Location | Usage |
|---------|----------|-------|
| Discriminated unions | `src/ir/nodes.ts` | All node types use `kind` discriminator |
| `assertNever()` | `src/ir/nodes.ts`, `src/emitter/utils.ts` | Compile-time exhaustiveness checking |
| Inline vs Block separation | `src/ir/nodes.ts` | InlineNode vs BlockNode unions |
| Optional fields | `FrontmatterNode`, `CodeBlockNode` | Use `?:` for optional properties |

## Architecture Patterns

### Existing IR Structure (to follow exactly)
```
src/ir/
├── nodes.ts    # All node interfaces and unions
└── index.ts    # Re-exports from nodes.ts
```

### Node Definition Pattern
```typescript
/**
 * JSDoc comment explaining the node
 */
export interface SomeNode {
  kind: 'someKind';       // Always required, string literal type
  requiredField: Type;    // Required fields first
  optionalField?: Type;   // Optional fields with ?
  children?: BlockNode[]; // Child arrays when needed
}
```

### Union Type Pattern
```typescript
// Specific unions for context
export type InlineNode = TextNode | BoldNode | ItalicNode | ...;
export type BlockNode = HeadingNode | ParagraphNode | ListNode | ...;

// Master union for all nodes
export type IRNode =
  | BlockNode
  | InlineNode
  | FrontmatterNode
  | ListItemNode
  | DocumentNode;
```

### assertNever Pattern
```typescript
// In emitter switch statements:
switch (node.kind) {
  case 'heading': return this.emitHeading(node);
  case 'paragraph': return this.emitParagraph(node);
  // ... all cases
  default: return assertNever(node);
}
```

### Anti-Patterns to Avoid
- **Loose discriminators:** Using `kind: string` instead of `kind: 'specificValue'`
- **Missing from union:** Adding node but forgetting to add to `IRNode` type
- **Incomplete switches:** Adding node but not handling in emitter (assertNever will catch this)
- **Runtime validation:** IR is type-checked at compile time, no need for runtime checks

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type discrimination | Custom `isNodeType()` guards | TypeScript discriminated unions + `kind` | Built-in pattern narrowing |
| Exhaustiveness | Manual `else` clause | `assertNever()` function | Compile-time catch of missing cases |
| Union type creation | Repeated `|` chains | Defined union types | Reusability, single source of truth |

**Key insight:** TypeScript's discriminated union inference is powerful. Use `kind` literals and the type checker does the rest.

## Common Pitfalls

### Pitfall 1: Forgetting to Add Node to IRNode Union
**What goes wrong:** New node compiles but isn't recognized in generic handlers
**Why it happens:** IRNode union isn't auto-generated from individual types
**How to avoid:** After adding any new node interface, immediately add it to the appropriate union (IRNode, BlockNode, etc.)
**Warning signs:** `assertNever` not triggering type error when switch is incomplete

### Pitfall 2: Inconsistent Kind Strings
**What goes wrong:** Runtime mismatch between creator and handler
**Why it happens:** String literals typed twice (interface and factory)
**How to avoid:** Define kind as exact string literal in interface: `kind: 'agentFrontmatter'`
**Warning signs:** Typos in switch cases vs interface definitions

### Pitfall 3: Optional vs Undefined Fields
**What goes wrong:** Consumers check wrong condition (`if (field)` vs `if (field !== undefined)`)
**Why it happens:** Optional (`?:`) allows both `undefined` and absent
**How to avoid:** Document whether optional means "can be missing" or "can be undefined"
**Warning signs:** Falsy values (empty string, 0) incorrectly treated as absent

### Pitfall 4: Adding Nodes Without Emitter Handling
**What goes wrong:** Compile succeeds but runtime crashes on `assertNever`
**Why it happens:** New node added to IR but switch case not added to emitter
**How to avoid:** The `assertNever` pattern will catch this at compile time IF the node is in the union AND the switch is exhaustive
**Warning signs:** TypeScript error on `assertNever(node)` line - this is GOOD, it means you need to add a case

## Code Examples

### Example 1: AgentFrontmatterNode (based on existing FrontmatterNode)

```typescript
// Source: Existing FrontmatterNode pattern in src/ir/nodes.ts

/**
 * Agent YAML frontmatter data
 * Uses GSD format: tools as string, not array like Command
 */
export interface AgentFrontmatterNode {
  kind: 'agentFrontmatter';
  name: string;              // Required: agent identifier
  description: string;       // Required: agent purpose
  tools?: string;            // Optional: space-separated tool names
  color?: string;            // Optional: terminal color
}
```

### Example 2: AgentDocumentNode (parallel to DocumentNode)

```typescript
// Source: Existing DocumentNode pattern in src/ir/nodes.ts

/**
 * Agent document root node
 * Similar to DocumentNode but with AgentFrontmatterNode
 */
export interface AgentDocumentNode {
  kind: 'agentDocument';
  frontmatter: AgentFrontmatterNode;  // Required for agents (vs optional for Command)
  children: BlockNode[];
}
```

### Example 3: SpawnAgentNode (new block node)

```typescript
// Source: GSD Task() syntax from research

/**
 * SpawnAgent invocation within a Command
 * Emits as Task() syntax in markdown
 */
export interface SpawnAgentNode {
  kind: 'spawnAgent';
  agent: string;           // Agent name/reference
  model: string;           // Model to use (supports {variable} syntax)
  description: string;     // Human-readable task description
  prompt: string;          // Task prompt (supports {variable} and inline content)
}
```

### Example 4: TypeReference (for Phase 11)

```typescript
// Source: v1.1 research on cross-file type tracking

/**
 * Reference to a TypeScript type across files
 * Used for tracking Agent interface imports in SpawnAgent
 * Actual validation happens in Phase 11
 */
export interface TypeReference {
  kind: 'typeReference';
  name: string;            // Type/interface name
  sourceFile?: string;     // Relative path to defining file
  resolved?: boolean;      // Whether type was successfully resolved
}
```

### Example 5: Updated BlockNode Union

```typescript
// Source: Existing pattern in src/ir/nodes.ts

/**
 * Union of all block node types
 */
export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | CodeBlockNode
  | BlockquoteNode
  | ThematicBreakNode
  | XmlBlockNode
  | RawMarkdownNode
  | SpawnAgentNode;        // NEW: SpawnAgent is a block-level element
```

### Example 6: Updated IRNode Union

```typescript
// Source: Existing pattern in src/ir/nodes.ts

/**
 * Union of all IR node types
 */
export type IRNode =
  | BlockNode
  | InlineNode
  | FrontmatterNode
  | AgentFrontmatterNode    // NEW
  | ListItemNode
  | DocumentNode
  | AgentDocumentNode       // NEW
  | TypeReference;          // NEW
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `data: Record<string, unknown>` | Specific typed fields | v1.1 | Type safety for agent frontmatter |
| Single DocumentNode | DocumentNode + AgentDocumentNode | v1.1 | Different frontmatter requirements |

**Important:** The existing `FrontmatterNode` uses `data: Record<string, unknown>` which is flexible but untyped. For Phase 8, `AgentFrontmatterNode` uses specific typed fields because we know exactly what GSD requires.

## Edge Cases

### Edge Case 1: SpawnAgentNode in Different Contexts
`SpawnAgentNode` should only appear inside Command documents, not Agent documents. However, the IR layer doesn't enforce this - that's the parser's job. The IR just represents the structure.

### Edge Case 2: TypeReference Without Resolution
In Phase 8, `TypeReference` is just a data container. It won't be validated until Phase 11. The `resolved` field tracks whether resolution has happened.

### Edge Case 3: Empty Agent Tools
If `tools` is omitted or empty string, the emitter should either:
- Omit the field entirely (if undefined)
- Emit empty string (if explicitly set to "")

Document this decision in the node interface.

## Test Patterns

Based on `tests/emitter/document.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import type { AgentDocumentNode, AgentFrontmatterNode } from '../../src/index.js';

describe('AgentDocumentNode instantiation', () => {
  it('creates AgentDocumentNode with required fields', () => {
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'test-agent',
      description: 'A test agent',
    };

    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter,
      children: [],
    };

    expect(doc.kind).toBe('agentDocument');
    expect(doc.frontmatter.name).toBe('test-agent');
  });

  it('creates AgentDocumentNode with optional fields', () => {
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'full-agent',
      description: 'Full featured agent',
      tools: 'Read Write Bash',
      color: 'cyan',
    };

    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter,
      children: [],
    };

    expect(doc.frontmatter.tools).toBe('Read Write Bash');
    expect(doc.frontmatter.color).toBe('cyan');
  });
});

describe('SpawnAgentNode instantiation', () => {
  it('creates SpawnAgentNode with all fields', () => {
    const node: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'gsd-researcher',
      model: '{researcher_model}',
      description: 'Research the topic',
      prompt: '<context>Research this</context>',
    };

    expect(node.kind).toBe('spawnAgent');
    expect(node.agent).toBe('gsd-researcher');
  });
});

describe('TypeReference instantiation', () => {
  it('creates TypeReference with basic fields', () => {
    const ref: TypeReference = {
      kind: 'typeReference',
      name: 'ResearcherInput',
    };

    expect(ref.kind).toBe('typeReference');
    expect(ref.sourceFile).toBeUndefined();
  });

  it('creates TypeReference with source file', () => {
    const ref: TypeReference = {
      kind: 'typeReference',
      name: 'ResearcherInput',
      sourceFile: './agents/researcher.tsx',
      resolved: false,
    };

    expect(ref.sourceFile).toBe('./agents/researcher.tsx');
  });
});
```

## Open Questions

None for Phase 8. The IR layer is well-defined by existing patterns.

## Sources

### Primary (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - Existing IR node patterns
- `/Users/glenninizan/workspace/react-agentic/src/emitter/emitter.ts` - assertNever usage
- `/Users/glenninizan/workspace/react-agentic/tests/emitter/document.test.ts` - Test patterns

### Secondary (MEDIUM confidence)
- `/Users/glenninizan/workspace/react-agentic/.planning/research/v1.1-SUMMARY.md` - GSD format specification
- `/Users/glenninizan/workspace/react-agentic/.planning/research/v1.1-agent-framework/FEATURES.md` - Agent/SpawnAgent fields

### Tertiary (Documentation reference)
- TypeScript Handbook: Discriminated Unions
- `/Users/glenninizan/workspace/react-agentic/.planning/REQUIREMENTS.md` - IR-01 through IR-05

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, existing patterns
- Architecture: HIGH - Following established IR patterns exactly
- Pitfalls: HIGH - Known from v1.0 development experience

**Research date:** 2026-01-21
**Valid until:** Indefinite (IR patterns are stable)
