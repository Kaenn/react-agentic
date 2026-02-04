import { describe, expect, it, beforeEach } from 'vitest';
import { TaskIdResolver, emitTaskDef, emitTaskPipeline, emitShutdownSequence } from '../../../src/emitter/swarm-emitter.js';
import type { TaskDefNode, TaskPipelineNode, ShutdownSequenceNode } from '../../../src/ir/swarm-nodes.js';

describe('TaskIdResolver', () => {
  let resolver: TaskIdResolver;

  beforeEach(() => {
    resolver = new TaskIdResolver();
  });

  it('assigns sequential numeric IDs starting from 1', () => {
    expect(resolver.register('uuid-1')).toBe('1');
    expect(resolver.register('uuid-2')).toBe('2');
    expect(resolver.register('uuid-3')).toBe('3');
  });

  it('returns same ID for repeated registrations', () => {
    expect(resolver.register('uuid-1')).toBe('1');
    expect(resolver.register('uuid-1')).toBe('1');
    expect(resolver.register('uuid-2')).toBe('2');
    expect(resolver.register('uuid-1')).toBe('1');
  });

  it('get returns undefined for unregistered IDs', () => {
    expect(resolver.get('unknown')).toBeUndefined();
  });

  it('get returns numeric ID for registered IDs', () => {
    resolver.register('uuid-1');
    expect(resolver.get('uuid-1')).toBe('1');
  });

  it('getOrRegister registers new IDs', () => {
    expect(resolver.getOrRegister('uuid-1')).toBe('1');
    expect(resolver.get('uuid-1')).toBe('1');
  });

  it('getOrRegister returns existing ID without re-registering', () => {
    resolver.register('uuid-1');
    expect(resolver.getOrRegister('uuid-1')).toBe('1');
    expect(resolver.getOrRegister('uuid-2')).toBe('2');
  });
});

describe('emitTaskDef', () => {
  it('emits TaskCreate call with basic fields', () => {
    const resolver = new TaskIdResolver();
    const node: TaskDefNode = {
      kind: 'taskDef',
      taskId: 'task-1',
      subject: 'Research OAuth',
      name: 'research',
      description: 'Research OAuth providers',
    };

    const output = emitTaskDef(node, resolver);

    expect(output).toContain('```javascript');
    expect(output).toContain('TaskCreate({');
    expect(output).toContain('subject: "Research OAuth"');
    expect(output).toContain('description: "Research OAuth providers"');
    expect(output).toContain('```');
  });

  it('emits TaskCreate call with activeForm', () => {
    const resolver = new TaskIdResolver();
    const node: TaskDefNode = {
      kind: 'taskDef',
      taskId: 'task-1',
      subject: 'Research OAuth',
      name: 'research',
      description: 'Research OAuth providers',
      activeForm: 'Researching...',
    };

    const output = emitTaskDef(node, resolver);

    expect(output).toContain('activeForm: "Researching..."');
  });

  it('emits TaskUpdate for blockedBy dependencies', () => {
    const resolver = new TaskIdResolver();
    // Register the blocking task first
    resolver.register('task-blocker');

    const node: TaskDefNode = {
      kind: 'taskDef',
      taskId: 'task-2',
      subject: 'Plan Implementation',
      name: 'plan',
      description: 'Create implementation plan',
      blockedByIds: ['task-blocker'],
    };

    const output = emitTaskDef(node, resolver);

    expect(output).toContain('TaskCreate({');
    expect(output).toContain('TaskUpdate({');
    expect(output).toContain('taskId: "2"');
    expect(output).toContain('addBlockedBy: ["1"]');
  });

  it('escapes special characters in strings', () => {
    const resolver = new TaskIdResolver();
    const node: TaskDefNode = {
      kind: 'taskDef',
      taskId: 'task-1',
      subject: 'Test "quoted" string',
      name: 'test',
      description: 'Line1\nLine2',
    };

    const output = emitTaskDef(node, resolver);

    expect(output).toContain('subject: "Test \\"quoted\\" string"');
    expect(output).toContain('description: "Line1\\nLine2"');
  });
});

