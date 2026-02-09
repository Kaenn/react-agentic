# Claude Code Swarm TSX Grammar Reference

A declarative grammar for defining and documenting Claude Code swarm orchestrations.

---

## Quick Reference

| Component | Purpose | Output |
|-----------|---------|--------|
| `<Workflow>` | Top-level workflow container | H1 + metadata |
| `<Team>` | Team definition | H2 + spawnTeam code |
| `<Teammate>` | Team member definition | H4 + Task spawn code |
| `<Agent>` | Agent instance documentation | H3 + property table |
| `<TaskDef>` | Task definition | Bullet + TaskCreate code |
| `<TaskPipeline>` | Sequential tasks container | Mermaid + children |
| `<TaskPool>` | Independent tasks pool | Table + TaskCreate code |
| `<Message>` | Agent-to-agent message | Code block |
| `<Broadcast>` | Broadcast to all | Code block + warning |
| `<Pattern>` | Pattern documentation | H2 + description |
| `<ParallelWorkers>` | Parallel spawn pattern | Mermaid + code |
| `<Swarm>` | Self-organizing swarm | Mermaid + code |
| `<ShutdownSequence>` | Graceful shutdown | Shutdown code |
| `<Lifecycle>` | Workflow lifecycle | Mermaid + steps |
| `<Note>` | Callout block | Blockquote |
| `<CodeBlock>` | Code block | Fenced code |
| `<Table>` | Data table | Markdown table |
| `<AgentTypeDef>` | Agent type docs | H3 + table |
| `<Backend>` | Backend type docs | H3 + pros/cons |

---

## Component Grammar

### Workflow Container

```tsx
<Workflow
  name="string"           // Workflow name (required)
  description="string"    // Brief description (required)
  team="string"           // Team name (required)
>
  {children}              // Team, patterns, lifecycle, etc.
</Workflow>
```

**Output:**
```markdown
# Workflow: {name}

> {description}

**Team:** `{team}`

---

{children}
```

---

### Team & Teammates

```tsx
<Team
  name="string"           // Team name (required)
  description="string"    // Optional description
>
  <Teammate ... />
  <Teammate ... />
</Team>
```

```tsx
<Teammate
  name="string"           // Teammate name (required)
  type="string"           // Agent type (required)
  prompt="string"         // Task prompt (required)
  model="haiku|sonnet|opus"  // Optional model
  background={true}       // Run in background (default: true)
/>
```

**Output:**
```markdown
## Team: {name}

> {description}

```javascript
Teammate({
  operation: "spawnTeam",
  team_name: "{name}"
})
```

### Members

#### {teammate.name}

```javascript
Task({
  team_name: "{team}",
  name: "{name}",
  subagent_type: "{type}",
  prompt: `{prompt}`,
  run_in_background: true
})
```
```

---

### Task Definitions

```tsx
<TaskDef
  id="string"             // Optional task ID
  subject="string"        // Task subject (required)
  description="string"    // Task description (required)
  activeForm="string"     // Spinner text
  blockedBy={["1", "2"]}  // Dependency IDs
/>
```

```tsx
<TaskPipeline>
  <TaskDef id="1" subject="Step 1" ... />
  <TaskDef id="2" subject="Step 2" blockedBy={["1"]} ... />
</TaskPipeline>
```

```tsx
<TaskPool
  tasks={[
    { subject: "Task 1", description: "..." },
    { subject: "Task 2", description: "..." }
  ]}
/>
```

---

### Messages

```tsx
<Message
  type="text|shutdown_request|shutdown_approved|..."
  from="string"           // Sender name (required)
  to="string"             // Recipient (for text type)
  requestId="string"      // For structured messages
>
  {content}               // Message content
</Message>
```

```tsx
<Broadcast from="team-lead">
  Status check message
</Broadcast>
```

---

### Orchestration Patterns

```tsx
<Pattern
  name="string"           // Pattern name (required)
  description="string"    // Pattern description (required)
>
  {children}              // Pattern implementation
</Pattern>
```

```tsx
<ParallelWorkers
  teamName="string"       // Team name (required)
  workers={[              // Worker definitions (required)
    { name: "string", type: "string", prompt: "string" }
  ]}
/>
```

```tsx
<Swarm
  teamName="string"       // Team name (required)
  workerCount={3}         // Number of workers (required)
  workerType="string"     // Agent type (default: "general-purpose")
  prompt="string"         // Swarm worker prompt (required)
/>
```

