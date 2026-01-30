# Feature Landscape: Agent Framework (v1.1)

**Domain:** TSX-to-Markdown Transpiler - Agent Framework Extension
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against GSD repository source files)

## Research Methodology

Features derived from analysis of:
- GSD `plan-phase.md` command (orchestrator pattern)
- GSD `gsd-phase-researcher.md` agent (agent structure)
- GSD `gsd-planner.md` agent (input/output contracts)
- GSD `gsd-executor.md` agent (execution pattern)
- GSD `execute-phase.md` command (Task() spawning)
- GSD `new-project.md` command (parallel agent spawning)
- 27 total commands and 11 agents in GSD repository

---

## Table Stakes

Features required for the Agent Framework to function. Missing = cannot match GSD format.

### Agent Component

| Feature | Why Required | Complexity | GSD Evidence |
|---------|--------------|------------|--------------|
| **Agent Frontmatter Generation** | GSD agents require YAML frontmatter with name, description, tools, color | Low | All 11 GSD agents have this exact structure |
| **`name` prop** | Agent identifier used in Task() spawning | Trivial | `name: gsd-phase-researcher` |
| **`description` prop** | Agent purpose, used in registry and documentation | Trivial | `description: "Researches how to implement..."` |
| **`tools` prop (string)** | Space-separated tool list in frontmatter | Low | `tools: "Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*"` |
| **`color` prop** | Terminal color for agent output identification | Trivial | `color: cyan` |
| **Role Section** | `<role>` XML block containing agent responsibilities | Low | Every GSD agent has this section |
| **Section Structure** | Agents use markdown sections with specific naming | Low | Methodology, Execution Flow, Structured Returns |

### SpawnAgent Component (Command-side)

| Feature | Why Required | Complexity | GSD Evidence |
|---------|--------------|------------|--------------|
| **Task() Syntax Generation** | Commands spawn agents via Task() calls | Medium | `Task(prompt=..., subagent_type="gsd-planner", model=...)` |
| **`agent` prop** | Reference to agent being spawned | Low | `subagent_type="gsd-phase-researcher"` |
| **`model` prop** | Model to use (supports variables) | Low | `model="{researcher_model}"` |
| **`description` prop** | Human-readable action description | Trivial | `description="Research phase requirements"` |
| **Inline Context Pattern** | Content passed via prompt, not @-references | Medium | GSD explicitly states "context does not cross Task() boundaries" |

### Input/Output Contracts

| Feature | Why Required | Complexity | GSD Evidence |
|---------|--------------|------------|--------------|
| **Structured Return Format** | Agents return specific markdown headers | Low | `## PLANNING COMPLETE`, `## RESEARCH BLOCKED` |
| **Return Signal Parsing** | Commands detect agent completion status | Medium | Orchestrators check for `## ISSUES FOUND`, etc. |
| **Context Section Generation** | `<planning_context>` style blocks with placeholders | Low | Inline content via `{variable}` substitution |

---

## Differentiators

Features that provide TypeScript value beyond basic GSD format matching.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Typed Agent Interface** | Agent defines input/output TypeScript interface, Command imports it | High | Core v1.1 differentiator - type safety across Task() boundary |
| **Compile-time Contract Validation** | SpawnAgent verifies input props match Agent's expected interface | High | TypeScript catches mismatched context at build time |
| **Agent Registry Type** | TypeScript union of all agent names for `agent` prop autocomplete | Medium | Enables IDE autocomplete for valid agent names |
| **Model Profile Types** | Type-safe model variable references (`{researcher_model}`) | Medium | Prevents typos in model variable names |
| **Return Signal Types** | TypeScript enum/union for valid return headers | Low | Autocomplete for `PLANNING COMPLETE`, etc. |
| **Context Placeholder Validation** | Type-check that all `{variable}` placeholders are provided | High | Catches missing context variables at compile time |

### Differentiator Rationale