describe('emitTaskPipeline', () => {
  it('emits title heading when provided', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      title: 'OAuth Implementation',
      autoChain: false,
      children: [],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('## OAuth Implementation');
  });

  it('emits mermaid flowchart with task nodes', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: false,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Research', name: 'research', description: 'Research phase' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Plan', name: 'plan', description: 'Planning phase' },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('```mermaid');
    expect(output).toContain('flowchart LR');
    expect(output).toContain('T1[research]');
    expect(output).toContain('T2[plan]');
    expect(output).toContain('```');
  });

  it('emits mermaid edges for dependencies', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: false,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Research', name: 'research', description: 'Research phase' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Plan', name: 'plan', description: 'Planning phase', blockedByIds: ['task-1'] },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('T1 --> T2');
  });

  it('emits batched TaskCreate calls', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: false,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Research', name: 'research', description: 'Research phase' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Plan', name: 'plan', description: 'Planning phase' },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('// Create all tasks');
    expect(output).toContain('TaskCreate({ subject: "Research"');
    expect(output).toContain('TaskCreate({ subject: "Plan"');
  });

  it('emits TaskUpdate calls for dependencies', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: false,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Research', name: 'research', description: 'Research phase' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Plan', name: 'plan', description: 'Planning phase', blockedByIds: ['task-1'] },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('// Set up dependencies');
    expect(output).toContain('TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })');
  });

  it('emits summary table', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: false,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Research', name: 'research', description: 'Research phase' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Plan', name: 'plan', description: 'Planning phase', blockedByIds: ['task-1'] },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    expect(output).toContain('| ID | Task | Description | Depends On |');
    expect(output).toContain('| 1 | research | Research phase | - |');
    expect(output).toContain('| 2 | plan | Planning phase | 1 |');
  });

  it('handles autoChain by adding sequential dependencies', () => {
    const resolver = new TaskIdResolver();
    const node: TaskPipelineNode = {
      kind: 'taskPipeline',
      autoChain: true,
      children: [
        { kind: 'taskDef', taskId: 'task-1', subject: 'Step 1', name: 'step1', description: 'First step' },
        { kind: 'taskDef', taskId: 'task-2', subject: 'Step 2', name: 'step2', description: 'Second step', blockedByIds: ['task-1'] },
        { kind: 'taskDef', taskId: 'task-3', subject: 'Step 3', name: 'step3', description: 'Third step', blockedByIds: ['task-2'] },
      ],
    };

    const output = emitTaskPipeline(node, resolver);

    // Mermaid should show chain
    expect(output).toContain('T1 --> T2');
    expect(output).toContain('T2 --> T3');

    // Table should show dependencies
    expect(output).toContain('| 1 | step1 | First step | - |');
    expect(output).toContain('| 2 | step2 | Second step | 1 |');
    expect(output).toContain('| 3 | step3 | Third step | 2 |');
  });
});

describe('emitShutdownSequence', () => {
  it('emits section title heading', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Test shutdown',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('## Shutdown');
  });

  it('emits custom title when provided', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Test shutdown',
      includeCleanup: true,
      title: 'Graceful Termination',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('## Graceful Termination');
  });

  it('emits requestShutdown for each worker', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [
        { workerId: 'worker:Security', workerName: 'security' },
        { workerId: 'worker:Perf', workerName: 'perf' },
      ],
      reason: 'All reviews complete',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('```javascript');
    expect(output).toContain('// 1. Request shutdown for all workers');
    expect(output).toContain('Teammate({ operation: "requestShutdown", target_agent_id: "security", reason: "All reviews complete" })');
    expect(output).toContain('Teammate({ operation: "requestShutdown", target_agent_id: "perf", reason: "All reviews complete" })');
  });

  it('emits wait instructions with inbox path', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [
        { workerId: 'worker:Security', workerName: 'security' },
        { workerId: 'worker:Perf', workerName: 'perf' },
      ],
      reason: 'Shutdown requested',
      includeCleanup: true,
      teamName: 'pr-review',
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('// 2. Wait for shutdown_approved messages');
    expect(output).toContain('// Check ~/.claude/teams/pr-review/inboxes/team-lead.json for:');
    expect(output).toContain('// {"type": "shutdown_approved", "from": "security", ...}');
    expect(output).toContain('// {"type": "shutdown_approved", "from": "perf", ...}');
  });

  it('uses {team} placeholder when teamName not provided', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Shutdown requested',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('// Check ~/.claude/teams/{team}/inboxes/team-lead.json for:');
  });

  it('emits cleanup step by default', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Shutdown requested',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('// 3. Cleanup team resources');
    expect(output).toContain('Teammate({ operation: "cleanup" })');
  });

  it('omits cleanup step when includeCleanup is false', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Shutdown requested',
      includeCleanup: false,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).not.toContain('// 3. Cleanup team resources');
    expect(output).not.toContain('Teammate({ operation: "cleanup" })');
  });

  it('escapes special characters in reason', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Test "quoted" reason',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('reason: "Test \\"quoted\\" reason"');
  });

  it('outputs proper code block structure', () => {
    const node: ShutdownSequenceNode = {
      kind: 'shutdownSequence',
      workers: [{ workerId: 'worker:Security', workerName: 'security' }],
      reason: 'Shutdown requested',
      includeCleanup: true,
      title: 'Shutdown',
    };

    const output = emitShutdownSequence(node);

    expect(output).toContain('```javascript');
    expect(output).toMatch(/```$/); // Ends with closing code fence
  });
});
