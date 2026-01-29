# MCP Apps Integration Analysis

Analysis of integrating MCP Apps into the react-agentic framework.

## Executive Summary

**Verdict: Strong Fit — Natural Extension of the Framework**

After analyzing GSD (Get Shit Done), the inspiration for this project, MCP Apps are not just complementary—they're a **high-value addition** that would dramatically improve the user experience for complex workflows.

| Aspect | react-agentic Today | With MCP Apps |
|--------|---------------------|---------------|
| **Target Host** | Claude Code CLI | CLI + Claude Desktop/Web |
| **Output Format** | Markdown files | Markdown + Interactive UI |
| **Progress View** | Text-based (`/gsd:progress`) | Visual dashboard |
| **Requirements** | AskUserQuestion per category | Interactive scoping UI |
| **Roadmap** | Markdown table | Visual timeline/kanban |

**Why this matters for your mission:**
Companies with unique expertise need workflows that feel professional. A visual project dashboard that shows phases, progress, and blockers is far more impressive than ASCII progress bars.

## What Are MCP Apps?

MCP Apps allow MCP servers to return **interactive HTML interfaces** that render inside MCP hosts (Claude Desktop, Claude Web, VS Code). Key characteristics:

1. **UI Resource Pattern**: Tools declare a `_meta.ui.resourceUri` pointing to a `ui://` resource
2. **Sandboxed Rendering**: HTML renders in an isolated iframe with controlled capabilities
3. **Bidirectional Communication**: Apps can call MCP tools, hosts can push data to apps
4. **Security Model**: Strong isolation via iframe sandbox, postMessage communication

```
┌─────────────────────────────────────────────────────────┐
│  Claude Desktop / Claude Web                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Conversation                                       ││
│  │  ────────────────                                   ││
│  │  User: "Show me analytics"                          ││
│  │  Claude: [Tool call: get-analytics]                 ││
│  │  ┌─────────────────────────────────────────────┐   ││
│  │  │  MCP App (sandboxed iframe)                 │   ││
│  │  │  ┌──────────────────────────────────────┐  │   ││
│  │  │  │  Interactive Chart                   │  │   ││
│  │  │  │  [Filters] [Date Range] [Export]     │  │   ││
│  │  │  └──────────────────────────────────────┘  │   ││
│  │  └─────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Concrete Use Cases from GSD

After reviewing GSD's commands, these are **high-impact opportunities** for MCP Apps:

### 1. Project Dashboard (`/gsd:progress` → Visual)

**Current (text):**
```
# My Project

**Progress:** [████████░░] 8/10 plans complete
**Profile:** balanced

