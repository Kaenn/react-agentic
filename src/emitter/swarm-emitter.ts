/**
 * Swarm Emitter - Emit TaskDef and TaskPipeline nodes
 *
 * Generates Claude Code's TaskCreate/TaskUpdate syntax with:
 * - Mermaid flowcharts for dependency visualization
 * - Batched task creation calls
 * - Dependency setup via TaskUpdate
 */

import type { TaskDefNode, TaskPipelineNode, TeamNode, TeammateNode } from '../ir/swarm-nodes.js';

/**
 * TaskIdResolver - Maps UUID task IDs to sequential numeric IDs
 *
 * Claude Code's TaskCreate returns numeric IDs (1, 2, 3...).
 * This resolver provides deterministic mapping from UUIDs.
 */
export class TaskIdResolver {
  private idMap = new Map<string, string>();
  private nextId = 1;

  /**
   * Register a task UUID and get its numeric ID
   * Returns existing ID if already registered
   */
  register(uuid: string): string {
    const existing = this.idMap.get(uuid);
    if (existing) return existing;

    const numericId = String(this.nextId++);
    this.idMap.set(uuid, numericId);
    return numericId;
  }

  /**
   * Get the numeric ID for a task UUID
   * Returns undefined if not registered
   */
  get(uuid: string): string | undefined {
    return this.idMap.get(uuid);
  }

  /**
   * Get or register - ensures all lookups succeed
   */
  getOrRegister(uuid: string): string {
    return this.idMap.get(uuid) ?? this.register(uuid);
  }
}

/**
 * Emit TaskCreate call for a single task
 */
function emitTaskDefCreate(node: TaskDefNode): string {
  const props: string[] = [
    `subject: "${escapeString(node.subject)}"`,
    `description: "${escapeString(node.description)}"`,
  ];

  if (node.activeForm) {
    props.push(`activeForm: "${escapeString(node.activeForm)}"`);
  }

  return `TaskCreate({ ${props.join(', ')} })`;
}

/**
 * Emit TaskUpdate call for dependency setup
 */
function emitTaskDefUpdate(
  taskNumericId: string,
  blockedByNumericIds: string[]
): string {
  const blockedByArray = blockedByNumericIds.map(id => `"${id}"`).join(', ');
  return `TaskUpdate({ taskId: "${taskNumericId}", addBlockedBy: [${blockedByArray}] })`;
}

/**
 * Escape string for JSON/JS output
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/**
 * Emit a standalone TaskDef node
 */
export function emitTaskDef(node: TaskDefNode, resolver: TaskIdResolver): string {
  const lines: string[] = [];

  // Register this task
  const numericId = resolver.register(node.taskId);

  // Emit TaskCreate
  lines.push(emitTaskDefCreate(node));

  // Emit TaskUpdate for dependencies if present
  if (node.blockedByIds && node.blockedByIds.length > 0) {
    const blockedByNumericIds = node.blockedByIds.map(id => resolver.getOrRegister(id));
    lines.push(emitTaskDefUpdate(numericId, blockedByNumericIds));
  }

  return '```javascript\n' + lines.join('\n') + '\n```';
}

/**
 * Generate Mermaid flowchart for task pipeline
 */
function emitMermaidDiagram(
  children: TaskDefNode[],
  resolver: TaskIdResolver
): string {
  const lines: string[] = ['```mermaid', 'flowchart LR'];

  // Define nodes with labels
  for (const task of children) {
    const numericId = resolver.getOrRegister(task.taskId);
    lines.push(`  T${numericId}[${task.name}]`);
  }

  // Define edges based on blockedBy relationships
  for (const task of children) {
    if (task.blockedByIds && task.blockedByIds.length > 0) {
      const taskId = resolver.get(task.taskId);
      for (const blockedById of task.blockedByIds) {
        const blockedByNumericId = resolver.get(blockedById);
        if (taskId && blockedByNumericId) {
          lines.push(`  T${blockedByNumericId} --> T${taskId}`);
        }
      }
    }
  }

  lines.push('```');
  return lines.join('\n');
}

/**
 * Generate summary table for task pipeline
 */
function emitSummaryTable(
  children: TaskDefNode[],
  resolver: TaskIdResolver
): string {
  const lines: string[] = [
    '| ID | Task | Description | Depends On |',
    '| :--- | :--- | :--- | :--- |',
  ];

  for (const task of children) {
    const numericId = resolver.get(task.taskId) ?? '?';
    const deps = task.blockedByIds
      ?.map(id => resolver.get(id) ?? '?')
      .join(', ') || '-';
    lines.push(`| ${numericId} | ${task.name} | ${task.description} | ${deps} |`);
  }

  return lines.join('\n');
}

