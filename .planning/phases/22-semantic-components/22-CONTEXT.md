# Phase 22: Semantic Components - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Add semantic section components that emit XML-wrapped content for common Claude Code patterns. Components include ExecutionContext, SuccessCriteria, OfferNext, and XML wrapper components (DeviationRules, CommitRules, WaveExecution, CheckpointHandling). All components work inside Command and Agent bodies.

</domain>

<decisions>
## Implementation Decisions

### ExecutionContext (path/import format)
- Default prefix: Always `@` for all paths
- Override via `prefix` prop: `<ExecutionContext paths={[...]} prefix="" />` disables prefix
- Path layout: One path per line inside `<execution_context>` tags
- Children support: Claude's discretion (paths + optional children if useful)

### SuccessCriteria (criteria rendering)
- Format: Markdown checkboxes `- [ ] criterion`
- Pre-checked support: Via object items `{text: "done", checked: true}` alongside string items
- No header prop: Just the checkbox list inside `<success_criteria>` tags
- Items only: No children support, only accepts items array

### OfferNext (route structure)
- Route fields: `name` (required), `description` (optional), `path` (required)
- Render format: Bullet list with backticks
  ```
  - **Name**: Description
    `path`
  ```
- No heading prop: Just the routes list
- XML wrapper: Wraps output in `<offer_next>...</offer_next>`

### XML Wrapper Components (naming)
- Tag naming: snake_case (`<deviation_rules>`, `<commit_rules>`, `<wave_execution>`, `<checkpoint_handling>`)
- Generic component: Yes, add `<XmlSection name="custom_section">` for custom tag names
- Props vs children: Claude's discretion (may add optional props alongside children if useful)
- Empty check: Claude's discretion (determine based on typical usage)

### Claude's Discretion
- Whether ExecutionContext supports children alongside paths
- Whether XML wrapper components accept optional props (like id, title)
- Whether to require children on XML wrappers or allow empty tags

</decisions>

<specifics>
## Specific Ideas

- Bullet list format for OfferNext: "- **Name**: Description\n  `path`"
- SuccessCriteria checkbox items can be strings or objects with `checked` field
- All XML tags use snake_case convention for consistency

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 22-semantic-components*
*Context gathered: 2026-01-26*
