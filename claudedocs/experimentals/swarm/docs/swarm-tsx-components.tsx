/**
 * Claude Code Swarm TSX Components
 *
 * A declarative grammar for defining and documenting Claude Code swarm orchestrations.
 * These components render to Markdown documentation.
 */

import React, { ReactNode } from 'react';

// =============================================================================
// PRIMITIVES - Core building blocks
// =============================================================================

interface AgentProps {
  name: string;
  type: 'Bash' | 'Explore' | 'Plan' | 'general-purpose' | 'claude-code-guide' | 'statusline-setup' | string;
  model?: 'haiku' | 'sonnet' | 'opus';
  tools?: string[];
  description?: string;
  children?: ReactNode;
}

/**
 * Represents a Claude agent instance
 *
 * @example
 * <Agent name="security-reviewer" type="Explore" model="haiku">
 *   Find all authentication-related files
 * </Agent>
 */
export function Agent({ name, type, model, tools, description, children }: AgentProps) {
  return `### Agent: ${name}

| Property | Value |
|----------|-------|
| **Type** | \`${type}\` |
${model ? `| **Model** | ${model} |` : ''}
${tools ? `| **Tools** | ${tools.join(', ')} |` : ''}
${description ? `| **Description** | ${description} |` : ''}

${children ? `**Prompt:**\n\`\`\`\n${children}\n\`\`\`` : ''}
`;
}

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

interface TeamProps {
  name: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Defines a team container for coordinated work
 *
 * @example
 * <Team name="pr-review-123" description="Reviewing PR #123">
 *   <Teammate name="security" type="security-sentinel" />
 *   <Teammate name="performance" type="performance-oracle" />
 * </Team>
 */
export function Team({ name, description, children }: TeamProps) {
  return `## Team: ${name}

${description ? `> ${description}` : ''}

\`\`\`javascript
Teammate({
  operation: "spawnTeam",
  team_name: "${name}"${description ? `,
  description: "${description}"` : ''}
})
\`\`\`

### Members

${children}
`;
}

interface TeammateProps {
  name: string;
  type: string;
  prompt: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  background?: boolean;
}

/**
 * Defines a teammate within a team
 *
 * @example
 * <Teammate
 *   name="security-reviewer"
 *   type="security-sentinel"
 *   prompt="Review code for security vulnerabilities"
 *   background
 * />
 */
export function Teammate({ name, type, prompt, model, background = true }: TeammateProps) {
  return `#### ${name}

\`\`\`javascript
Task({
  team_name: "{team}",
  name: "${name}",
  subagent_type: "${type}",
  prompt: \`${prompt}\`,${model ? `
  model: "${model}",` : ''}
  run_in_background: ${background}
})
\`\`\`
`;
}

// =============================================================================
// TASK MANAGEMENT
// =============================================================================

interface TaskDefProps {
  id?: string;
  subject: string;
  description: string;
  activeForm?: string;
  blockedBy?: string[];
  children?: ReactNode;
}

/**
 * Defines a task in the task queue
 *
 * @example
 * <TaskDef
 *   subject="Review auth module"
 *   description="Review all files in app/services/auth/"
 *   activeForm="Reviewing auth..."
 * />
 */
