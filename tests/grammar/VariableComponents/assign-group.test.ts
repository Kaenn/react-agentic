/**
 * Grammar Tests: AssignGroup Component
 *
 * Tests AssignGroup for grouped variable assignments.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<AssignGroup>', () => {
  describe('type safety', () => {
    it('compiles with Assign children', () => {
      const tsx = `
        const A = useVariable("A");
        const B = useVariable("B");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={A} bash="echo a" />
                <Assign var={B} bash="echo b" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits single bash code block with all assignments', () => {
      const tsx = `
        const A = useVariable("A");
        const B = useVariable("B");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={A} bash="echo a" />
                <Assign var={B} bash="echo b" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should be one code block with both assignments
      expect(output).toContain('```bash');
      expect(output).toContain('A=$(echo a)');
      expect(output).toContain('B=$(echo b)');
      // Should only have one opening and one closing fence
      const fenceCount = (output.match(/```/g) || []).length;
      expect(fenceCount).toBe(2);
    });

    it('preserves comments with blank lines before', () => {
      const tsx = `
        const A = useVariable("A");
        const B = useVariable("B");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={A} bash="echo a" comment="First" />
                <Assign var={B} bash="echo b" comment="Second" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('# First');
      expect(output).toContain('# Second');
    });

    it('handles mixed assignment types', () => {
      const tsx = `
        const CMD = useVariable("CMD");
        const VAL = useVariable("VAL");
        const ENV_VAR = useVariable("ENV_VAR");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={CMD} bash="pwd" />
                <Assign var={VAL} value="static" />
                <Assign var={ENV_VAR} env="HOME" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('CMD=$(pwd)');
      expect(output).toContain('VAL=static');
      expect(output).toContain('ENV_VAR=$HOME');
    });
  });

  describe('blank line handling', () => {
    it('adds blank line before assignments with comments', () => {
      const tsx = `
        const A = useVariable("A");
        const B = useVariable("B");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={A} bash="echo a" />
                <Assign var={B} bash="echo b" comment="Has comment" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should have blank line before the comment
      const lines = output.split('\n');
      const commentIndex = lines.findIndex(l => l.includes('# Has comment'));
      if (commentIndex > 0) {
        expect(lines[commentIndex - 1].trim()).toBe('');
      }
    });

    it('handles br separator for blank lines', () => {
      const tsx = `
        const A = useVariable("A");
        const B = useVariable("B");
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <AssignGroup>
                <Assign var={A} bash="echo a" />
                <br />
                <Assign var={B} bash="echo b" />
              </AssignGroup>
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      // Should have blank line between A and B
      expect(output).toContain('A=$(echo a)');
      expect(output).toContain('B=$(echo b)');
    });
  });
});
