/**
 * Meta-prompting transformer tests
 *
 * Tests for ReadFile component transformation.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentTsx, transformAgentContent } from '../grammar/_helpers/test-utils.js';

describe('transformReadFile', () => {
  describe('required files', () => {
    it('transforms basic ReadFile to IR', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path=".planning/STATE.md" as="STATE_CONTENT" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);

      // Find readFile node in children
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');
      expect(readFileNode).toBeDefined();
      expect(readFileNode).toMatchObject({
        kind: 'readFile',
        path: '.planning/STATE.md',
        varName: 'STATE_CONTENT',
        required: true,
      });
    });

    it('handles path with variable reference', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path="\${PHASE_DIR}/*-CONTEXT.md" as="CONTEXT" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);

      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');
      expect(readFileNode).toMatchObject({
        kind: 'readFile',
        path: '${PHASE_DIR}/*-CONTEXT.md',
        varName: 'CONTEXT',
        required: true,
      });
    });
  });

  describe('optional files', () => {
    it('transforms optional ReadFile', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path=".planning/REQUIREMENTS.md" as="REQS" optional />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);

      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');
      expect(readFileNode).toMatchObject({
        kind: 'readFile',
        path: '.planning/REQUIREMENTS.md',
        varName: 'REQS',
        required: false,
      });
    });

    it('handles optional={true} syntax', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path="file.md" as="FILE" optional={true} />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);

      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');
      expect(readFileNode?.required).toBe(false);
    });
  });

  describe('error cases', () => {
    it('throws when path prop missing', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile as="STATE" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentTsx(tsx)).toThrow(/path/i);
    });

    it('throws when as prop missing', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path=".planning/STATE.md" />
            </Agent>
          );
        }
      `;
      expect(() => transformAgentTsx(tsx)).toThrow(/as/i);
    });
  });
});