export function TaskDef({ id, subject, description, activeForm, blockedBy }: TaskDefProps) {
  return `- **${id ? `#${id} ` : ''}${subject}**
  - Description: ${description}
  ${activeForm ? `- Active Form: "${activeForm}"` : ''}
  ${blockedBy?.length ? `- Blocked By: ${blockedBy.map(b => `#${b}`).join(', ')}` : ''}

\`\`\`javascript
TaskCreate({
  subject: "${subject}",
  description: "${description}"${activeForm ? `,
  activeForm: "${activeForm}"` : ''}
})${blockedBy?.length ? `

TaskUpdate({ taskId: "${id}", addBlockedBy: [${blockedBy.map(b => `"${b}"`).join(', ')}] })` : ''}
\`\`\`
`;
}

interface TaskPipelineProps {
  children: ReactNode;
}

/**
 * Container for sequential task dependencies
 *
 * @example
 * <TaskPipeline>
 *   <TaskDef id="1" subject="Research" description="..." />
 *   <TaskDef id="2" subject="Plan" description="..." blockedBy={["1"]} />
 *   <TaskDef id="3" subject="Implement" description="..." blockedBy={["2"]} />
 * </TaskPipeline>
 */
export function TaskPipeline({ children }: TaskPipelineProps) {
  return `### Task Pipeline

\`\`\`mermaid
flowchart LR
    T1[Task 1] --> T2[Task 2] --> T3[Task 3] --> T4[Task 4]
\`\`\`

${children}
`;
}

interface TaskPoolProps {
  tasks: Array<{ subject: string; description: string }>;
}

/**
 * Defines a pool of independent tasks (no dependencies)
 *
 * @example
 * <TaskPool tasks={[
 *   { subject: "Review user.rb", description: "..." },
 *   { subject: "Review payment.rb", description: "..." }
 * ]} />
 */
export function TaskPool({ tasks }: TaskPoolProps) {
  return `### Task Pool (Independent Tasks)

\`\`\`javascript
// Create independent task pool
${tasks.map((t, i) => `TaskCreate({ subject: "${t.subject}", description: "${t.description}" })`).join('\n')}

// No dependencies - workers can claim any task
\`\`\`

| # | Subject | Description |
|---|---------|-------------|
${tasks.map((t, i) => `| ${i + 1} | ${t.subject} | ${t.description} |`).join('\n')}
`;
}

// =============================================================================
// MESSAGES
// =============================================================================

type MessageType =
  | 'text'
  | 'shutdown_request'
  | 'shutdown_approved'
  | 'idle_notification'
  | 'task_completed'
  | 'plan_approval_request'
  | 'join_request'
  | 'permission_request';

interface MessageProps {
  type: MessageType;
  from: string;
  to?: string;
  content?: string;
  requestId?: string;
  children?: ReactNode;
}

/**
 * Defines a message between agents
 *
 * @example
 * <Message type="text" from="team-lead" to="worker-1">
 *   Please prioritize the auth module
 * </Message>
 */
export function Message({ type, from, to, content, requestId, children }: MessageProps) {
  const messageContent = children || content || '';

  if (type === 'text') {
    return `**Message** from \`${from}\` to \`${to}\`:

\`\`\`javascript
Teammate({
  operation: "write",
  target_agent_id: "${to}",
  value: "${messageContent}"
})
\`\`\`
`;
  }

  const messageJson: Record<string, any> = {
    type,
    from,
    ...(requestId && { requestId }),
    timestamp: new Date().toISOString()
  };

  return `**${type}** from \`${from}\`:

\`\`\`json
${JSON.stringify(messageJson, null, 2)}
\`\`\`
`;
}

interface BroadcastProps {
  from: string;
  children: ReactNode;
}

/**
 * Broadcast message to all teammates
 *
 * @example
 * <Broadcast from="team-lead">
 *   Status check: Please report your progress
 * </Broadcast>
 */
export function Broadcast({ from, children }: BroadcastProps) {
  return `**Broadcast** from \`${from}\`:

> ⚠️ Broadcasting sends N separate messages for N teammates. Prefer \`write\` for targeted communication.

\`\`\`javascript
Teammate({
  operation: "broadcast",
  name: "${from}",
  value: "${children}"
})
\`\`\`
`;
}

// =============================================================================
// ORCHESTRATION PATTERNS
// =============================================================================

interface PatternProps {
  name: string;
  description: string;
  children: ReactNode;
}

/**
 * Container for documenting an orchestration pattern
 *
 * @example
 * <Pattern name="Parallel Specialists" description="Multiple specialists review code simultaneously">
 *   ...
 * </Pattern>
 */
export function Pattern({ name, description, children }: PatternProps) {
  return `## Pattern: ${name}

> ${description}

${children}
`;
}

interface ParallelWorkersProps {
  teamName: string;
  workers: Array<{
    name: string;
    type: string;
    prompt: string;
  }>;
}

/**
 * Defines parallel worker spawning pattern
 *
 * @example
 * <ParallelWorkers teamName="code-review" workers={[
 *   { name: "security", type: "security-sentinel", prompt: "..." },
 *   { name: "performance", type: "performance-oracle", prompt: "..." }
 * ]} />
 */
export function ParallelWorkers({ teamName, workers }: ParallelWorkersProps) {
  return `### Parallel Workers

\`\`\`mermaid
flowchart TB
    Leader[Leader] --> W1[${workers[0]?.name || 'Worker 1'}]
    Leader --> W2[${workers[1]?.name || 'Worker 2'}]
    Leader --> W3[${workers[2]?.name || 'Worker 3'}]
    W1 --> Results[Results]
    W2 --> Results
    W3 --> Results
\`\`\`

\`\`\`javascript
// Spawn all workers in parallel (single message, multiple Task calls)
${workers.map(w => `Task({
  team_name: "${teamName}",
  name: "${w.name}",
  subagent_type: "${w.type}",
  prompt: \`${w.prompt}\`,
  run_in_background: true
})`).join('\n\n')}
\`\`\`
`;
}

interface SwarmProps {
  teamName: string;
  workerCount: number;
  workerType?: string;
  prompt: string;
}

/**
 * Defines a self-organizing swarm pattern
 *
 * @example
 * <Swarm
 *   teamName="file-review"
 *   workerCount={3}
 *   workerType="general-purpose"
 *   prompt="Claim tasks from pool, complete them, repeat..."
 * />
 */
export function Swarm({ teamName, workerCount, workerType = 'general-purpose', prompt }: SwarmProps) {
  return `### Self-Organizing Swarm

\`\`\`mermaid
flowchart TB
    subgraph TaskPool[Task Pool]
        T1[Task 1]
        T2[Task 2]
        T3[Task 3]
        T4[Task 4]
    end

    subgraph Workers[Worker Swarm]
        W1[Worker 1]
        W2[Worker 2]
        W3[Worker 3]
    end

    TaskPool <-.->|claim & complete| Workers
\`\`\`

**Swarm Prompt:**
\`\`\`
${prompt}
\`\`\`

\`\`\`javascript
// Spawn ${workerCount} workers with identical prompts
${Array.from({ length: workerCount }, (_, i) => `Task({
  team_name: "${teamName}",
  name: "worker-${i + 1}",
  subagent_type: "${workerType}",
  prompt: swarmPrompt,
  run_in_background: true
})`).join('\n\n')}
\`\`\`
`;
}

// =============================================================================
// LIFECYCLE OPERATIONS
// =============================================================================

interface ShutdownSequenceProps {
  teammates: string[];
}

/**
 * Documents the graceful shutdown sequence
 *
 * @example
 * <ShutdownSequence teammates={["worker-1", "worker-2", "worker-3"]} />
 */
export function ShutdownSequence({ teammates }: ShutdownSequenceProps) {
  return `### Graceful Shutdown

\`\`\`javascript
// 1. Request shutdown for all teammates
${teammates.map(t => `Teammate({ operation: "requestShutdown", target_agent_id: "${t}" })`).join('\n')}

// 2. Wait for shutdown approvals
// Check for {"type": "shutdown_approved", ...} messages

// 3. Cleanup team resources
Teammate({ operation: "cleanup" })
\`\`\`
`;
}

interface LifecycleProps {
  steps: Array<{
    name: string;
    code: string;
    description?: string;
  }>;
}

/**
 * Documents a complete workflow lifecycle
 *
 * @example
 * <Lifecycle steps={[
 *   { name: "Setup", code: "Teammate({ operation: 'spawnTeam', ... })" },
 *   { name: "Spawn", code: "Task({ ... })" },
 *   { name: "Work", code: "// Monitor inbox" },
 *   { name: "Cleanup", code: "Teammate({ operation: 'cleanup' })" }
 * ]} />
 */
export function Lifecycle({ steps }: LifecycleProps) {
  return `### Lifecycle

\`\`\`mermaid
flowchart LR
${steps.map((s, i) => `    S${i}[${i + 1}. ${s.name}]${i < steps.length - 1 ? ` --> S${i + 1}` : ''}`).join('\n')}
\`\`\`

${steps.map((s, i) => `#### Step ${i + 1}: ${s.name}

${s.description ? `> ${s.description}` : ''}

\`\`\`javascript
${s.code}
\`\`\`
`).join('\n')}
`;
}

// =============================================================================
// WORKFLOW TEMPLATES
// =============================================================================

interface WorkflowProps {
  name: string;
  description: string;
  team: string;
  children: ReactNode;
}

/**
 * Top-level workflow documentation container
 *
 * @example
 * <Workflow name="Code Review" description="Parallel specialist review" team="pr-review">
 *   <Team name="pr-review">...</Team>
 *   <ParallelWorkers ... />
 *   <ShutdownSequence ... />
 * </Workflow>
 */
export function Workflow({ name, description, team, children }: WorkflowProps) {
  return `# Workflow: ${name}

