/**
 * ReadFile template literal and RuntimeVar tests
 *
 * Tests for ReadFile path prop handling with template literals
 * and RuntimeVar property access.
 *
 * Emitter tests for smart quoting are in tests/emitter/meta-prompting.test.ts
 */

import { describe, it, expect } from 'vitest';
import { transformAgentTsx } from '../grammar/_helpers/test-utils.js';

describe('ReadFile with template literals', () => {
  describe('transformer - path prop handling', () => {
    it('handles static string path', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path=".planning/STATE.md" as="STATE" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');

      expect(readFileNode).toMatchObject({
        kind: 'readFile',
        path: '.planning/STATE.md',
        varName: 'STATE',
        required: true,
      });
    });

    it('handles template literal path with shell variable', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path={\`\${PHASE_DIR}/STATE.md\`} as="STATE" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');

      // Shell variable preserved as-is
      expect(readFileNode?.path).toBe('${PHASE_DIR}/STATE.md');
    });

    it('handles glob pattern in path', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path={\`\${PHASE_DIR}/*-PLAN.md\`} as="PLANS" optional />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');

      // Glob preserved
      expect(readFileNode?.path).toBe('${PHASE_DIR}/*-PLAN.md');
      expect(readFileNode?.required).toBe(false);
    });

    it('handles no-substitution template literal', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path={\`.planning/STATE.md\`} as="STATE" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');

      expect(readFileNode?.path).toBe('.planning/STATE.md');
    });

    it('handles string literal in JSX expression', () => {
      const tsx = `
        export default function Doc() {
          return (
            <Agent name="test" description="test">
              <ReadFile path={".planning/STATE.md"} as="STATE" />
            </Agent>
          );
        }
      `;
      const doc = transformAgentTsx(tsx);
      const readFileNode = doc.children.find((c: any) => c.kind === 'readFile');

      expect(readFileNode?.path).toBe('.planning/STATE.md');
    });
  });
});