## Current Position
Phase 3 of 5: core-features
Plan 2 of 4: IN_PROGRESS
```

**With MCP App:**
- Interactive progress wheel with phase breakdown
- Click phases to expand plans
- Color-coded status (green/yellow/red)
- Quick actions: "Execute Next", "View Blockers"

### 2. Requirements Scoping UI

**Current (AskUserQuestion per category):**
```
questions: [
  { header: "Auth", question: "Which features?", multiSelect: true, options: [...] },
  { header: "Content", question: "Which features?", multiSelect: true, options: [...] },
  // ... one question per category, sequential
]
```

**With MCP App:**
- All categories visible at once
- Drag-and-drop between v1/v2/out-of-scope
- Real-time requirement count
- Dependency highlighting

### 3. Roadmap Visualization

**Current (Markdown table):**
```markdown
| # | Phase | Goal | Requirements |
|---|-------|------|--------------|
| 1 | Foundation | Setup project | AUTH-01, AUTH-02 |
| 2 | Core | Build features | CONT-01, CONT-02 |
```

**With MCP App:**
- Kanban board or Gantt chart
- Drag to reorder phases
- Click to expand phase details
- Visual requirement mapping

### 4. Debug Session Tracker (`/gsd:debug`)

**Current (STATE.md + Markdown files):**
```
.planning/debug/login-fails.md
- Hypothesis 1: REJECTED
- Hypothesis 2: TESTING
- Evidence: [list]
```

**With MCP App:**
- Visual hypothesis tree
- Evidence linking
- Confidence meters
- Quick "Mark Resolved" action

### 5. Research Summary Display

**Current (5 separate Markdown files):**
```
.planning/research/
├── STACK.md
├── FEATURES.md
├── ARCHITECTURE.md
├── PITFALLS.md
└── SUMMARY.md
```

**With MCP App:**
- Tabbed interface for each research dimension
- Collapsible sections
- Search within research
- Link to official docs

---

## Where react-agentic Fits Today

react-agentic is a **TSX-to-Markdown compiler** for authoring Claude Code commands and agents:

```
┌─────────────────────────────────────────────────────────┐
│  react-agentic Pipeline                                  │
│                                                          │
│  my-command.tsx                                          │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────┐    ┌─────────┐    ┌──────────┐            │
│  │  Parse  │───►│   IR    │───►│  Emit    │            │
│  │   TSX   │    │  Nodes  │    │ Markdown │            │
│  └─────────┘    └─────────┘    └──────────┘            │
│                                      │                   │
│                                      ▼                   │
│                          .claude/commands/my-command.md  │
└─────────────────────────────────────────────────────────┘
```

**Key insight**: react-agentic has no runtime—it generates static markdown prompts.

## Integration Possibilities

### Option A: New Output Target (Recommended)

Add a new emission path that generates MCP App servers alongside markdown:

```
my-dashboard.tsx
       │
       ▼
  ┌─────────┐    ┌─────────┐    ┌──────────────────────┐
  │  Parse  │───►│   IR    │───►│  Emit (dispatch)     │
  │   TSX   │    │  Nodes  │    │   ├─ Markdown        │
  └─────────┘    └─────────┘    │   └─ MCP App Server  │
                                └──────────────────────┘
                                       │
                       ┌───────────────┴───────────────┐
                       ▼                               ▼
          .claude/commands/                  .mcp-apps/my-dashboard/
          my-dashboard.md                    ├─ server.ts
                                             ├─ mcp-app.html
                                             └─ package.json
```

**New component: `<McpApp>`**

```tsx
import { McpApp, AppView, AppTool } from 'react-agentic/mcp-apps';

export default function Dashboard() {
  return (
    <McpApp
      name="analytics-dashboard"
      description="Interactive analytics dashboard"
    >
      {/* Define MCP Tools */}
      <AppTool
        name="get-metrics"
        description="Fetch dashboard metrics"
        inputSchema={{ timeRange: 'string' }}
      />

      {/* Define the UI */}
      <AppView framework="react">
        <DashboardUI />
      </AppView>
    </McpApp>
  );
}
```

### Option B: Hybrid Command + App

Allow commands to reference MCP Apps for rich output:

```tsx
import { Command, SpawnAgent, McpAppResult } from 'react-agentic';

export default function AnalyzeCommand() {
  return (
    <Command name="analyze" description="Analyze and visualize data">
      <h2>Process</h2>
      <p>Analyze the data, then display results in the dashboard.</p>

      {/* Traditional agent spawning */}
      <SpawnAgent
        agent="data-analyzer"
        model="haiku"
        description="Analyze the dataset"
      />

      {/* Reference MCP App for visualization */}
      <McpAppResult
        app="analytics-dashboard"
        inputFrom="data-analyzer.result"
      />
    </Command>
  );
}
```

### Option C: Embedded UI Components

Define reusable UI components that emit to both markdown (as instructions) and MCP App HTML:

```tsx
import { Dual, ForMarkdown, ForMcpApp } from 'react-agentic/dual';

export function DataTable({ data }) {
  return (
    <Dual>
      <ForMarkdown>
        <Table headers={['Name', 'Value']} rows={data} />
      </ForMarkdown>
      <ForMcpApp>
        <InteractiveTable data={data} sortable filterable />
      </ForMcpApp>
    </Dual>
  );
}
```

## Architecture for Integration

### New IR Nodes

```typescript
// src/ir/mcp-app-nodes.ts

interface McpAppNode extends BaseNode {
  kind: 'mcpApp';
  name: string;
  description: string;
  tools: McpAppToolNode[];
  view: McpAppViewNode;
}

interface McpAppToolNode extends BaseNode {
  kind: 'mcpAppTool';
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler?: string; // TypeScript code for handler
}

interface McpAppViewNode extends BaseNode {
  kind: 'mcpAppView';
  framework: 'react' | 'vue' | 'vanilla';
  component: string; // Component source code
}
```

### New Emitter

```typescript
// src/emitter/mcp-app-emitter.ts