> ${description}

**Team:** \`${team}\`

---

${children}
`;
}

// =============================================================================
// CODE BLOCKS & DOCUMENTATION HELPERS
// =============================================================================

interface CodeBlockProps {
  language?: string;
  title?: string;
  children: string;
}

/**
 * Renders a code block with optional title
 */
export function CodeBlock({ language = 'javascript', title, children }: CodeBlockProps) {
  return `${title ? `**${title}:**\n` : ''}\`\`\`${language}
${children}
\`\`\`
`;
}

interface NoteProps {
  type?: 'info' | 'warning' | 'danger' | 'tip';
  children: ReactNode;
}

/**
 * Renders a callout/note block
 */
export function Note({ type = 'info', children }: NoteProps) {
  const icons: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨',
    tip: '💡'
  };
  return `> ${icons[type]} **${type.charAt(0).toUpperCase() + type.slice(1)}:** ${children}
`;
}

interface TableProps {
  headers: string[];
  rows: string[][];
}

/**
 * Renders a markdown table
 */
export function Table({ headers, rows }: TableProps) {
  return `| ${headers.join(' | ')} |
|${headers.map(() => '---').join('|')}|
${rows.map(row => `| ${row.join(' | ')} |`).join('\n')}
`;
}

// =============================================================================
// AGENT TYPE DEFINITIONS
// =============================================================================

