# Phase 20: Module Restructure - Context

**Gathered:** 2026-01-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Split jsx.ts (1044 lines) into organized `primitives/` and `workflow/` directories with clean re-exports.

**Core philosophy:**
- **primitives/** = Complete markdown building blocks — users can create any markdown output with just primitives
- **workflow/** = Framework helpers for agentic flows — Command, Agent, State, Skill patterns that users compose to build their own automation

All existing imports must continue to work (no breaking changes).

</domain>

<decisions>
## Implementation Decisions

### Component Grouping
- **Criterion:** Low-level vs high-level
  - primitives = basic building blocks (Markdown, XmlBlock, variables, control flow)
  - workflow = composed components (Command, Agent, State, Skill)
- **Variables (useVariable, Assign):** primitives/ — they're basic tools
- **Control flow (If, Else, Loop):** primitives/ — control flow building blocks
- **SpawnAgent, OnStatus:** Same file/location as Agent component

### Directory Structure
- **Depth:** Flat at primitives/, nested subdirs at workflow/
- **workflow/ structure:**
  - `workflow/command.ts` — Command stays flat at top level
  - `workflow/agents/` — Agent, SpawnAgent, OnStatus
  - `workflow/state/` — State components
  - `workflow/skill/` — Skill components
  - `workflow/sections/` — Empty, ready for Phase 22 semantic components
- Each subdirectory has its own index.ts

### Re-export Strategy
- **Pattern:** Barrel exports (`export * from`)
- **Entry point:** jsx.ts re-exports from primitives/ and workflow/
- **Subdirectory index.ts:** Yes, all subdirs have index.ts for clean imports
- **Subpath imports:** No — all imports through jsx.ts only (single entry point)

### File Naming
- **primitives/:** Lowercase, simplified names (html-like)
  - `markdown.ts`, `xml.ts`, `variables.ts`, `control.ts`
  - Short names where meaning is clear
- **workflow/:** PascalCase (React convention)
  - `Command.ts`, `Agent.ts`, `State.ts`, `Skill.ts`
- **Hooks:** With their domain (useVariable in variables.ts, useOutput with output, useStateRef with state)
- **index.ts files:** Re-export only, no component code

### Claude's Discretion
- Exact file names for primitives (aim for shortest clear name)
- Type re-export strategy (with components or separate)
- Internal organization within each file

</decisions>

<specifics>
## Specific Ideas

- primitives should feel like HTML elements — lowercase, simple names
- workflow components feel like React components — PascalCase
- The split enables users to: (1) use just primitives for raw markdown, or (2) use workflow helpers as a framework for agentic flows

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 20-module-restructure*
*Context gathered: 2026-01-26*
