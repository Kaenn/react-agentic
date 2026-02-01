# Phase 34: Agent Contract Components - Context

**Gathered:** 2026-01-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Components for agents to define complete self-documenting contracts: Role, UpstreamInput, DownstreamConsumer, Methodology, and StructuredReturns with Return children. These describe WHAT an agent is and does, enabling commands to orchestrate them effectively.

Not included: Command-side orchestration (Phase 35), meta-prompting context composition (Phase 36), or SpawnAgent enhancements (Phase 37).

</domain>

<decisions>
## Implementation Decisions

### Component nesting structure
- All contract components are optional — Agent works without any contract components (progressive enhancement)
- Each component type appears at most once — compile error if duplicated
- Strict ordering enforced: Role → UpstreamInput → DownstreamConsumer → Methodology → StructuredReturns (compile error otherwise)
- Contract components can be freely interleaved with regular Agent content (XmlBlock, Markdown)

### Content format
- All contract components accept free-form children (Markdown, XmlBlock, text) — author decides internal structure
- No props needed on container components — component type is enough (e.g., `<Role>I'm a test runner</Role>`)
- Return component has `status` prop + children: `<Return status="SUCCESS">Description of what success means</Return>`
- Return children accept any markdown content (text, code blocks, lists, etc.)

### Return status typing
- Agent defines custom status type extending string: `<Agent<MyAgentStatus>>` where `type MyAgentStatus = "SUCCESS" | "PARTIAL" | "BLOCKED"`
- Default fallback is `string` if agent doesn't specify a status type
- HandleReturn (Phase 35) can only match statuses the agent declares — compile error otherwise
- If Agent has status type, StructuredReturns is required and must document each status
- StructuredReturns must be exhaustive — compile error if any status in type is missing a Return child

### Rendering output
- All contract components render as XML blocks in agent markdown output
- Tag names are snake_case: `<role>`, `<upstream_input>`, `<downstream_consumer>`, `<methodology>`, `<structured_returns>`
- Inside `<structured_returns>`, each Return renders as a markdown section: `## {Status Heading}` followed by the children content

### Claude's Discretion
- Exact error messages for compile-time validation
- Internal IR node structure
- How to extract and validate status type from Agent generic parameter

</decisions>

<specifics>
## Specific Ideas

- Follow pattern from `experiments/meta-prompting/scenario-4-generated-agent.md` — this is the target output format
- The TSX pattern from `experiments/meta-prompting/scenario-4-structured-input-only.tsx` shows the intended component API
- Return status sections in output should include the full description content, not just the status name

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 34-agent-contract-components*
*Context gathered: 2026-01-31*
