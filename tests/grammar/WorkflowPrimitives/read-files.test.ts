/**
 * Grammar Tests: ReadFiles Component
 *
 * Tests ReadFiles for batch file reading using defineFiles schema.
 * ReadFiles requires a defineFiles() result, not a plain array.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<ReadFiles>', () => {
  describe('type safety', () => {
    it('compiles with defineFiles schema', () => {
      const tsx = `
        const files = defineFiles({
          state: { path: 'STATE.md', required: true }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });

    it('accepts multiple files in schema', () => {
      const tsx = `
        const files = defineFiles({
          fileA: { path: 'a.md', required: true },
          fileB: { path: 'b.md', required: false }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentContent(tsx, true)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits bash code block', () => {
      const tsx = `
        const files = defineFiles({
          state: { path: 'STATE.md', required: true }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('```bash');
    });

    it('emits cat command for required files', () => {
      const tsx = `
        const files = defineFiles({
          state: { path: '.planning/STATE.md', required: true }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('cat .planning/STATE.md');
      // Required files don't suppress errors
    });

    it('emits cat with error suppression for optional files', () => {
      const tsx = `
        const files = defineFiles({
          optional: { path: 'optional.md', required: false }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('optional.md');
      expect(output).toContain('2>/dev/null');
    });

    it('handles variable references in paths', () => {
      const tsx = `
        const files = defineFiles({
          plan: { path: '$PHASE_DIR/PLAN.md', required: true }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('PHASE_DIR');
      expect(output).toContain('PLAN.md');
    });
  });

  describe('multiple files', () => {
    it('emits all files in sequence', () => {
      const tsx = `
        const files = defineFiles({
          fileA: { path: 'a.md', required: true },
          fileB: { path: 'b.md', required: true },
          fileC: { path: 'c.md', required: false }
        });
        export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <ReadFiles files={files} />
            </Agent>
          );
        }
      `;
      const output = transformAgentContent(tsx, true);
      expect(output).toContain('a.md');
      expect(output).toContain('b.md');
      expect(output).toContain('c.md');
    });
  });
});
