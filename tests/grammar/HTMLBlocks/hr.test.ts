/**
 * Grammar Tests: Horizontal Rule (<hr>)
 *
 * Tests hr element transformation to markdown thematic break.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Horizontal Rule (<hr>)', () => {
  describe('type safety', () => {
    it('compiles as self-closing element', () => {
      const content = '<hr />';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits as ---', () => {
      const output = transformAgentContent('<hr />');
      expect(output).toContain('---');
    });

    it('separates content above and below', () => {
      const output = transformAgentContent(`
        <p>Above</p>
        <hr />
        <p>Below</p>
      `);
      expect(output).toContain('Above');
      expect(output).toContain('---');
      expect(output).toContain('Below');
    });
  });

  describe('spacing', () => {
    it('has blank line before and after', () => {
      const output = transformAgentContent(`
        <p>Above</p>
        <hr />
        <p>Below</p>
      `);
      // Check that --- is separated by blank lines
      expect(output).toMatch(/Above\n\n---\n\nBelow/);
    });
  });
});