**Typed Agent Interface**: This is the core value proposition of v1.1. GSD agents have implicit contracts - the orchestrator "knows" what context gsd-planner needs, but it's not enforced. With TypeScript:

```tsx
// Agent defines its contract
interface PlannerInput {
  phase: string;
  stateContent: string;
  roadmapContent: string;
  researchContent?: string;
}

// Command must provide matching props - TypeScript error if missing
<SpawnAgent<PlannerInput>
  agent="gsd-planner"
  input={{ phase, stateContent, roadmapContent }}
  // Error: researchContent is optional, but phase is required
/>
```

**Compile-time Contract Validation**: The biggest pain point in GSD is implicit contracts. If an orchestrator forgets to pass `stateContent` to gsd-planner, it fails at runtime. With TypeScript, this fails at build time.

---

## Anti-Features

Features to explicitly NOT build in v1.1. Scope discipline.

| Anti-Feature | Why Avoid | What to Do Instead | Defer To |
|--------------|-----------|-------------------|----------|
| **Runtime Agent Execution** | We transpile to markdown, not execute agents | Static Task() syntax generation | Never |
| **Agent Discovery/Loading** | Over-engineering - agents are static files | Manual import of agent components | v2+ |
| **Dynamic Task() Generation** | Can't evaluate at transpile time | Require static agent references | Never |
| **Parallel Task() Orchestration** | Complex runtime concern, not transpilation | Document pattern in output, user implements | Never |
| **Agent State Management** | Runtime concern, not transpilation | Document in agent markdown | Never |
| **Return Signal Parsing Logic** | Runtime orchestrator logic | Generate markdown with signal patterns | Never |
| **Context Variable Interpolation** | Runtime concern - we generate template syntax | Output `{variable}` literally in markdown | Never |
| **MCP Tool Validation** | MCP tools vary by environment | Accept any string for tools | v2+ |
| **Agent Dependency Graph** | Complex analysis, unclear value | Document dependencies in markdown | v2+ |
| **Multi-Agent Composition** | Agents don't compose, commands spawn them | Single SpawnAgent per call | Never |

### Anti-Feature Rationale

**Runtime Agent Execution**: This is a transpiler. It converts TSX to markdown. The markdown is then consumed by Claude Code which does the actual agent spawning. We generate the Task() syntax, we don't execute it.

**Dynamic Task() Generation**: `<SpawnAgent agent={getNextAgent()} />` can't be resolved at transpile time. Require static: `<SpawnAgent agent="gsd-planner" />`.

**Context Variable Interpolation**: GSD uses `{phase}`, `{state_content}` as placeholders that the orchestrator fills at runtime. We output these literally - we don't evaluate them. The TypeScript types ensure the variables are defined, but interpolation happens at runtime.

---

## GSD Format Specification

Based on actual GSD repository files (HIGH confidence - verified against source).

### Agent Frontmatter Format

```yaml
---
name: gsd-phase-researcher
description: "Researches how to implement a phase before planning. Produces RESEARCH.md consumed by gsd-planner."
tools: "Read, Write, Bash, Grep, Glob, WebSearch, WebFetch, mcp__context7__*"
color: cyan
---
```

**Fields:**
- `name`: Agent identifier (kebab-case, often prefixed with `gsd-`)
- `description`: One-sentence purpose, may mention inputs/outputs
- `tools`: Space-separated string of allowed tools (NOT array like Command)
- `color`: Terminal color (cyan, yellow, green, red, etc.)

### Command Frontmatter Format (existing)

```yaml
---
name: gsd:plan-phase
description: Create executable phase plans with integrated research and verification
allowed-tools:
  - Read
  - Bash
  - Write
  - Task
  - AskUserQuestion
---
```

**Key Difference**: Commands use `allowed-tools` (array), Agents use `tools` (string).

### Task() Syntax