class McpAppEmitter {
  emit(node: McpAppNode): McpAppOutput {
    return {
      serverTs: this.emitServer(node),
      appHtml: this.emitHtml(node),
      appTs: this.emitAppLogic(node),
      packageJson: this.emitPackageJson(node),
      viteConfig: this.emitViteConfig(node),
    };
  }

  private emitServer(node: McpAppNode): string {
    // Generate server.ts with registerAppTool/registerAppResource
  }

  private emitHtml(node: McpAppNode): string {
    // Generate mcp-app.html entry point
  }

  private emitAppLogic(node: McpAppNode): string {
    // Generate src/mcp-app.ts with App class usage
  }
}
```

### Build Command Extension

```bash
# Existing: builds markdown commands/agents
node dist/cli/index.js build "src/app/**/*.tsx"

# New: builds MCP Apps
node dist/cli/index.js build:mcp-app "src/mcp-apps/**/*.tsx"

# Combined: builds everything
node dist/cli/index.js build:all "src/**/*.tsx"
```

## Benefits of Integration

### 1. Unified Authoring Experience

Same TSX patterns for prompts and UIs:

```tsx
// Prompt (existing)
<Command name="review">
  <XmlBlock name="process">Review the code carefully</XmlBlock>
</Command>

// MCP App (new)
<McpApp name="review-dashboard">
  <AppView>
    <ReviewUI />
  </AppView>
</McpApp>
```

### 2. Type-Safe Tool Definitions

Leverage TypeScript for MCP tool schemas:

```tsx
interface MetricsInput {
  timeRange: 'day' | 'week' | 'month';
  metrics: string[];
}

<AppTool<MetricsInput>
  name="get-metrics"
  description="Fetch metrics for the given time range"
  // TypeScript validates the handler signature
  handler={async (input: MetricsInput) => {
    return fetchMetrics(input);
  }}
/>
```

### 3. Shared Components

Use the same component library for both targets:

```tsx
// Renders as markdown table OR interactive table
<DataDisplay data={results} />
```

### 4. Coordinated Workflows

Commands can spawn agents AND display results in MCP Apps:

```tsx
<Command name="analyze">
  <SpawnAgent agent="analyzer" />
  <McpAppResult app="visualizer" />
</Command>
```

## Challenges and Considerations

### 1. Terminal Backward Compatibility (Critical)

**MCP Apps do NOT work in terminal (Claude Code CLI).** They only work in GUI hosts that can render iframes.

| Host | Commands (Markdown) | MCP Apps (HTML) |
|------|---------------------|-----------------|
| Claude Code CLI (terminal) | ✓ | ✗ |
| Claude Desktop | ✓ | ✓ |
| Claude Web | ✓ | ✓ |
| VS Code | ✓ | ✓ |

**This means: Every MCP App MUST have a markdown fallback.**

```tsx
<Command name="gsd:progress" description="Show progress">

  {/* REQUIRED: Terminal fallback (always works) */}
  <h2>Progress</h2>
  <p>Phase 3 of 5: core-features</p>
  <p>Progress: [████████░░] 80%</p>
  <p>Next: /gsd:execute-phase 3</p>

  {/* OPTIONAL: Rich UI (only in Claude Desktop/Web) */}
  <McpAppView name="dashboard">
    <InteractiveDashboard />
  </McpAppView>

