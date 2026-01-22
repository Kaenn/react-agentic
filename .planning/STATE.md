# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.
**Current focus:** v1.7 MCP Configuration

## Current Position

Phase: 18 (MCP Configuration)
Plan: 2 of 4 complete
Status: In progress
Last activity: 2026-01-22 - Completed 18-02-PLAN.md (Transformer)

Progress: [█████░░░░░] Phase 18: 50%
Next: Execute 18-03-PLAN.md (Emitter)

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
- v1.4 Agent Output Management: Shipped 2026-01-22 (2 phases, 6 plans)
  - Phase 14: Agent Output Schema
  - Phase 15: Command Output Handling
- v1.5 Skill System: Shipped 2026-01-22 (1 phase, 5 plans)
  - Phase 16: Skill Component
- v1.6 State System: Shipped 2026-01-22 (1 phase, 6 plans)
  - Phase 17: State System

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
| 15 | 3/3 | 8m 19s | 2m 46s |
| 16 | 5/5 | 11m | 2m 12s |
| 17 | 6/6 | ~12m | ~2m |

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

v1.4 implementation decisions (15-01):
- field-returns-placeholder: field('key') returns '{output.key}' string for runtime interpolation
- baseoutput-constraint: useOutput<T extends BaseOutput> ensures type safety

v1.4 implementation decisions (15-02):
- outputs-map-tracking: Track useOutput declarations in Map<string, string> mirroring variables pattern
- agent-name-from-useoutput: Agent name resolved from useOutput first argument (string literal)
- emitter-stub-pattern: OnStatus case in emitter throws 'not yet implemented' following v1.1 pattern

v1.4 implementation decisions (15-03):
- prose-status-format: OnStatus emits as **On STATUS:** following If/Else pattern
- forEachDescendant-outputs: extractOutputDeclarations uses forEachDescendant to find declarations inside function bodies
- field-expression-compile-time: output.field('key') expressions evaluated at compile time to '{output.key}'

v1.5 implementation decisions (16-01):
- skill-document-arrays: SkillDocumentNode uses separate files[] and statics[] arrays (not mixed children)
- skill-camelcase-props: SkillFrontmatterNode uses camelCase, emitter maps to kebab-case YAML

v1.5 implementation decisions (16-02):
- skill-name-validation-transform: Skill name validated at transform time (fail-fast)
- boolean-attr-valueless: getBooleanAttribute supports valueless `prop` syntax (means true)
- skill-child-separation: processSkillChildren routes SkillFile/SkillStatic to handlers, body uses transformToBlock

v1.5 implementation decisions (16-03):
- statics-on-first-result: Static file array attached to SKILL.md result for processing
- buildresult-extension: Existing BuildResult extended with optional statics rather than new interface

v1.5 implementation decisions (16-04):
- wildcard-preserves-ir: export * from ir/index.js already exports SkillDocumentNode and related types
- wildcard-preserves-emitter: export * from emitter/index.js already exports emitSkill/emitSkillFile

v1.6 implementation decisions (17-01):
- state-node-modes: WriteStateNode uses mode: 'field' | 'merge' to distinguish write patterns
- phantom-schema-type: StateRef<TSchema> uses phantom _schema property for compile-time typing

v1.6 implementation decisions (17-02):
- adapter-interface-six-methods: StateAdapter defines read/write/readField/writeField/merge/exists
- file-adapter-pretty-json: FileAdapter uses 2-space JSON formatting for human readability
- dot-notation-standalone-helpers: getNestedValue/setNestedValue as functions (not class methods) for reuse

v1.6 implementation decisions (17-03):
- staterefs-tracking-pattern: Track useStateRef declarations in stateRefs Map (identifier -> key)
- variable-fallback-literal: Unknown identifiers in WriteState value treated as literal expression

v1.6 implementation decisions (17-04):
- skill-invocation-prose: Emitter generates prose-style "Use skill ..." instructions
- readstate-optional-field: emitReadState conditionally includes --field flag
- writestate-dual-mode: emitWriteState handles field mode (--field --value) and merge mode (--merge)
- variable-shell-syntax: Variable references emit as $VARIABLE_NAME in skill invocations

v1.6 implementation decisions (17-06):
- skill-json-output: Skills output valid JSON for machine-readable responses
- dual-implementation-examples: Skills provide both jq and Node.js implementation examples
- state-directory-convention: State files stored in .state/{key}.json pattern

v1.6 implementation decisions (17-05):
- demo-uses-equals-helper: State demo uses equals() test helper for type-safe conditionals
- exports-include-state-types: StateRef, ReadStateProps, WriteStateProps exported from main index

v1.7 implementation decisions (18-01):
- mcp-transport-types: MCPServerNode supports stdio, http, sse in single type with union
- convenience-components: MCPStdioServer/MCPHTTPServer wrappers with required props for better TS inference

v1.7 implementation decisions (18-02):
- mcpconfig-wrapper: MCPConfig wrapper component for multiple server definitions (follows existing patterns)
- type-specific-validation: Validate prop combinations based on transport type at compile time (fail-fast)
- process-env-resolution: Resolve process.env.X at build time with error on undefined

### Roadmap Evolution

- Phase 16 added: Skill Component — TSX-authored Claude Code skills with hybrid static/generated files
- Phase 17 added: State System — Typed, persistent state for Commands and Agents with compile-time validation

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) - unrelated to Phase 14, should be addressed separately.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | Docs conditionals feature | 2026-01-22 | fa2d9fd | [001-docs-conditionals-feature](./quick/001-docs-conditionals-feature/) |
| 002 | Docs + TSX updates for Phase 14 Output Schema | 2026-01-22 | aa096ba | [002-docs-phase-14-output-schema](./quick/002-docs-phase-14-output-schema/) |
| 003 | Add type-safe shell test builder functions | 2026-01-22 | 1fe764b | [003-add-type-safe-shell-test-builder-functio](./quick/003-add-type-safe-shell-test-builder-functio/) |
| 004 | Docs + TSX updates for Phase 15 output handling | 2026-01-22 | 4d5be1a | [004-update-docs-and-tsx-files-for-plan-15-co](./quick/004-update-docs-and-tsx-files-for-plan-15-co/) |

## Session Continuity

Last session: 2026-01-22
Stopped at: Completed 18-02-PLAN.md (Transformer)
Resume with: Execute 18-03-PLAN.md (Emitter)
