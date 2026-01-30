---
phase: 20-module-restructure
plan: 01
subsystem: architecture
tags: [module-organization, typescript, primitives, workflow, jsx-components]

# Dependency graph
requires:
  - phase: v1.8 (19-scoped-state-skills)
    provides: Complete component set in jsx.ts
provides:
  - primitives/ directory with markdown, variables, and control components
  - workflow/ directory with Command and organized workflow components
  - Barrel exports (index.ts) in each workflow subdirectory
  - NodeNext .js extension pattern for all internal imports
  - sections/index.ts placeholder for Phase 22 semantic components
affects: [21-prop-normalization, 22-semantic-components, 23-parser-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "primitives/ for low-level reusable components (markdown, variables, control)"
    - "workflow/ for high-level domain components (Command, agents/, state/, skill/, mcp/)"
    - "Barrel exports via index.ts in each subdirectory"
    - "NodeNext .js extensions for all relative imports"

key-files:
  created:
    - src/primitives/markdown.ts
    - src/primitives/variables.ts
    - src/primitives/control.ts
    - src/workflow/Command.ts
    - src/workflow/agents/Agent.ts
    - src/workflow/agents/types.ts
    - src/workflow/agents/index.ts
    - src/workflow/state/State.ts
    - src/workflow/state/ReadState.ts
    - src/workflow/state/WriteState.ts
    - src/workflow/state/types.ts
    - src/workflow/state/index.ts
    - src/workflow/skill/Skill.ts
    - src/workflow/skill/index.ts
    - src/workflow/mcp/MCP.ts
    - src/workflow/mcp/index.ts
    - src/workflow/sections/index.ts
  modified: []

key-decisions:
  - "primitives/ uses lowercase filenames (markdown.ts, control.ts) to match html-like primitive naming"
  - "workflow/ uses PascalCase filenames (Command.ts, Agent.ts) to match React component convention"
  - "Command.ts placed at workflow/ level (not in subdirectory) as single top-level entry point"
  - "sections/index.ts created as placeholder with empty export for Phase 22"

patterns-established:
  - "primitives/ → low-level reusable components that don't know about workflow concepts"
  - "workflow/ → high-level domain components organized by concern (agents, state, skill, mcp)"
  - "Barrel exports enable clean imports: import { Agent } from './workflow/agents'"
  - "All imports use .js extension for NodeNext module resolution"

# Metrics
duration: 3m 24s
completed: 2026-01-26
---

# Phase 20 Plan 01: Module Restructure Summary

**Organized 17 component files into primitives/ and workflow/ directories with barrel exports and NodeNext .js extensions**

## Performance

- **Duration:** 3 min 24 sec
- **Started:** 2026-01-26T22:46:05Z
- **Completed:** 2026-01-26T22:49:29Z
- **Tasks:** 2
- **Files created:** 17

## Accomplishments
- Created primitives/ directory with markdown, variables, and control components
- Created workflow/ directory with Command and organized subdirectories (agents/, state/, skill/, mcp/, sections/)
- Established barrel export pattern with index.ts in each subdirectory
- Migrated all component code from jsx.ts with JSDoc comments preserved
- Ensured all imports use NodeNext .js extensions

## Task Commits

Each task was committed atomically:

1. **Task 1: Create primitives directory** - `3580111` (feat)
2. **Task 2: Create workflow directory** - `cc237a3` (feat)

## Files Created/Modified

### Primitives (3 files)
- `src/primitives/markdown.ts` - Markdown and XmlBlock components
- `src/primitives/variables.ts` - useVariable hook, Assign component, VariableRef type
- `src/primitives/control.ts` - If, Else components and shell test builders

### Workflow (14 files)
- `src/workflow/Command.ts` - Command component (top-level entry point)
- `src/workflow/agents/Agent.ts` - Agent, SpawnAgent, OnStatus components
- `src/workflow/agents/types.ts` - AgentStatus, BaseOutput, useOutput hook
- `src/workflow/agents/index.ts` - Agent system barrel exports
- `src/workflow/state/State.ts` - State, Operation components
- `src/workflow/state/ReadState.ts` - ReadState component
- `src/workflow/state/WriteState.ts` - WriteState component
- `src/workflow/state/types.ts` - StateRef type, useStateRef hook
- `src/workflow/state/index.ts` - State system barrel exports
- `src/workflow/skill/Skill.ts` - Skill, SkillFile, SkillStatic components
- `src/workflow/skill/index.ts` - Skill system barrel exports
- `src/workflow/mcp/MCP.ts` - MCPServer, MCPStdioServer, MCPHTTPServer, MCPConfig components
- `src/workflow/mcp/index.ts` - MCP system barrel exports
- `src/workflow/sections/index.ts` - Empty placeholder for Phase 22

## Decisions Made

1. **Lowercase filenames for primitives**: Used markdown.ts, variables.ts, control.ts to match html-like primitive naming convention
2. **PascalCase filenames for workflow**: Used Command.ts, Agent.ts, State.ts to match React component naming convention
3. **Command.ts placement**: Placed at workflow/ level (not in subdirectory) as it's the single top-level entry point for commands
4. **Barrel exports**: Created index.ts in each subdirectory to enable clean imports
5. **sections/ placeholder**: Created with empty export to establish structure for Phase 22 semantic components

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Directory structure ready for Plan 02 (jsx.ts rewrite to re-export from new locations)
- Build will fail until jsx.ts is updated (expected per plan notes)
- Clean module organization enables Phase 22 semantic components to be placed in sections/
- Barrel exports establish clean import patterns for consumer code

---
*Phase: 20-module-restructure*
*Completed: 2026-01-26*
