/**
 * Grammar Tests: SpawnAgent Component
 *
 * Tests SpawnAgent component for Task() syntax generation.
 */

import { describe, it, expect } from 'vitest';
import { transformCommandContent, transformCommand } from '../_helpers/test-utils.js';

describe('<SpawnAgent>', () => {
  describe('type safety', () => {
    it('compiles with required props', () => {
      const content = `
        <SpawnAgent
          agent="researcher"
          model="haiku"
          description="Research task"
          prompt="Find information"
        />
      `;
      expect(() => transformCommandContent(content)).not.toThrow();
    });

    it('accepts output prop', () => {
      const tsx = `
        const result = useRuntimeVar<any>('RESULT');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent
                agent="researcher"
                model="haiku"
                description="Research"
                prompt="Do research"
                output={result}
              />
            </Command>
          );
        }
      `;
      expect(() => transformCommand(tsx)).not.toThrow();
    });

    it('accepts loadFromFile prop', () => {
      const content = `
        <SpawnAgent
          agent="custom"
          model="sonnet"
          description="Custom agent"
          loadFromFile=".claude/agents/custom.md"
          prompt="Run custom"
        />
      `;
      expect(() => transformCommandContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits Task() syntax', () => {
      const output = transformCommandContent(`
        <SpawnAgent
          agent="researcher"
          model="haiku"
          description="Research task"
          prompt="Find information about X"
        />
      `);
      expect(output).toContain('Task(');
      expect(output).toContain('subagent_type="researcher"');
      expect(output).toContain('model="haiku"');
      expect(output).toContain('description="Research task"');
    });

    it('emits prompt content', () => {
      const output = transformCommandContent(`
        <SpawnAgent
          agent="test"
          model="haiku"
          description="Test"
          prompt="Do something specific"
        />
      `);
      expect(output).toContain('Do something specific');
    });

    it('emits output capture instruction', () => {
      const tsx = `
        const result = useRuntimeVar<any>('RESULT');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent
                agent="test"
                model="haiku"
                description="Test"
                prompt="Do task"
                output={result}
              />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$RESULT');
    });
  });

  describe('loadFromFile', () => {
    it('emits general-purpose agent with file read instruction', () => {
      const output = transformCommandContent(`
        <SpawnAgent
          agent="custom"
          model="sonnet"
          description="Custom task"
          loadFromFile=".claude/agents/custom.md"
          prompt="Do custom task"
        />
      `);
      expect(output).toContain('subagent_type="general-purpose"');
      expect(output).toContain('.claude/agents/custom.md');
    });
  });

  describe('input object', () => {
    it('formats input properties as XML sections', () => {
      const tsx = `
        const ctx = useRuntimeVar<any>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent
                agent="test"
                model="haiku"
                description="Test"
                input={{
                  query: "find bugs",
                  context: ctx
                }}
              />
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('<query>');
      expect(output).toContain('find bugs');
      expect(output).toContain('</query>');
    });
  });
});
