---
phase: 16-skill-component
plan: 01
subsystem: ir
tags: [skill, ir, nodes, jsx, types]

# Dependency graph
requires:
  - phase: 14-agent-output-schema
    provides: AgentDocumentNode pattern for document nodes
provides:
  - SkillDocumentNode, SkillFrontmatterNode, SkillFileNode, SkillStaticNode IR types
  - Skill, SkillFile, SkillStatic JSX component exports
affects: [16-02, 16-03, 16-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-file document node (files + statics arrays)
    - Kebab-case YAML mapping for frontmatter

key-files:
  created: []
  modified:
    - src/ir/nodes.ts
    - src/jsx.ts

key-decisions:
  - "SkillDocumentNode has separate arrays for files and statics (not mixed children)"
  - "SkillFrontmatterNode uses camelCase props, emitter will map to kebab-case YAML"

patterns-established:
  - "Skill document structure: frontmatter + children (SKILL.md body) + files + statics"
  - "SkillFile/SkillStatic as block-level children, not inline"

# Metrics
duration: 2min
completed: 2026-01-22
---

# Phase 16 Plan 01: IR and JSX Foundation Summary

**Skill IR node types and JSX component definitions for compile-time skill authoring**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-22T15:57:35Z
- **Completed:** 2026-01-22T15:59:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- SkillFrontmatterNode captures all skill-specific YAML fields (name, description, disableModelInvocation, userInvocable, allowedTools, argumentHint, model, context, agent)
- SkillFileNode and SkillStaticNode for generated and static files respectively
- SkillDocumentNode as document root with frontmatter, children, files, and statics arrays
- Skill, SkillFile, SkillStatic components with typed props and JSDoc documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Skill IR node types to nodes.ts** - `42cad3b` (feat)
2. **Task 2: Add Skill component exports to jsx.ts** - `115078f` (feat)

## Files Created/Modified

- `src/ir/nodes.ts` - Added SkillFrontmatterNode, SkillFileNode, SkillStaticNode, SkillDocumentNode types; updated IRNode union
- `src/jsx.ts` - Added SkillProps, SkillFileProps, SkillStaticProps interfaces; added Skill, SkillFile, SkillStatic component stubs

## Decisions Made

1. **Separate arrays for files and statics:** SkillDocumentNode uses `files: SkillFileNode[]` and `statics: SkillStaticNode[]` rather than mixing them in children, enabling distinct handling during emit phase
2. **CamelCase props to kebab-case YAML:** SkillFrontmatterNode uses TypeScript camelCase (e.g., `disableModelInvocation`), mapping to YAML kebab-case (`disable-model-invocation`) will happen in emitter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- IR types ready for transformer to parse `<Skill>`, `<SkillFile>`, `<SkillStatic>` JSX elements
- JSX components ready for use in TSX files (compile-time stubs)
- Ready for 16-02: Skill transformer implementation

---
*Phase: 16-skill-component*
*Completed: 2026-01-22*