---

### Lifecycle

```tsx
<Lifecycle
  steps={[
    {
      name: "Setup",
      code: "...",
      description: "Optional description"
    },
    ...
  ]}
/>
```

```tsx
<ShutdownSequence
  teammates={["worker-1", "worker-2"]}
/>
```

---

### Documentation Helpers

```tsx
<Note type="info|warning|danger|tip">
  Note content
</Note>
```

```tsx
<CodeBlock language="javascript" title="Optional Title">
  {code}
</CodeBlock>
```

```tsx
<Table
  headers={["Col1", "Col2"]}
  rows={[
    ["R1C1", "R1C2"],
    ["R2C1", "R2C2"]
  ]}
/>
```

```tsx
<AgentTypeDef
  name="string"           // Agent type name
  tools={["Tool1", "Tool2"]}
  model="haiku|sonnet|opus"
  bestFor={["Use case 1", "Use case 2"]}
  example="Task({ ... })"
/>
```

```tsx
<Backend
  type="in-process|tmux|iterm2"
  description="string"
  pros={["Pro 1", "Pro 2"]}
  cons={["Con 1", "Con 2"]}
/>
```

---

## Composition Patterns

### Pattern 1: Parallel Review Workflow

```tsx
<Workflow name="Code Review" team="review">
  <Team name="review">
    <Teammate name="security" type="security-sentinel" prompt="..." />
    <Teammate name="performance" type="performance-oracle" prompt="..." />
  </Team>

  <ParallelWorkers teamName="review" workers={[...]} />
  <ShutdownSequence teammates={["security", "performance"]} />
</Workflow>
```

### Pattern 2: Pipeline Workflow

```tsx
<Workflow name="Feature" team="feature">
  <TaskPipeline>
    <TaskDef id="1" subject="Research" ... />
    <TaskDef id="2" subject="Plan" blockedBy={["1"]} ... />
    <TaskDef id="3" subject="Implement" blockedBy={["2"]} ... />
  </TaskPipeline>

  <Team name="feature">
    <Teammate name="researcher" ... />
    <Teammate name="planner" ... />
    <Teammate name="implementer" ... />
  </Team>
</Workflow>
```

### Pattern 3: Swarm Workflow

```tsx
<Workflow name="File Review" team="swarm">
  <TaskPool tasks={[...]} />

  <Swarm
    teamName="swarm"
    workerCount={3}
    prompt="Claim and complete tasks..."
  />
</Workflow>
```

### Pattern 4: Hybrid (Pipeline + Parallel)

```tsx
<Workflow name="Full Feature" team="hybrid">
  <TaskPipeline>
    <TaskDef id="1" subject="Research" ... />
    <TaskDef id="2" subject="Implement" blockedBy={["1"]} ... />
    <TaskDef id="3" subject="Review" blockedBy={["2"]} ... />
  </TaskPipeline>

  {/* Final review is parallel */}
  <ParallelWorkers
    teamName="hybrid"
    workers={[
      { name: "security", ... },
      { name: "performance", ... }
    ]}
  />
</Workflow>
```

---

## Message Type Reference

| Type | Direction | Use Case |
|------|-----------|----------|
| `text` | Any → Any | General communication |
| `shutdown_request` | Leader → Teammate | Request graceful shutdown |
| `shutdown_approved` | Teammate → Leader | Confirm shutdown |
| `idle_notification` | Teammate → Leader | Report idle state |
| `task_completed` | Teammate → Leader | Report task done |
| `plan_approval_request` | Teammate → Leader | Request plan approval |
| `join_request` | Agent → Leader | Request to join team |
| `permission_request` | Teammate → Leader | Request tool permission |

---

## Agent Type Quick Reference

| Type | Tools | Model | Best For |
|------|-------|-------|----------|
| `Explore` | Read-only | haiku | Codebase exploration |
| `Plan` | Read-only | inherits | Architecture planning |
| `general-purpose` | All (*) | inherits | Multi-step tasks |
| `Bash` | Bash only | inherits | Git, commands |
| `security-sentinel` | Read-only | inherits | Security review |
| `performance-oracle` | Read-only | inherits | Performance review |
| `best-practices-researcher` | Read + Web | inherits | Research |

---

## Files

- `swarm-tsx-components.tsx` - Component definitions
- `swarm-tsx-examples.tsx` - Usage examples
- `swarm-tsx-grammar.md` - This reference