/**
 * Emit a TaskPipeline node
 *
 * Output structure:
 * 1. Optional title heading
 * 2. Mermaid flowchart
 * 3. Batched TaskCreate calls
 * 4. TaskUpdate calls for dependencies
 * 5. Summary table
 */
export function emitTaskPipeline(
  node: TaskPipelineNode,
  resolver: TaskIdResolver
): string {
  const sections: string[] = [];

  // Register all tasks first to ensure consistent IDs
  for (const child of node.children) {
    resolver.register(child.taskId);
  }

  // Title
  if (node.title) {
    sections.push(`## ${node.title}`);
  }

  // Mermaid diagram
  if (node.children.length > 0) {
    sections.push(emitMermaidDiagram(node.children, resolver));
  }

  // Batched JavaScript code block
  if (node.children.length > 0) {
    const jsLines: string[] = [];

    // Create all tasks
    jsLines.push('// Create all tasks');
    for (const child of node.children) {
      jsLines.push(emitTaskDefCreate(child));
    }

    // Set up dependencies
    const tasksWithDeps = node.children.filter(
      c => c.blockedByIds && c.blockedByIds.length > 0
    );
    if (tasksWithDeps.length > 0) {
      jsLines.push('');
      jsLines.push('// Set up dependencies');
      for (const child of tasksWithDeps) {
        const numericId = resolver.get(child.taskId)!;
        const blockedByNumericIds = child.blockedByIds!.map(
          id => resolver.get(id)!
        );
        jsLines.push(emitTaskDefUpdate(numericId, blockedByNumericIds));
      }
    }

    sections.push('```javascript\n' + jsLines.join('\n') + '\n```');
  }

  // Summary table
  if (node.children.length > 0) {
    sections.push(emitSummaryTable(node.children, resolver));
  }

  return sections.join('\n\n');
}

// =============================================================================
// Team + Teammate Emitters
// =============================================================================

/**
 * Emit a single Teammate node within a Team context
 */
function emitTeammate(node: TeammateNode, teamName: string): string {
  const sections: string[] = [];

  // Worker heading
  sections.push(`#### ${node.workerName}`);

  // Build Task properties
  const props: string[] = [
    `team_name: "${escapeString(teamName)}"`,
    `name: "${escapeString(node.workerName)}"`,
    `subagent_type: "${escapeString(node.workerType)}"`,
    `description: "${escapeString(node.description)}"`,
  ];

  // Add prompt (use template literal for multi-line support)
  const promptEscaped = node.prompt
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  props.push(`prompt: \`${promptEscaped}\``);

  // Add model if specified (prop override takes precedence)
  const effectiveModel = node.model || node.workerModel;
  if (effectiveModel) {
    props.push(`model: "${escapeString(effectiveModel)}"`);
  }

  // Add run_in_background
  props.push(`run_in_background: ${node.background}`);

  // Format as JavaScript code block
  const jsCode = `Task({
  ${props.join(',\n  ')}
})`;

  sections.push('```javascript\n' + jsCode + '\n```');

  return sections.join('\n\n');
}

/**
 * Emit a Team node
 *
 * Output structure:
 * 1. Team heading with name
 * 2. Optional description as blockquote
 * 3. Teammate spawnTeam call
 * 4. "Members" section with each Teammate
 */
export function emitTeam(node: TeamNode): string {
  const sections: string[] = [];

  // Team heading
  sections.push(`## Team: ${node.teamName}`);

  // Description as blockquote (optional)
  if (node.description) {
    sections.push(`> ${node.description}`);
  }

  // SpawnTeam call
  const spawnTeamProps: string[] = [
    `operation: "spawnTeam"`,
    `team_name: "${escapeString(node.teamName)}"`,
  ];
  if (node.description) {
    spawnTeamProps.push(`description: "${escapeString(node.description)}"`);
  }

  const spawnTeamCode = `Teammate({ ${spawnTeamProps.join(', ')} })`;
  sections.push('```javascript\n' + spawnTeamCode + '\n```');

  // Members section
  sections.push('### Members');

  // Emit each teammate
  for (const teammate of node.children) {
    sections.push(emitTeammate(teammate, node.teamName));
  }

  return sections.join('\n\n');
}
