/**
 * Grammar Tests: ExecutionContext Component
 *
 * Tests ExecutionContext for @-prefixed file references.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<ExecutionContext>', () => {
  describe('type safety', () => {
    it('compiles with paths prop', () => {
      const content = '<ExecutionContext paths={["file.md"]} />';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts prefix prop', () => {
      const content = '<ExecutionContext paths={["file.md"]} prefix="$" />';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits execution_context XML block', () => {
      const output = transformAgentContent('<ExecutionContext paths={["STATE.md"]} />');
      expect(output).toContain('<execution_context>');
      expect(output).toContain('</execution_context>');
    });

    it('emits paths with @ prefix by default', () => {
      const output = transformAgentContent('<ExecutionContext paths={["STATE.md", "PLAN.md"]} />');
      expect(output).toContain('@STATE.md');
      expect(output).toContain('@PLAN.md');
    });

    it('uses custom prefix', () => {
      const output = transformAgentContent('<ExecutionContext paths={["file.md"]} prefix="$" />');
      expect(output).toContain('$file.md');
    });

    it('handles paths with directories', () => {
      const output = transformAgentContent('<ExecutionContext paths={[".planning/STATE.md"]} />');
      expect(output).toContain('@.planning/STATE.md');
    });
  });

  describe('multiple paths', () => {
    it('emits each path on separate line', () => {
      const output = transformAgentContent(`
        <ExecutionContext paths={["a.md", "b.md", "c.md"]} />
      `);
      const lines = output.split('\n');
      expect(lines.some(l => l.includes('@a.md'))).toBe(true);
      expect(lines.some(l => l.includes('@b.md'))).toBe(true);
      expect(lines.some(l => l.includes('@c.md'))).toBe(true);
    });
  });

  describe('children content', () => {
    it('renders children after paths', () => {
      const output = transformAgentContent(`
        <ExecutionContext paths={["file.md"]}>
          <p>Additional context</p>
        </ExecutionContext>
      `);
      expect(output).toContain('@file.md');
      expect(output).toContain('Additional context');
      expect(output).toContain('</execution_context>');
    });
  });
});
