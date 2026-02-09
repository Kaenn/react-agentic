/**
 * Grammar Tests: TaskDef and TaskPipeline Components
 *
 * Tests swarm task orchestration components that emit Claude Code's
 * TaskCreate/TaskUpdate syntax.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<TaskDef>', () => {
  describe('type safety', () => {
    it('compiles with task and prompt props', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research OAuth providers" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('accepts activeForm prop', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research OAuth providers" activeForm="Researching..." />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('accepts blockedBy prop with array of TaskRefs', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research phase" />
              <TaskDef task={Plan} prompt="Planning phase" blockedBy={[Research]} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits TaskCreate with subject and description', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research OAuth providers" />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('TaskCreate({');
      expect(output).toContain('subject: "Research OAuth"');
      expect(output).toContain('description: "Research OAuth providers"');
    });

    it('emits TaskCreate with activeForm', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research" activeForm="Researching..." />
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('activeForm: "Researching..."');
    });
  });

  describe('<Prompt> child support', () => {
    it('accepts <Prompt> child as alternative to prompt prop', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} activeForm="Researching...">
                <Prompt>
                  <p>Research OAuth2 providers thoroughly.</p>
                  <ul>
                    <li>Compare pricing</li>
                    <li>Evaluate security features</li>
                  </ul>
                </Prompt>
              </TaskDef>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('TaskCreate({');
      expect(output).toContain('description:');
      expect(output).toContain('Research OAuth2 providers thoroughly');
    });

    it('throws when both prompt prop and <Prompt> child provided', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} prompt="Research OAuth providers">
                <Prompt>
                  <p>Conflicting prompt content</p>
                </Prompt>
              </TaskDef>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).toThrow(
        'TaskDef cannot have both a prompt prop and <Prompt> child'
      );
    });

    it('throws when neither prompt prop nor <Prompt> child provided', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research OAuth');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskDef task={Research} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).toThrow(
        'TaskDef requires either a prompt prop or <Prompt> child'
      );
    });
  });
});

describe('<TaskPipeline>', () => {
  describe('type safety', () => {
    it('compiles with children', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('accepts title prop', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline title="OAuth Implementation">
                <TaskDef task={Research} prompt="Research phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });

    it('accepts autoChain prop', () => {
      const content = `
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline autoChain>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(content, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits title as heading', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline title="OAuth Implementation">
                <TaskDef task={Research} prompt="Research phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('## OAuth Implementation');
    });

    it('emits mermaid flowchart', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('```mermaid');
      expect(output).toContain('flowchart LR');
      expect(output).toContain('```');
    });

    it('emits batched TaskCreate calls', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('// Create all tasks');
      expect(output).toContain('TaskCreate({ subject: "Research"');
      expect(output).toContain('TaskCreate({ subject: "Plan"');
    });

    it('emits summary table', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('| ID | Task | Description | Depends On |');
    });
  });

  describe('dependencies', () => {
    it('emits TaskUpdate for explicit blockedBy', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" blockedBy={[Research]} />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('// Set up dependencies');
      expect(output).toContain('TaskUpdate({');
      expect(output).toContain('addBlockedBy:');
    });

    it('emits mermaid edges for dependencies', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" blockedBy={[Research]} />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      expect(output).toContain('-->');
    });

    it('shows dependencies in summary table', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Research = defineTask('Research');
        const Plan = defineTask('Plan');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline>
                <TaskDef task={Research} prompt="Research phase" />
                <TaskDef task={Plan} prompt="Plan phase" blockedBy={[Research]} />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      // Plan should show it depends on Research (ID 1)
      expect(output).toMatch(/\|\s*2\s*\|.*\|\s*1\s*\|/);
    });
  });

  describe('autoChain', () => {
    it('creates sequential dependencies when autoChain=true', () => {
      const output = transformAgentContent(`
        import { defineTask } from 'react-agentic';

        const Step1 = defineTask('Step 1');
        const Step2 = defineTask('Step 2');
        const Step3 = defineTask('Step 3');

        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <TaskPipeline autoChain>
                <TaskDef task={Step1} prompt="First step" />
                <TaskDef task={Step2} prompt="Second step" />
                <TaskDef task={Step3} prompt="Third step" />
              </TaskPipeline>
            </Agent>
          );
        }
      `, true);
      // All tasks should be chained T1 --> T2 --> T3
      expect(output).toContain('T1 --> T2');
      expect(output).toContain('T2 --> T3');
    });
  });
});

describe('pipeline-builder', () => {
  it('createPipeline builds pipeline with auto-chaining', async () => {
    // Test the builder API directly
    const { createPipeline } = await import('../../../src/components/swarm/index.js');

    const pipeline = createPipeline('OAuth Flow')
      .task('Research providers', 'research', 'Research OAuth2 providers')
      .task('Create plan', 'plan', 'Create implementation plan')
      .task('Build integration', 'implement', 'Build the feature')
      .build();

    expect(pipeline.title).toBe('OAuth Flow');
    expect(pipeline.stages).toHaveLength(3);

    // First stage has no blockers
    expect(pipeline.stages[0].blockedBy).toHaveLength(0);
    // Second stage blocked by first
    expect(pipeline.stages[1].blockedBy).toHaveLength(1);
    expect(pipeline.stages[1].blockedBy[0]).toBe(pipeline.stages[0].task);
    // Third stage blocked by second
    expect(pipeline.stages[2].blockedBy).toHaveLength(1);
    expect(pipeline.stages[2].blockedBy[0]).toBe(pipeline.stages[1].task);
  });

  it('builder generates unique task refs', async () => {
    const { createPipeline } = await import('../../../src/components/swarm/index.js');

    const pipeline = createPipeline('Test')
      .task('Task A', 'a')
      .task('Task B', 'b')
      .build();

    expect(pipeline.tasks.a).toBeDefined();
    expect(pipeline.tasks.b).toBeDefined();
    expect(pipeline.tasks.a).not.toBe(pipeline.tasks.b);
  });
});