```
Task(
  prompt="<planning_context>
**Phase:** {phase_number}
**Project State:** {state_content}
**Roadmap:** {roadmap_content}
</planning_context>

Your task: Create PLAN.md files for this phase...",
  subagent_type="gsd-planner",
  model="{planner_model}",
  description="Create execution plans for phase"
)
```

**Fields:**
- `prompt`: Inline string with context (NOT @-references)
- `subagent_type`: Agent name to spawn
- `model`: Model variable or literal
- `description`: Human-readable action description

### Structured Return Signals

GSD agents return completion signals as markdown headers:

| Signal | Meaning | Used By |
|--------|---------|---------|
| `## RESEARCH COMPLETE` | Research finished successfully | gsd-phase-researcher, gsd-project-researcher |
| `## RESEARCH BLOCKED` | Cannot proceed, needs user input | gsd-phase-researcher |
| `## PLANNING COMPLETE` | Plans created successfully | gsd-planner |
| `## ISSUES FOUND` | Verification failed, needs revision | gsd-plan-checker |
| `## VERIFICATION PASSED` | All quality gates passed | gsd-plan-checker, gsd-verifier |
| `## CHECKPOINT REACHED` | Paused for user decision | gsd-executor |
| `## EXECUTION COMPLETE` | Task finished | gsd-executor |

### Context Passing Pattern

GSD explicitly states: **"Content cannot cross Task() boundaries using @ syntax."**

Instead:
1. Read files into variables at orchestrator level
2. Inline content directly into prompt templates
3. Fill placeholders with actual file contents before spawning

```tsx
// Wrong (won't work across Task boundary)
<SpawnAgent agent="gsd-planner" context="@.planning/STATE.md" />

// Correct (inline the content)
const stateContent = await readFile('.planning/STATE.md');
<SpawnAgent
  agent="gsd-planner"
  prompt={`<planning_context>
**Project State:** ${stateContent}
</planning_context>`}
/>
```

---

## Feature Dependencies

```
                    +-------------------+
                    |  Agent Component  |
                    |  (frontmatter)    |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
    +---------v---------+         +---------v---------+
    | Agent Interface   |         | Agent Sections    |
    | Definition        |         | (<role>, etc.)    |
    +---------+---------+         +-------------------+
              |
              |  (imported by)
              |
    +---------v---------+
    | SpawnAgent        |
    | Component         |
    +---------+---------+
              |
    +---------v---------+
    | Task() Syntax     |
    | Generation        |
    +-------------------+
```

### Dependency Details

| Feature | Depends On | Blocks |
|---------|------------|--------|
| Agent Frontmatter | None (new node type) | Agent Interface |
| Agent Interface Definition | TypeScript types | SpawnAgent validation |
| Agent Sections | Existing section handling | None |
| SpawnAgent Component | Agent exists | Task() generation |
| Task() Syntax Generation | SpawnAgent, template handling | None |
| Typed Agent Interface | Both Agent and SpawnAgent | Contract validation |
| Return Signal Types | Agent implementation | None (optional) |

### Critical Path for v1.1

1. **Agent Frontmatter** - New YAML structure (name, description, tools, color)
2. **Agent Component** - TSX component with typed props
3. **Agent Interface Export** - TypeScript interface from Agent file
4. **SpawnAgent Component** - TSX component for Task() generation
5. **Task() Syntax Generation** - Emit GSD-format Task() calls
6. **Contract Validation** - TypeScript checks SpawnAgent input vs Agent interface

---

## Complexity Assessment

| Feature | Complexity | Rationale |
|---------|------------|-----------|
| Agent Frontmatter | Low | Similar to existing Command frontmatter, different fields |
| Agent Component | Low | New component type, follows Command pattern |
| Tools String Format | Low | Simple string emission vs array |
| SpawnAgent Component | Medium | New emission pattern (Task() syntax) |
| Context Inlining | Medium | Template literal handling with placeholders |
| Agent Interface Export | High | Cross-file type extraction and export |
| Contract Validation | High | TypeScript generic constraint checking |
| Return Signal Types | Low | Simple string union type |

