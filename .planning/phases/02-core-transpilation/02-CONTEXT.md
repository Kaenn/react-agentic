# Phase 2: Core Transpilation - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Parse TSX files and transform basic HTML-like elements (h1-h6, p, b, i, code, a, ul, ol, li, blockquote, pre, br, hr) to Markdown via IR. Text content preserved through parse->transform->emit pipeline. Nested elements render correctly.

</domain>

<decisions>
## Implementation Decisions

### Element mapping
- Headings use ATX style only (# symbols), no Setext
- Emphasis uses asterisks: **bold** and *italic*
- Code blocks use backtick fences (```)
- Bullet lists use dashes (- item)

### Whitespace handling
- Blank line between block elements (paragraphs, headings, lists)
- Normalize inline whitespace (collapse multiple spaces, trim edges)
- TSX line breaks inside paragraphs become Markdown line breaks (use `<br>` or trailing spaces)
- Trim all trailing whitespace from output lines

### Nesting rules
- Nested emphasis uses combined markers (***bold italic***)
- Inline code takes precedence over emphasis (`code` wins, emphasis stripped)
- Full formatting preservation inside list items
- Unlimited list nesting depth with proper indentation

### Error tolerance
- Unsupported elements: pass through raw HTML with warning
- Missing required attributes (e.g., <a> without href): fail with error
- Invalid nesting (e.g., <ul> in <p>): fail with error
- TypeScript type errors: strict — transpilation requires type-correct TSX

### Claude's Discretion
- Exact indentation width for nested lists
- How to handle edge cases in whitespace normalization
- Specific error message formatting

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-core-transpilation*
*Context gathered: 2026-01-20*
