# Phase 1: Foundation & IR - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish project infrastructure and define intermediate representation that decouples parsing from generation. Deliverables: project scaffolding (package.json, tsconfig, dependencies), IR type definitions for all planned node kinds, and a Markdown emitter that converts IR to output.

</domain>

<decisions>
## Implementation Decisions

### IR Node Design
- Fixed set of node types — no plugin/extension mechanism needed
- Claude's discretion: source location tracking (optional metadata approach likely)
- Claude's discretion: semantic-only IR (no formatting hints from source)
- Claude's discretion: nested content representation (children array vs typed inline)

### Markdown Output Style
- Unordered list markers: dash (`-`)
- Block element spacing: single blank line between elements
- Code fences: triple backticks (```)
- Emphasis markers: asterisks (`**bold**`, `*italic*`)

### Project Structure
- Source organization: nested by domain (`src/ir/`, `src/emitter/`, `src/transformer/`, `src/cli/`)
- Type definitions: follow modern React conventions (co-located with implementation)
- Build output: `dist/`
- Package manager: pnpm

### Testing Approach
- Test framework: Vitest
- Assertion style: mix snapshots for full output + explicit assertions for critical parts
- Test location: separate `tests/` directory
- Coverage: no enforced threshold — keep it light

### Claude's Discretion
- Source location tracking in IR nodes
- Formatting hint preservation in IR
- Nested content representation approach
- Specific type co-location patterns

</decisions>

<specifics>
## Specific Ideas

- Types should follow modern React conventions — co-located but importable
- Testing should be pragmatic, not bureaucratic — no coverage gates

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-ir*
*Context gathered: 2026-01-20*
