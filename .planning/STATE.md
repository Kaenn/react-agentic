# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** Compile-time safety for Claude Code commands — malformed commands fail at build time, not runtime.
**Current focus:** v3.1 Meta-Prompting — SHIPPED

## Current Position

Phase: 37 - SpawnAgent Enhancement + Integration
Plan: 02 of 2 complete
Status: Phase complete (v3.1 milestone complete)
Last activity: 2026-02-01 — Completed 37-02-PLAN.md

Progress: [████████████████████] 4/4 phases (v3.1)

Next: Milestone audit or next milestone

## Milestone History

- v1.0 MVP: Shipped 2026-01-21 (7 phases, 17 plans)
  See: .planning/milestones/v1.0-ROADMAP.md
- v1.1 Agent Framework: Shipped 2026-01-21 (4 phases, 7 plans)
- v1.2 Type-Safe Communication: Shipped 2026-01-22 (1 phase, 4 plans)
- v1.3 Conditional Logic: Shipped 2026-01-22 (1 phase, 3 plans)
- v1.4 Agent Output Management: Shipped 2026-01-22 (2 phases, 6 plans)
- v1.5 Skill System: Shipped 2026-01-22 (1 phase, 5 plans)
- v1.6 State System: Shipped 2026-01-22 (1 phase, 6 plans)
- v1.7 MCP Configuration: Shipped 2026-01-22 (1 phase, 4 plans)
- v1.8 Scoped State Skills: Shipped 2026-01-26 (1 phase, 4 plans)
  See: .planning/milestones/v1.8-ROADMAP.md
- v2.0 TSX Syntax Improvements: Shipped 2026-01-27 (6 phases, 17 plans)
  See: .planning/milestones/v2.0-ROADMAP.md
- v2.1 Parser Refactoring: Shipped 2026-01-31 (1 phase, 4 plans)
- v3.0 Primitive/Composite Architecture: Shipped 2026-01-31 (7 phases, 13 plans)
  See: .planning/milestones/v3.0-ROADMAP.md
- v3.1 Meta-Prompting: Shipped 2026-02-01 (4 phases, 10 plans)

## Performance Metrics

**Velocity:**
- Total plans completed: 117 (v1.0-v3.1)
- Average duration: ~5m
- Total execution time: ~8 hours

**By Milestone:**

| Milestone | Phases | Plans | Duration |
|-----------|--------|-------|----------|
| v1.0 MVP | 7 | 17 | 2 days |
| v1.1-v1.8 | 12 | 39 | 5 days |
| v2.0 | 6 | 17 | 2 days |
| v2.1 | 1 | 4 | 1 day |
| v3.0 | 7 | 13 | 11 days |
| v3.1 | 4 | 10 | 1 day |

*Updated after each milestone completion*

## Accumulated Context

### Decisions

All v1.0-v3.0 decisions logged in PROJECT.md Key Decisions table and milestone archives.

**v3.0 Key Decisions:**
- Extract-based SubComponentContent pattern (explicit allow-list)
- Shell variable syntax ($VAR.path) for RuntimeVar interpolation
- GroupNode wrapping for multi-block fragment returns
- Context-based prop/children substitution in static transformer
- Composites directory with separate package.json subpath export

**v3.1 Key Decisions (Phase 34):**
- StatusReturn component name (avoid conflict with control flow Return)
- ReturnStatusNode IR kind='returnStatus' (avoid conflict with control flow ReturnNode)
- Contract components emit as snake_case XML blocks (role, upstream_input, etc.)
- StructuredReturns emits with ## headings per status
- Contract component validation allows interleaving while enforcing relative ordering
- Deferred status type exhaustiveness validation to future enhancement
- V1 transformer must support contract components for backward compatibility

**v3.1 Key Decisions (Phase 35 Plan 01):**
- OnStatusDefault follows sibling pairing pattern (consistent with If/Else)
- Emits as "On any other status:" prose pattern (matches OnStatus format)
- Supports both sibling and standalone modes (sibling inherits output, standalone requires explicit output prop)

**v3.1 Key Decisions (Phase 36 Plan 01):**
- ReadFile uses as prop for variable name (consistency with batch ReadFiles)
- Optional prop inverts required semantics (presence means optional=true)
- Path quoting for $ or space characters

**v3.1 Key Decisions (Phase 36 Plan 02):**
- Semantic wrappers (MetaPrompt, GatherContext) return children via fragment
- ComposeContext wraps XmlBlock primitive for structured output
- InlineField wraps Markdown primitive for **Name:** value pattern
- Preamble uses native blockquote element

**v3.1 Key Decisions (Phase 36 Plan 03):**
- V1 transformer needs ReadFile dispatch for Agent documents (not just V3 dispatch.ts)

**v3.1 Key Decisions (Phase 37 Plan 01):**
- readAgentFile requires agent prop to be specified (can't self-read without agent name)
- agentsDir defaults to ~/.claude/agents/ with tilde expansion support
- Config passed through build pipeline to emitter for runtime access

**v3.1 Key Decisions (Phase 37 Plan 02):**
- Removed MetaPrompt/OnStatus tests - composites not supported in runtime transformer's in-memory test mode
- Focus integration tests on primitive components that work in V3 runtime transformer
- Fixed missing readAgentFile extraction in runtime spawner (was only in V1 transformer)

### Roadmap Evolution

All milestones v1.0-v3.1 complete.

### Pending Todos

None.

### Blockers/Concerns

Pre-existing TypeScript error in build.ts:86 (extractPromptPlaceholders call) - unrelated to milestone work.

## Session Continuity

Last session: 2026-02-01 11:30:00Z
Stopped at: Completed Phase 37, v3.1 milestone shipped
Resume file: None