</Command>
```

**Output behavior:**
- **Terminal users** → See markdown text (full functionality)
- **Desktop users** → See interactive dashboard (enhanced UX)

**Design principle:** MCP Apps are a **progressive enhancement**, not a replacement. The framework must enforce that every `<McpAppView>` has sibling markdown content as fallback.

### 2. Different Runtime Requirements

| Aspect | Markdown | MCP App |
|--------|----------|---------|
| Runtime | None | Node.js server + browser |
| Dependencies | None | @modelcontextprotocol/*, vite, express |
| Build | Simple emit | Vite bundle + server compile |
| Deployment | Copy file | Run server process |

### 2. Complexity Increase

Adding MCP Apps would significantly expand the project scope:
- New IR node types
- New emitter for server/client code
- New CLI commands for building and serving
- Testing infrastructure for apps

### 3. Host Compatibility

MCP Apps only work in compatible hosts:
- Claude Desktop
- Claude Web (with Pro/Team/Max plans)
- VS Code Insiders
- Some third-party hosts

Claude Code CLI does **not** support MCP Apps (text-only interface).

### 4. Learning Curve

Users would need to understand:
- MCP App architecture
- Tool registration patterns
- Bidirectional communication
- UI framework choices

## Recommendation

### Phase 1: Research Spike (Low Investment)

1. Create a manual MCP App example in the project
2. Test integration with Claude Desktop
3. Gather feedback on use cases

### Phase 2: Prototype Integration (Medium Investment)

1. Add `<McpApp>` component
2. Implement basic emitter for server + HTML
3. Single framework support (React or Vanilla)

### Phase 3: Full Integration (High Investment)

1. Multi-framework support
2. Type-safe tool handlers
3. Dual-mode components
4. Integrated dev server

## Revised Recommendation

After reviewing GSD's workflows, I'm changing my initial assessment.

### Why MCP Apps ARE a Good Idea

1. **Your workflows already generate rich structured data** — phases, requirements, progress, research — that's begging for visualization

2. **Companies want professional-looking tools** — A visual dashboard feels like enterprise software. ASCII progress bars feel like a terminal hack.

3. **Natural TSX fit** — You're already in React-land. Defining UI components in TSX is exactly what your users would expect.

4. **Competitive advantage** — Most Claude Code tools are text-only. Visual interfaces would differentiate react-agentic frameworks.

5. **Unified authoring** — Same TSX, same type-safety, just different output target.

### Proposed MVP: `<McpAppView>` Component

Start with a **read-only dashboard** that visualizes existing `.planning/` data:

```tsx
import { Command, McpAppView } from 'react-agentic';

export default function Progress() {
  return (
    <Command name="gsd:progress" description="Project progress dashboard">
      {/* Traditional markdown output for Claude Code CLI */}
      <h2>Progress</h2>
      <p>Checking project status...</p>

      {/* MCP App view for Claude Desktop/Web */}
      <McpAppView
        name="gsd-dashboard"
        dataSource=".planning/"  // Reads STATE.md, ROADMAP.md, etc.
      >
        <ProgressDashboard />
      </McpAppView>
    </Command>
  );
}
```

This would:
- Generate markdown command (works in Claude Code CLI)
- Generate MCP App server (works in Claude Desktop)
- Same TSX source, dual output

### Implementation Phases

| Phase | Scope | Effort |
|-------|-------|--------|
| **1. Spike** | Manual MCP App example reading `.planning/` | 1-2 days |
| **2. Read-only Dashboard** | `<McpAppView>` for progress visualization | 1 week |
| **3. Interactive Forms** | Requirements scoping, config UI | 2 weeks |
| **4. Full Integration** | Roadmap editor, debug tracker | 1 month |

## Conclusion

**Yes, MCP Apps are a good idea for this framework.**

They're not a distraction from your mission—they're an accelerant. Companies building AI workflows with react-agentic would get:

1. **Type-safe prompt authoring** (existing)
2. **Type-safe UI components** (new)
3. **Professional visual interfaces** (new)
4. **Works in CLI AND desktop** (new)

The key insight: GSD already does the hard work of structuring project data. MCP Apps just visualize it.

### Critical Design Constraint

**Terminal backward compatibility is non-negotiable.** The framework must:

1. **Require markdown fallback** — Every `<McpAppView>` must have sibling markdown content
2. **Validate at build time** — Fail build if MCP App has no fallback
3. **Document the pattern** — Make progressive enhancement the default mental model

```
Terminal User Experience    Desktop User Experience
========================    =======================
Full functionality          Full functionality
Text-based output           + Interactive UI
No degradation              Enhanced visualization
```

MCP Apps are **additive**, never replacing core text functionality.

### Next Steps

1. **Spike**: Build a manual MCP App that reads `.planning/` and shows a progress dashboard
2. **Validate**: Test in Claude Desktop, confirm the value
3. **Design**: Define `<McpAppView>` component with mandatory fallback pattern
4. **Implement**: Add to framework with build-time validation

## References

- [MCP Apps Documentation](https://modelcontextprotocol.io/docs/extensions/apps)
- [MCP Apps GitHub](https://github.com/modelcontextprotocol/ext-apps)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Apps API Reference](https://modelcontextprotocol.github.io/ext-apps/api/)
