# Phase 23: Context Access Patterns - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Enable render props pattern for context access in Command/Agent, explicit generics on workflow components, and a Step component for numbered workflow sections. Context types include relevant command/agent metadata available at compile time.

</domain>

<decisions>
## Implementation Decisions

### Context Shape
- **Command ctx fields:** name, description, skill (if invoked via skill), outputPath, sourcePath
- **Agent ctx fields:** Same as Command, plus tools and model if defined in the agent
- **Timing:** Runtime values (like build date) are resolved at build time and baked into output (static)
- **No shell placeholders:** Values are concrete in the markdown, not deferred to runtime

### Render Props Syntax
- **Both patterns supported:** Regular children still work; render props `(ctx) => ...` is additive for ctx access
- **Type inference:** ctx type is auto-inferred based on Command/Agent — no explicit annotation required
- **Flexible returns:** Render function can return JSX elements, raw strings, or fragments
- **Context propagation:** Inner components (SpawnAgent, If, etc.) can also accept render props with parent context flowing through

### Step Component Format
- **Variant-based rendering:** Single Step component with `variant` prop to switch between formats (heading, bold, xml)
- **Explicit numbering required:** `<Step number={1}>` always required — no auto-increment magic
- **Nesting allowed:** Steps can contain sub-steps (Step 1 → Step 1.1, 1.2)
- **Default variant:** Claude's discretion on which variant is default

### Generic Parameters
- **Scope:** Claude's discretion on which components get generics (If, Loop, Bash candidates)
- **Behavior:** Compile-time only — TypeScript catches type errors, no runtime validation
- **Loop<T>:** T represents the item type in the array being iterated
- **Type inference:** Infer from props when possible (e.g., Loop items={users} infers T from users type)

### Claude's Discretion
- Which components get explicit generic type parameters
- Compile-time vs runtime behavior of generics
- Default variant for Step component
- Implementation details of context propagation to nested components

</decisions>

<specifics>
## Specific Ideas

- Command and Agent have different ctx shapes (Agent includes tools/model)
- Build date and other runtime-ish values are static at build time, not shell placeholders
- Both regular children and render props children work — backwards compatible
- Step supports multiple output formats via variant prop (heading, bold, xml)
- Generics should follow TypeScript conventions: infer when possible, explicit when needed

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 23-context-access-patterns*
*Context gathered: 2026-01-26*
