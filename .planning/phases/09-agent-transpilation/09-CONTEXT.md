# Phase 9: Agent Transpilation - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Agent component transpiles to GSD-compatible markdown files in `.claude/agents/`. This phase covers parsing Agent components, transforming to IR, and emitting GSD-format markdown with proper output routing. Type safety and cross-file validation are Phase 11.

</domain>

<decisions>
## Implementation Decisions

### Output Routing
- Separate `folder` prop determines subfolder path: `folder="my-team"` + `name="researcher"` → `.claude/agents/my-team/researcher.md`
- `folder` prop is optional — no folder means root-level agent (`.claude/agents/{name}.md`)
- Support nested folders if Claude Code allows: `folder="team/sub"` → `.claude/agents/team/sub/{name}.md`
- Agent name in Claude Code derives from folder structure: `my-team/researcher.md` registers as `my-team:researcher`

### Claude's Discretion
- Props mapping (how name, description, tools, color map to GSD frontmatter)
- Body content handling (how JSX children become markdown sections)
- Parse error messages and source locations
- Validation of folder/name characters (filesystem-safe)

</decisions>

<specifics>
## Specific Ideas

- Output path is critical for agent identity in Claude Code — the subfolder path determines the agent's namespaced name (colon-separated)
- This differs from Commands where output path doesn't affect the command's identity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-agent-transpilation*
*Context gathered: 2026-01-21*
