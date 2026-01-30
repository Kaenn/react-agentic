---
phase: 14-agent-output-schema
verified: 2026-01-22T15:30:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 14: Agent Output Schema Verification Report

**Phase Goal:** Define standard agent output types and auto-generate structured returns section in agent markdown
**Verified:** 2026-01-22T15:30:00Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `AgentStatus` type defines standard codes: SUCCESS, BLOCKED, NOT_FOUND, ERROR, CHECKPOINT | VERIFIED | `src/jsx.ts:300-305` exports union type with all 5 codes |
| 2 | `BaseOutput` interface requires `status: AgentStatus` with optional `message: string` | VERIFIED | `src/jsx.ts:322-327` has `status: AgentStatus` (required) and `message?: string` (optional) |
| 3 | Agent TOutput type parameter extends BaseOutput with status-specific fields | VERIFIED | `src/jsx.ts:143` has `Agent<TInput = unknown, TOutput = unknown>` generic signature |
| 4 | Emitter generates `<structured_returns>` section from output type interface | VERIFIED | Built test-output-schema.tsx produces structured_returns at line 17-40 of output |
| 5 | Generated returns show status-specific field templates (e.g., SUCCESS shows confidence, findings) | VERIFIED | Output shows `confidence`, `findings`, `metrics`, `blockedBy`, `searchedPaths` fields from AnalyzerOutput interface |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/jsx.ts` | AgentStatus type, BaseOutput interface | VERIFIED | Lines 300-327 contain both exports |
| `src/ir/nodes.ts` | outputType field on AgentFrontmatterNode | VERIFIED | Line 265: `outputType?: TypeReference` |
| `src/parser/transformer.ts` | Second type param extraction | VERIFIED | Line 278: `typeArgs[1]` extraction |
| `src/emitter/emitter.ts` | emitStructuredReturns method | VERIFIED | Lines 503-560 implement full method |
| `src/app/basic/test-output-schema.tsx` | Test agent with TOutput | VERIFIED | File exists with AnalyzerOutput extending BaseOutput |

### Key Link Verification

| From | To | Via | Status | Details |
|------|------|-----|--------|---------|
| AgentStatus | BaseOutput | status property type | WIRED | `status: AgentStatus` at jsx.ts:324 |
| transformAgent | AgentFrontmatterNode | outputType spread | WIRED | `...(outputType && { outputType })` at transformer.ts:291 |
| emitAgent | emitStructuredReturns | frontmatter.outputType | WIRED | Call at emitter.ts:116 when outputType && sourceFile |
| emitStructuredReturns | parser.ts | resolveTypeImport + extractInterfaceProperties | WIRED | Import and call at emitter.ts:505,511 |
| CLI build.ts | emitAgent | sourceFile parameter | WIRED | `emitAgent(doc, sourceFile)` at build.ts:153 |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| OUTPUT-01: AgentStatus type | SATISFIED | - |
| OUTPUT-02: BaseOutput interface | SATISFIED | - |
| OUTPUT-03: Agent TOutput parameter | SATISFIED | - |
| OUTPUT-04: Emitter structured_returns | SATISFIED | - |
| OUTPUT-05: Status-specific templates | SATISFIED | - |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/cli/commands/build.ts` | 86 | TypeScript error (string | undefined to string) | Warning | Pre-existing issue, not blocking |

### Human Verification Required

None. All automated checks pass.

### Verification Details

#### Truth 1: AgentStatus type
```typescript
// src/jsx.ts:300-305
export type AgentStatus =
  | 'SUCCESS'
  | 'BLOCKED'
  | 'NOT_FOUND'
  | 'ERROR'
  | 'CHECKPOINT';
```

#### Truth 2: BaseOutput interface
```typescript
// src/jsx.ts:322-327
export interface BaseOutput {
  /** Required: Agent completion status */
  status: AgentStatus;
  /** Optional: Human-readable status message */
  message?: string;
}
```

#### Truth 3: Agent generic signature
```typescript
// src/jsx.ts:143
export function Agent<TInput = unknown, TOutput = unknown>(_props: AgentProps<TInput, TOutput>): null {
```

#### Truth 4 & 5: Generated structured_returns
Built `test-output-schema.tsx` produces:
```yaml
<structured_returns>

## Output Format

Return a YAML code block with the following structure:

```yaml
status: SUCCESS | BLOCKED | NOT_FOUND | ERROR | CHECKPOINT
confidence: <HIGH | MEDIUM | LOW>  # optional
findings: [...]  # optional
metrics: <{ linesAnalyzed: number; issuesFound: number; }>  # optional
blockedBy: "..."  # optional
searchedPaths: [...]  # optional
```
```

#### Backward Compatibility
- Agent without TOutput (`simple-orchestrator-agent.tsx`) builds without structured_returns section
- Single type parameter usage (`<Agent<TInput>>`) still works (TOutput defaults to unknown)

---

_Verified: 2026-01-22T15:30:00Z_
_Verifier: Claude (gsd-verifier)_
