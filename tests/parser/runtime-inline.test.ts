/**
 * Runtime Inline Tests
 *
 * Tests for RuntimeVar interpolation output format.
 * Verifies shell variable syntax ($VAR.path) is emitted correctly.
 */

import { describe, it, expect } from 'vitest';
import { transformCommand } from '../grammar/_helpers/test-utils.js';

describe('RuntimeVar Interpolation Output Format', () => {
  describe('shell variable syntax', () => {
    it('emits $VAR for root reference', () => {
      const tsx = `
        const ctx = useRuntimeVar<string>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Value: {ctx}</p>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX');
      // Should NOT contain jq expression
      expect(output).not.toContain('jq -r');
      expect(output).not.toContain('$(echo');
    });

    it('emits $VAR.property for single property access', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ status: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Status: {ctx.status}</p>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX.status');
      // Should NOT contain jq expression
      expect(output).not.toContain('jq -r');
    });

    it('emits $VAR.nested.path for nested property access', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ data: { user: { name: string } } }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Name: {ctx.data.user.name}</p>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX.data.user.name');
    });

    it('emits shell variable in template literal', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ phase: string; plan: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Working on: {\`Phase \${ctx.phase}, Plan \${ctx.plan}\`}</p>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX.phase');
      expect(output).toContain('$CTX.plan');
    });

    it('emits shell variable in inline code element', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ path: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>File: <code>{ctx.path}</code></p>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX.path');
    });
  });

  describe('multiple variables', () => {
    it('handles multiple RuntimeVars in same output', () => {
      const tsx = `
        const input = useRuntimeVar<string>('INPUT');
        const output = useRuntimeVar<string>('OUTPUT');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>From {input} to {output}</p>
            </Command>
          );
        }
      `;
      const md = transformCommand(tsx);
      expect(md).toContain('$INPUT');
      expect(md).toContain('$OUTPUT');
    });

    it('handles nested paths from different variables', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ phase: string }>('CTX');
        const result = useRuntimeVar<{ status: string }>('RESULT');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <p>Phase {ctx.phase}: {result.status}</p>
            </Command>
          );
        }
      `;
      const md = transformCommand(tsx);
      expect(md).toContain('$CTX.phase');
      expect(md).toContain('$RESULT.status');
    });
  });

  describe('headings with RuntimeVar', () => {
    it('emits shell variable in heading', () => {
      const tsx = `
        const ctx = useRuntimeVar<{ title: string }>('CTX');
        export default function Doc() {
          return (
            <Command name="test" description="Test">
              <h2>Task: {ctx.title}</h2>
            </Command>
          );
        }
      `;
      const output = transformCommand(tsx);
      expect(output).toContain('$CTX.title');
    });
  });
});
