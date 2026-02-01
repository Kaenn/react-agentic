# Phase 36: Meta-Prompting Components - Context

**Gathered:** 2026-02-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Components for composing structured context from file reads into typed XML blocks for agent consumption. Enables structured instructions for context gathering at runtime (not compile-time file embedding).

</domain>

<decisions>
## Implementation Decisions

### ReadFile semantics
- Emits bash instructions for Claude to execute at runtime (not compile-time file embedding)
- Pattern follows GSD: `VAR=$(cat path)` — Claude reads file and stores content
- Path resolution: relative to project root (cwd where command runs)
- No content processing — file read as-is, no trimming or filtering
- `as` prop is required — specifies the shell variable name
- `optional` prop supported — emits `VAR=$(cat path 2>/dev/null)` pattern for files that may not exist

### XmlBlock usage
- XmlBlock already exists and works — no modifications needed
- Any name string allowed, no compile-time validation
- No reserved names — user responsibility to avoid conflicts
- Separate concerns: XmlBlock is output structure, bash variables are input — connected via prose instructions

### Component architecture
- Prefer composites over primitives — only add primitives if necessary
- Need full component set: MetaPrompt, GatherContext, ReadFile, ComposeContext, XmlBlock, InlineField, Preamble
- Most should be composites built from existing primitives
- ReadFile likely needs new IR node (unique bash emit behavior)

### Variable binding
- ReadFile `as` prop creates shell variable name for bash output
- Existing `<Ref>` component handles variable references — no new mechanism needed
- `as` prop is required on every ReadFile

### Claude's Discretion
- Which components are primitives vs composites (analyze against existing primitives)
- `as` prop format validation (SCREAMING_SNAKE vs any string)
- InlineField implementation approach

</decisions>

<specifics>
## Specific Ideas

- "Like in GSD pattern" — reference `/Users/glenninizan/workspace/get-shit-done/commands/gsd/plan-phase.md` for bash instruction patterns
- GatherContext groups related ReadFile calls (bash read section)
- ComposeContext/XmlBlock structure the output that uses those variables
- The goal is "context in Claude" not "append stuff inside markdown"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-meta-prompting-components*
*Context gathered: 2026-02-01*
