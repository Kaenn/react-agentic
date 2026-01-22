---
phase: 14
plan: 03
subsystem: Emitter
tags: [emitter, output-schema, structured-returns, code-generation]

dependency-graph:
  requires: [14-02-IR-Transformer]
  provides: [structured_returns generation from TOutput interface]
  affects: [agent-output-contracts]

tech-stack:
  added: []
  patterns: [type-resolution-for-codegen, yaml-template-generation]

key-files:
  created:
    - src/app/basic/test-output-schema.tsx
  modified:
    - src/emitter/emitter.ts
    - src/cli/commands/build.ts

decisions:
  - id: emitter-type-resolution
    choice: Pass sourceFile to emitAgent for type resolution at emit time
    reason: Interface properties needed for structured_returns require source file access

metrics:
  duration: 3m
  completed: 2026-01-22
---

# Phase 14 Plan 03: Emitter Summary

**One-liner:** emitStructuredReturns method generates `<structured_returns>` XML section from TOutput interface properties with YAML template and status code documentation.

## What Was Done

### Task 1: Add emitStructuredReturns to emitter
Extended emitter.ts with:
- Import `SourceFile` from ts-morph for type resolution
- Import `resolveTypeImport`, `extractInterfaceProperties` from parser
- Updated `emitAgent` to accept optional sourceFile parameter
- Added `emitStructuredReturns` method that:
  - Resolves TOutput TypeReference to interface declaration
  - Extracts properties from interface
  - Generates `<structured_returns>` XML block with YAML template
  - Documents all status codes (SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT)
- Added `formatTypeHint` helper for TypeScript to YAML type hints

**Key method:**
```typescript
private emitStructuredReturns(outputType: TypeReference, sourceFile: SourceFile): string | null {
  const resolved = resolveTypeImport(outputType.name, sourceFile);
  if (!resolved?.interface) return null;

  const props = extractInterfaceProperties(resolved.interface);
  // Generate YAML template from interface properties...
}
```

### Task 2: Update CLI to pass sourceFile to emitAgent
Updated `src/cli/commands/build.ts` to pass sourceFile when emitting agent documents:
```typescript
if (doc.kind === 'agentDocument') {
  markdown = emitAgent(doc, sourceFile);
}
```

### Task 3: Create test agent with output schema
Created `src/app/basic/test-output-schema.tsx` demonstrating:
- `Agent<AnalyzerInput, AnalyzerOutput>` with both type parameters
- `AnalyzerOutput extends BaseOutput` with status-specific fields
- Built output includes auto-generated `<structured_returns>` section

**Generated output includes:**
```yaml
status: SUCCESS | BLOCKED | NOT_FOUND | ERROR | CHECKPOINT
confidence: <HIGH | MEDIUM | LOW>  # optional
findings: [...]  # optional
metrics: <{ linesAnalyzed: number; issuesFound: number; }>  # optional
blockedBy: "..."  # optional
searchedPaths: [...]  # optional
```

## Commits

| Commit | Description |
|--------|-------------|
| 5c74306 | feat(14-03): add emitStructuredReturns to emitter |
| e5fda9e | feat(14-03): pass sourceFile to emitAgent in CLI |
| 6b26b7c | feat(14-03): create test agent with output schema |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All checks passed:
- `emitStructuredReturns` generates valid XML section from TOutput interface
- Generated section shows all interface properties with type hints
- Status codes documented in generated section
- Agent with TOutput has structured_returns in output markdown
- Agent without TOutput has no structured_returns (backward compatible)
- Test agent builds successfully with visible structured_returns section

## Next Phase Readiness

**Phase 14 Complete:** All 3 plans executed successfully. Agent Output Schema feature is fully implemented:
1. Research (14-01): Established patterns for structured returns
2. IR & Transformer (14-02): Added outputType field, extraction from generics
3. Emitter (14-03): Auto-generates structured_returns from TOutput interface

**Ready for Phase 15:** Validation phase can now verify SpawnAgent prompts against both input AND output contracts.

**Note:** Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) is unrelated to this phase - should be addressed separately.