interface AgentTypeDefProps {
  name: string;
  tools: string[];
  model?: string;
  bestFor: string[];
  example: string;
}

/**
 * Documents an agent type
 *
 * @example
 * <AgentTypeDef
 *   name="Explore"
 *   tools={["Read", "Glob", "Grep"]}
 *   model="haiku"
 *   bestFor={["Codebase exploration", "File searches"]}
 *   example="Task({ subagent_type: 'Explore', ... })"
 * />
 */
export function AgentTypeDef({ name, tools, model, bestFor, example }: AgentTypeDefProps) {
  return `### ${name}

| Property | Value |
|----------|-------|
| **Tools** | ${tools.join(', ')} |
${model ? `| **Model** | ${model} |` : ''}
| **Best For** | ${bestFor.join(', ')} |

\`\`\`javascript
${example}
\`\`\`
`;
}

// =============================================================================
// BACKEND CONFIGURATION
// =============================================================================

type BackendType = 'in-process' | 'tmux' | 'iterm2';

interface BackendProps {
  type: BackendType;
  description: string;
  pros: string[];
  cons: string[];
}

/**
 * Documents a spawn backend type
 */
export function Backend({ type, description, pros, cons }: BackendProps) {
  return `### Backend: ${type}

> ${description}

**Pros:**
${pros.map(p => `- ✅ ${p}`).join('\n')}

**Cons:**
${cons.map(c => `- ❌ ${c}`).join('\n')}
`;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type {
  AgentProps,
  TeamProps,
  TeammateProps,
  TaskDefProps,
  TaskPipelineProps,
  TaskPoolProps,
  MessageProps,
  BroadcastProps,
  PatternProps,
  ParallelWorkersProps,
  SwarmProps,
  ShutdownSequenceProps,
  LifecycleProps,
  WorkflowProps,
  CodeBlockProps,
  NoteProps,
  TableProps,
  AgentTypeDefProps,
  BackendProps,
  MessageType,
  BackendType
};
