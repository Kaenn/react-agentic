# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.
**Current focus:** v1.5 Command Output Handling IN PROGRESS

## Current Position

Phase: 15 of 15 (Command Output Handling)
Plan: 2 of 3 complete
Status: In progress
Last activity: 2026-01-22 - Completed 15-02-PLAN.md (Transformer)

Progress: [██████░░░░] Phase 15: 67%
Next: 15-03-PLAN.md (Emitter)

## Milestone History

- v1.0 MVP: Shipped 2026-01-21 (7 phases, 17 plans)
  See: .planning/MILESTONES.md
- v1.1 Agent Framework: Shipped 2026-01-21 (4 phases, 7 plans)
  - Phase 8: IR Extensions
  - Phase 9: Agent Transpilation
  - Phase 10: SpawnAgent Component
  - Phase 11: Type Safety
- v1.2 Type-Safe Communication: Shipped 2026-01-22 (1 phase, 4 plans)
  - Phase 12: Typed SpawnAgent Input
- v1.3 Conditional Logic: Shipped 2026-01-22 (1 phase, 3 plans)
  - Phase 13: If/Else Components

## Performance Metrics

**Velocity:**
- Total plans completed: 11 (v1.1 + v1.2)
- Average duration: 3m 7s
- Total execution time: 34m 27s

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 8 | 1/1 | 2m 35s | 2m 35s |
| 9 | 2/2 | 7m 32s | 3m 46s |
| 10 | 2/2 | 4m 50s | 2m 25s |
| 11 | 2/2 | 7m 30s | 3m 45s |
| 12 | 4/4 | 12m | 3m |
| 14 | 3/3 | 9m | 3m |

*Updated after each plan completion*

## Accumulated Context

### Decisions

All v1.0 decisions logged in PROJECT.md Key Decisions table.

v1.1 research decisions:
- Use TypeNode API for generic extraction (not Type API)
- Agent owns interface, Command imports it
- @ references must NOT be resolved - emit verbatim
- GSD format: Agent uses `tools` (string), Command uses `allowed-tools` (array)

v1.1 implementation decisions:
- tools-as-string: AgentFrontmatterNode uses tools as space-separated string (GSD format)
- spawnagent-in-blocknode: SpawnAgentNode is block-level element in BlockNode union
- stub-throws: Emitter stub throws 'not yet implemented' to preserve compilability
- agent-transformation-pattern: Agent follows Command transformation pattern exactly
- folder-prop-routing: folder prop affects output path only, not stored in frontmatter
- separate-emit-functions: emitAgent() separate from emit() for document-kind-aware emission
- per-file-mkdir: mkdir called per-file to handle different Agent output directories
- prompt-extraction-pattern: Dedicated extractPromptProp method for prompt prop handling
- task-property-order: Task() output uses prompt, subagent_type, model, description order
- generic-default-unknown: Generic params default to 'unknown' for backward compatibility
- type-reference-unresolved: Extracted TypeReference nodes set resolved: false for validation phase
- syntax-kind-approach: Use getDescendantsOfKind(SyntaxKind.TypeReference) for type extraction
- validation-warning-mode: Validation errors logged but build continues
- local-interface-fallback: resolveTypeImport checks local interfaces before imports

v1.2 design decisions:
- input-over-prompt: SpawnAgent uses typed `input` prop instead of freeform `prompt`
- input-types: `input` accepts VariableRef (from useVariable) OR object literal
- children-as-extra: SpawnAgent children become optional extra instructions (appended)
- auto-prompt-generation: Structured prompt auto-generated from Agent's interface contract
- backward-compat: `prompt` prop deprecated but functional for migration period

v1.2 implementation decisions (12-01):
- prompt-optional-fallback: Emitter uses `node.prompt ?? ''` to handle optional prompt

v1.2 implementation decisions (12-02):
- mutual-exclusivity-error: Transformer throws if both prompt and input provided
- variable-ref-no-validation: VariableRef inputs skip interface validation (runtime-checked)
- no-type-param-no-validation: Missing type parameter = no validation (backward compat)
- placeholder-detection: {varname} pattern in strings detected as placeholder type

v1.2 implementation decisions (12-03):
- xml-input-format: VariableRef wraps in <input> block, object literal creates per-property XML tags
- lowercase-variables: Variable names in output are lowercase for consistency
- prompt-precedence: If both prompt and input exist (shouldn't happen), prompt takes precedence

v1.3 implementation decisions (13-02):
- sibling-detection-at-parent: If/Else sibling detection happens in parent context (transformBlockChildren)
- whitespace-skipping: Whitespace-only text between If and Else is skipped during sibling detection
- helper-method-reuse: transformBlockChildren helper used in 6 places for consistent behavior

v1.3 implementation decisions (13-03):
- prose-format: If emits as **If {test}:** and Else emits as **Otherwise:**
- double-newline-separation: Both emitters use parts.join('\n\n') for proper markdown spacing
- recursive-children: Nested If within Else handled automatically via recursive emitBlock calls

v1.4 implementation decisions (14-02):
- dual-type-extraction: Separate if blocks for TInput and TOutput extraction

v1.4 implementation decisions (14-03):
- emitter-type-resolution: Pass sourceFile to emitAgent for type resolution at emit time
- yaml-template-generation: Generate YAML template from interface properties with type hints

v1.5 implementation decisions (15-01):
- field-returns-placeholder: field('key') returns '{output.key}' string for runtime interpolation
- baseoutput-constraint: useOutput<T extends BaseOutput> ensures type safety

v1.5 implementation decisions (15-02):
- outputs-map-tracking: Track useOutput declarations in Map<string, string> mirroring variables pattern
- agent-name-from-useoutput: Agent name resolved from useOutput first argument (string literal)
- emitter-stub-pattern: OnStatus case in emitter throws 'not yet implemented' following v1.1 pattern

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) - unrelated to Phase 14, should be addressed separately.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Docs conditionals feature | 2026-01-22 | fa2d9fd | [001-docs-conditionals-feature](./quick/001-docs-conditionals-feature/) |
| 002 | Docs + TSX updates for Phase 14 Output Schema | 2026-01-22 | aa096ba | [002-docs-phase-14-output-schema](./quick/002-docs-phase-14-output-schema/) |

## Session Continuity

Last session: 2026-01-22
Stopped at: Completed 15-02-PLAN.md (Transformer)
Resume with: 15-03-PLAN.md (Emitter)
