---
phase: 14
plan: 02
subsystem: IR & Transformer
tags: [ir, transformer, type-extraction, generics]

dependency-graph:
  requires: [14-01-RESEARCH]
  provides: [outputType extraction for Agent]
  affects: [14-03-emitter]

tech-stack:
  added: []
  patterns: [dual-type-param-extraction, spread-conditional-properties]

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/parser/transformer.ts

decisions:
  - id: dual-type-extraction
    choice: Separate if blocks for TInput and TOutput extraction
    reason: Clear, independent handling - TOutput only populated when present

metrics:
  duration: 3m
  completed: 2026-01-22
---

# Phase 14 Plan 02: IR & Transformer Summary

**One-liner:** AgentFrontmatterNode gains outputType field; transformAgent extracts second generic parameter from Agent<TInput, TOutput>.

## What Was Done

### Task 1: Add outputType to AgentFrontmatterNode
Extended the AgentFrontmatterNode interface to include an optional `outputType` field of type `TypeReference`. This mirrors the existing `inputType` pattern.

**Key change in `src/ir/nodes.ts`:**
```typescript
export interface AgentFrontmatterNode {
  kind: 'agentFrontmatter';
  name: string;
  description: string;
  tools?: string;
  color?: string;
  inputType?: TypeReference;
  outputType?: TypeReference; // NEW: second generic type parameter
}
```

### Task 2: Extract outputType in transformAgent
Updated the transformer to extract both type parameters from `Agent<TInput, TOutput>`. The extraction uses separate if blocks to handle:
- Single param: `Agent<TInput>` - only inputType populated
- Dual param: `Agent<TInput, TOutput>` - both populated

**Key change in `src/parser/transformer.ts`:**
```typescript
// Extract generic type arguments if present (TInput, TOutput)
const typeArgs = extractTypeArguments(node);
let inputType: TypeReference | undefined;
let outputType: TypeReference | undefined;

if (typeArgs && typeArgs.length > 0) {
  inputType = { kind: 'typeReference', name: typeArgs[0], resolved: false };
}
if (typeArgs && typeArgs.length > 1) {
  outputType = { kind: 'typeReference', name: typeArgs[1], resolved: false };
}

// Frontmatter includes outputType when present
const frontmatter: AgentFrontmatterNode = {
  ...
  ...(inputType && { inputType }),
  ...(outputType && { outputType }),
};
```

## Commits

| Commit | Description |
|--------|-------------|
| d075683 | feat(14-02): add outputType to AgentFrontmatterNode |
| 8fb3848 | feat(14-02): extract outputType in transformAgent |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All checks passed:
- TypeScript compiles (pre-existing error in build.ts unrelated to this plan)
- `outputType` field exists in AgentFrontmatterNode
- `typeArgs[1]` extraction in transformAgent
- `outputType &&` spread in frontmatter construction

## Next Phase Readiness

**Ready for 14-03:** The emitter can now access `frontmatter.outputType` to generate `<structured_returns>` blocks when an Agent has output schema.

**Backward compatibility:** Single-param `<Agent<TInput>>` continues working unchanged - outputType will be undefined.
