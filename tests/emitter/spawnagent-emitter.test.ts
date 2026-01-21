import { describe, it, expect } from 'vitest';
import { emit } from '../../src/emitter/emitter.js';
import type { DocumentNode, SpawnAgentNode, FrontmatterNode } from '../../src/ir/index.js';

/**
 * Helper to create DocumentNode with SpawnAgent for testing
 */
function createDocWithSpawnAgent(
  spawnAgents: Omit<SpawnAgentNode, 'kind'>[],
  extraChildren: DocumentNode['children'] = []
): DocumentNode {
  const frontmatter: FrontmatterNode = {
    kind: 'frontmatter',
    data: { name: 'test-command', description: 'Test command' }
  };

  const spawnAgentNodes: SpawnAgentNode[] = spawnAgents.map(sa => ({
    kind: 'spawnAgent',
    ...sa
  }));

  return {
    kind: 'document',
    frontmatter,
    children: [...extraChildren, ...spawnAgentNodes]
  };
}

describe('SpawnAgent emission', () => {
  describe('basic emission', () => {
    it('emits Task() syntax with all fields', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'gsd-researcher',
        model: '{model}',
        description: 'Research task',
        prompt: 'Do research'
      }]);

      const output = emit(doc);

      expect(output).toContain('Task(');
      expect(output).toContain('prompt="Do research"');
      expect(output).toContain('subagent_type="gsd-researcher"');
      expect(output).toContain('model="{model}"');
      expect(output).toContain('description="Research task"');
      expect(output).toContain(')');
    });

    it('emits Task() with proper indentation', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'p'
      }]);

      const output = emit(doc);

      // Verify indentation structure
      expect(output).toContain('Task(\n');
      expect(output).toContain('  prompt=');
      expect(output).toContain('  subagent_type=');
      expect(output).toContain('  model=');
      expect(output).toContain('  description=');
      expect(output).toContain('\n)');
    });
  });

  describe('quote escaping', () => {
    it('escapes double quotes in prompt', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Say "hello" to the agent'
      }]);

      const output = emit(doc);

      expect(output).toContain('prompt="Say \\"hello\\" to the agent"');
    });

    it('escapes double quotes in description', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'Task with "special" name',
        prompt: 'p'
      }]);

      const output = emit(doc);

      expect(output).toContain('description="Task with \\"special\\" name"');
    });

    it('escapes double quotes in agent name', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'agent-with-"quotes"',
        model: 'm',
        description: 'd',
        prompt: 'p'
      }]);

      const output = emit(doc);

      expect(output).toContain('subagent_type="agent-with-\\"quotes\\""');
    });
  });

  describe('multi-line content', () => {
    it('preserves multi-line prompt content', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Line 1\nLine 2\nLine 3'
      }]);

      const output = emit(doc);

      // Should have actual newlines, not escaped \n
      expect(output).toContain('prompt="Line 1\nLine 2\nLine 3"');
    });

    it('handles prompt with XML-like structure', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: '<context>\nPhase: {phase}\n</context>'
      }]);

      const output = emit(doc);

      expect(output).toContain('<context>');
      expect(output).toContain('Phase: {phase}');
      expect(output).toContain('</context>');
    });
  });

  describe('placeholder preservation', () => {
    it('preserves {variable} in model', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: '{researcher_model}',
        description: 'd',
        prompt: 'p'
      }]);

      const output = emit(doc);

      expect(output).toContain('model="{researcher_model}"');
    });

    it('preserves {variable} in prompt', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Research phase {phase_number}'
      }]);

      const output = emit(doc);

      expect(output).toContain('prompt="Research phase {phase_number}"');
    });

    it('preserves multiple {variables} in prompt', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test',
        model: 'm',
        description: 'd',
        prompt: 'Phase: {phase}, Goal: {goal}'
      }]);

      const output = emit(doc);

      expect(output).toContain('{phase}');
      expect(output).toContain('{goal}');
    });
  });

  describe('multiple SpawnAgent elements', () => {
    it('emits multiple Task() blocks separated by blank lines', () => {
      const doc = createDocWithSpawnAgent([
        { agent: 'agent1', model: 'm1', description: 'd1', prompt: 'p1' },
        { agent: 'agent2', model: 'm2', description: 'd2', prompt: 'p2' }
      ]);

      const output = emit(doc);

      expect(output).toContain('subagent_type="agent1"');
      expect(output).toContain('subagent_type="agent2"');
      // Should have two Task() blocks
      expect((output.match(/Task\(/g) || []).length).toBe(2);
    });
  });

  describe('SpawnAgent with sibling content', () => {
    it('emits SpawnAgent after other block elements', () => {
      const doc = createDocWithSpawnAgent(
        [{ agent: 'researcher', model: 'm', description: 'd', prompt: 'p' }],
        [
          { kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Title' }] },
          { kind: 'paragraph', children: [{ kind: 'text', value: 'Introduction.' }] }
        ]
      );

      const output = emit(doc);

      // Verify order: heading, paragraph, then Task()
      const titleIndex = output.indexOf('# Title');
      const introIndex = output.indexOf('Introduction.');
      const taskIndex = output.indexOf('Task(');

      expect(titleIndex).toBeLessThan(introIndex);
      expect(introIndex).toBeLessThan(taskIndex);
    });
  });

  describe('complete document output', () => {
    it('emits valid Command with SpawnAgent', () => {
      const doc: DocumentNode = {
        kind: 'document',
        frontmatter: {
          kind: 'frontmatter',
          data: {
            name: 'plan-phase',
            description: 'Plan a phase',
            'allowed-tools': ['Read', 'Task']
          }
        },
        children: [
          { kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Phase Planning' }] },
          { kind: 'paragraph', children: [{ kind: 'text', value: 'This command spawns an agent.' }] },
          {
            kind: 'spawnAgent',
            agent: 'gsd-researcher',
            model: '{researcher_model}',
            description: 'Research phase requirements',
            prompt: 'Research the phase.'
          }
        ]
      };

      const output = emit(doc);

      // Verify frontmatter
      expect(output).toContain('---');
      expect(output).toContain('name: plan-phase');
      expect(output).toContain('description: Plan a phase');

      // Verify body
      expect(output).toContain('# Phase Planning');
      expect(output).toContain('This command spawns an agent.');

      // Verify Task()
      expect(output).toContain('Task(');
      expect(output).toContain('subagent_type="gsd-researcher"');
    });

    it('matches expected output format', () => {
      const doc = createDocWithSpawnAgent([{
        agent: 'test-agent',
        model: '{model}',
        description: 'Test description',
        prompt: 'Test prompt'
      }]);

      const output = emit(doc);

      // Verify the Task() block format matches GSD expectations
      expect(output).toMatch(/Task\(\n {2}prompt=".*",\n {2}subagent_type=".*",\n {2}model=".*",\n {2}description=".*"\n\)/);
    });
  });
});
