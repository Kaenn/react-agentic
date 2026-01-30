/**
 * Grammar Tests: Inline Code (<code>)
 *
 * Tests inline code element transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Inline Code (<code>)', () => {
  describe('type safety', () => {
    it('compiles with text content', () => {
      const content = '<p><code>const x = 1</code></p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits with backtick markers', () => {
      const output = transformAgentContent('<p><code>const x = 1</code></p>');
      expect(output).toContain('`const x = 1`');
    });

    it('preserves special characters', () => {
      const output = transformAgentContent('<p><code>arr[0]</code></p>');
      expect(output).toContain('`arr[0]`');
    });

    it('preserves operators', () => {
      const output = transformAgentContent('<p><code>a && b || c</code></p>');
      expect(output).toContain('`a && b || c`');
    });
  });

  describe('inline code in context', () => {
    it('works in paragraphs with surrounding text', () => {
      const output = transformAgentContent('<p>Run <code>npm install</code> to start</p>');
      expect(output).toContain('Run `npm install` to start');
    });

    it('works in headings', () => {
      const output = transformAgentContent('<h2>Using <code>npm</code></h2>');
      expect(output).toContain('## Using `npm`');
    });

    it('works in list items', () => {
      const output = transformAgentContent('<ul><li>Run <code>npm test</code></li></ul>');
      expect(output).toContain('- Run `npm test`');
    });

    it('works multiple times in same paragraph', () => {
      const output = transformAgentContent('<p><code>npm</code> and <code>yarn</code></p>');
      expect(output).toContain('`npm`');
      expect(output).toContain('`yarn`');
    });
  });

  describe('whitespace handling', () => {
    // Note: The transformer normalizes whitespace in JSX text content.
    // Multiple spaces are collapsed to single space. This is JSX parsing behavior.
    it('normalizes internal whitespace', () => {
      const output = transformAgentContent('<p><code>a   b</code></p>');
      // Whitespace is normalized - multiple spaces become single space
      expect(output).toContain('`a b`');
    });

    it('preserves single spaces', () => {
      const output = transformAgentContent('<p><code>hello world</code></p>');
      expect(output).toContain('`hello world`');
    });
  });
});
