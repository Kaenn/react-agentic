---
phase: 10-spawnagent-component
plan: 02
subsystem: emitter
tags: [spawnagent, emission, gsd-format, task-syntax]

dependency-graph:
  requires: [10-01-spawnagent-transformation]
  provides: [spawnagent-emission, task-syntax]
  affects: [11-type-validation]

tech-stack:
  added: []
  patterns: [emitSpawnAgent, quote-escaping, multi-line-preservation]

file-tracking:
  key-files:
    created:
      - tests/emitter/spawnagent-emitter.test.ts
    modified:
      - src/emitter/emitter.ts

decisions:
  - id: task-property-order
    choice: "prompt, subagent_type, model, description"
    rationale: "Matches GSD framework convention for Task() syntax"

metrics:
  duration: "1m 54s"
  completed: 2026-01-21
---

# Phase 10 Plan 02: SpawnAgent Emission Summary

emitSpawnAgent method producing GSD Task() syntax with proper quote escaping and multi-line preservation

## What Was Built

### emitSpawnAgent Method (src/emitter/emitter.ts)
```typescript
private emitSpawnAgent(node: SpawnAgentNode): string {
  const escapeQuotes = (s: string): string => s.replace(/"/g, '\\"');

  return `Task(
  prompt="${escapeQuotes(node.prompt)}",
  subagent_type="${escapeQuotes(node.agent)}",
  model="${escapeQuotes(node.model)}",
  description="${escapeQuotes(node.description)}"
)`;
}
```

Key features:
- Double quote escaping in all string values (`"` -> `\"`)
- Multi-line prompt content preserved with actual newlines
- {variable} placeholders pass through unchanged
- Property order: prompt, subagent_type, model, description

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 8cf3d88 | feat | Implement emitSpawnAgent method |
| a55505e | test | Add SpawnAgent emission tests |

## Test Coverage

14 tests covering:
- Basic emission (2 tests): Task() syntax, proper indentation
- Quote escaping (3 tests): prompt, description, agent name
- Multi-line content (2 tests): newline preservation, XML-like structure
- Placeholder preservation (3 tests): model, prompt, multiple variables
- Multiple SpawnAgent elements (1 test): separate Task() blocks
- SpawnAgent with siblings (1 test): ordering with other block elements
- Complete document output (2 tests): Command with SpawnAgent, format validation

## E2E Verification

Verified complete SpawnAgent transpilation pipeline:

**Input (test-spawnagent.tsx):**
```tsx
<Command name="test-spawn" description="Test SpawnAgent">
  <h1>Test Command</h1>
  <p>This command tests SpawnAgent transpilation.</p>
  <SpawnAgent
    agent="gsd-researcher"
    model="{researcher_model}"
    description="Research phase requirements"
    prompt={`<planning_context>
Phase: {phase_number}
Description: {phase_description}
</planning_context>

Research the technical domain for this phase.`}
  />
</Command>
```

**Output (.claude/commands/test-spawn.md):**
```markdown
---
name: test-spawn
description: Test SpawnAgent transpilation
---

# Test Command

This command tests SpawnAgent transpilation.

Task(
  prompt="<planning_context>
Phase: {phase_number}
Description: {phase_description}
</planning_context>

Research the technical domain for this phase.",
  subagent_type="gsd-researcher",
  model="{researcher_model}",
  description="Research phase requirements"
)
```

## Verification

- `npm run typecheck` - passes
- `npm test` - 217 tests pass (14 new emission tests + 203 existing)
- SpawnAgentNode emits valid Task() syntax
- Quote escaping works correctly (`"` -> `\"`)
- Multi-line prompts preserve newlines
- {variable} placeholders pass through unchanged

## Deviations from Plan

None - plan executed exactly as written.

## Phase 10 Complete

Phase 10 (SpawnAgent Component) is now complete:
- Plan 01: SpawnAgent transformation (TSX -> SpawnAgentNode)
- Plan 02: SpawnAgent emission (SpawnAgentNode -> Task() syntax)

Ready for Phase 11 (Type Validation).
