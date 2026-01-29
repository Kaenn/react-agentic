/**
 * Grammar Tests: Line Break (<br>)
 *
 * Tests line break element transformation.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Line Break (<br>)', () => {
  describe('type safety', () => {
    it('compiles as self-closing element', () => {
      const content = '<p>Line one<br />Line two</p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('inserts line break in output', () => {
      const output = transformAgentContent('<p>Line one<br />Line two</p>');
      expect(output).toContain('Line one\nLine two');
    });

    it('handles multiple line breaks', () => {
      const output = transformAgentContent('<p>A<br />B<br />C</p>');
      expect(output).toContain('A\nB\nC');
    });
  });

  describe('line break in context', () => {
    it('works within inline formatting', () => {
      const output = transformAgentContent('<p><b>Bold<br />text</b></p>');
      expect(output).toContain('**Bold\ntext**');
    });
  });
});