### Implementation Order Recommendation

**Phase 1: Agent Basics (Low complexity)**
1. AgentProps interface
2. Agent frontmatter IR node
3. Agent frontmatter emission
4. Agent component parsing

**Phase 2: SpawnAgent Basics (Medium complexity)**
5. SpawnAgent component
6. Task() syntax generation
7. Prompt template handling

**Phase 3: Type Safety (High complexity)**
8. Agent interface extraction
9. SpawnAgent generic typing
10. Cross-file contract validation

---

## MVP Recommendation

### Must Have (v1.1 Core)

1. **Agent Component** with frontmatter (name, description, tools, color)
2. **SpawnAgent Component** generating Task() syntax
3. **Inline Prompt Support** with `{variable}` placeholders
4. **Output matches GSD format exactly**

### Should Have (v1.1 if time permits)

5. **TypeScript interface export from Agent**
6. **SpawnAgent generic typing** for contract validation
7. **Return signal type definitions**

### Defer to v1.2+

- Agent discovery/registry
- Multi-agent orchestration patterns
- MCP tool validation
- Advanced context manipulation

### Success Criteria

v1.1 is successful when this TSX:

```tsx
// agents/phase-researcher.tsx
export default function PhaseResearcher() {
  return (
    <Agent
      name="gsd-phase-researcher"
      description="Researches phase before planning"
      tools="Read Write Bash Grep Glob WebSearch WebFetch"
      color="cyan"
    >
      <role>
        <p>You are a phase researcher...</p>
      </role>
    </Agent>
  );
}

// commands/plan-phase.tsx
import PhaseResearcher from '../agents/phase-researcher';

export default function PlanPhase() {
  return (
    <Command name="gsd:plan-phase" description="Plan a phase">
      <SpawnAgent
        agent="gsd-phase-researcher"
        model="{researcher_model}"
        description="Research phase requirements"
        prompt={`<planning_context>
**Phase:** {phase_number}
</planning_context>`}
      />
    </Command>
  );
}
```

Produces this markdown for agent:

```markdown
---
name: gsd-phase-researcher
description: Researches phase before planning
tools: "Read Write Bash Grep Glob WebSearch WebFetch"
color: cyan
---

<role>
You are a phase researcher...
</role>
```

And this for command:

```markdown
---
name: gsd:plan-phase
description: Plan a phase
allowed-tools:
  - Task
---

Task(
  prompt="<planning_context>
**Phase:** {phase_number}
</planning_context>",
  subagent_type="gsd-phase-researcher",
  model="{researcher_model}",
  description="Research phase requirements"
)
```

---

## Sources

### Primary (HIGH Confidence)

- GSD `gsd-phase-researcher.md` - Agent structure, frontmatter format, structured returns
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/agents/gsd-phase-researcher.md
- GSD `gsd-planner.md` - Input/output contracts, PLAN.md format
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/agents/gsd-planner.md
- GSD `gsd-executor.md` - Execution patterns, continuation handling
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/agents/gsd-executor.md
- GSD `plan-phase.md` - Task() spawning, context passing, return signal handling
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/commands/gsd/plan-phase.md
- GSD `execute-phase.md` - Parallel spawning, inline context pattern
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/commands/gsd/execute-phase.md
- GSD `new-project.md` - Multi-researcher spawning pattern
  - URL: https://github.com/glittercowboy/get-shit-done/blob/main/commands/gsd/new-project.md

### Repository Overview

- GSD repository: 27 commands, 11 agents
- URL: https://github.com/glittercowboy/get-shit-done

### Existing react-agentic (Project Context)

- `/Users/glenninizan/workspace/react-agentic/src/jsx.ts` - Current Command/Markdown/XmlBlock components
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - IR node types
- `/Users/glenninizan/workspace/react-agentic/.planning/PROJECT.md` - v1.1 requirements
