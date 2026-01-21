# Phase 3: Full Element Coverage - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete element support for Command frontmatter, XML blocks, and raw markdown passthrough. Users can write `<Command>` components that emit YAML frontmatter, `<div name="x">` that becomes `<x>`, and `<Markdown>` for raw content passthrough.

</domain>

<decisions>
## Implementation Decisions

### Command props mapping
- Arrays serialize as YAML block style (one item per line, not flow style)
- Booleans always included in output (both true and false explicitly shown)
- Standard prop set only: name, description, allowedTools — matches Claude Code spec
- Children become Markdown body below frontmatter (`---\nfrontmatter\n---\ncontent`)

### XML block naming
- Name prop is optional — if missing, output as `<div>...</div>` unchanged
- Additional attributes pass through: `<div name="x" id="y">` → `<x id="y">`
- Self-closing divs emit empty tags: `<div name="break" />` → `<break></break>`
- Strict validation on name value — error on invalid XML tag names (spaces, special chars)

### Markdown passthrough
- Explicit `<Markdown>` component triggers passthrough behavior
- Trim boundaries — strip leading/trailing whitespace, preserve internal
- JSX expressions allowed: `<Markdown>{variable}</Markdown>` for transpile-time dynamic content
- Empty/whitespace-only content outputs blank line (preserves spacing intent)

### Error behavior
- Missing required Command props (name, description) throws error — build fails
- Unknown tool names in allowedTools pass through — no validation (user knows their tools)
- Invalid XML tag names include source location: "Invalid tag name 'has spaces' at line 15, column 3"

### Claude's Discretion
- Error collection strategy (fail fast vs collect all) — pick based on implementation complexity

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-full-element-coverage*
*Context gathered: 2026-01-21*
