/**
 * Grammar Tests: Markdown Component
 *
 * Tests raw markdown passthrough component.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<Markdown>', () => {
  describe('type safety', () => {
    it('compiles with text content', () => {
      const content = '<Markdown># Pre-formatted</Markdown>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles with JSX expression', () => {
      const content = '<Markdown>{"# Dynamic"}</Markdown>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles self-closing (empty)', () => {
      const content = '<Markdown />';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('passes through raw markdown', () => {
      const output = transformAgentContent(`
        <Markdown>
          # Pre-formatted heading

          Some **bold** text.
        </Markdown>
      `);
      expect(output).toContain('# Pre-formatted heading');
      expect(output).toContain('**bold**');
    });

    it('handles JSX expression with string literal', () => {
      const output = transformAgentContent('<Markdown>{"# Dynamic heading"}</Markdown>');
      expect(output).toContain('# Dynamic heading');
    });

    it('handles empty Markdown component', () => {
      // Self-closing produces empty content, but should not throw
      expect(() => transformAgentContent('<Markdown />')).not.toThrow();
    });

    it('preserves internal formatting', () => {
      const output = transformAgentContent(`
        <Markdown>
          - Item 1
          - Item 2
            - Nested
        </Markdown>
      `);
      expect(output).toContain('- Item 1');
      expect(output).toContain('- Item 2');
      expect(output).toContain('- Nested');
    });
  });

  describe('whitespace handling', () => {
    it('trims outer whitespace', () => {
      const output = transformAgentContent(`
        <Markdown>
          Content here
        </Markdown>
      `);
      // Should not have leading/trailing newlines from JSX formatting
      expect(output).not.toMatch(/^\s*\n\s*Content/);
    });

    it('preserves internal blank lines', () => {
      const output = transformAgentContent(`
        <Markdown>
          Line one

          Line three
        </Markdown>
      `);
      expect(output).toContain('\n\n');
    });
  });

  describe('use cases', () => {
    it('works for pre-formatted tables', () => {
      const output = transformAgentContent(`
        <Markdown>
          | A | B |
          |---|---|
          | 1 | 2 |
        </Markdown>
      `);
      expect(output).toContain('| A | B |');
      expect(output).toContain('| 1 | 2 |');
    });

    it('works for HTML comments', () => {
      const output = transformAgentContent('<Markdown>{"<!-- Comment -->"}</Markdown>');
      expect(output).toContain('<!-- Comment -->');
    });
  });
});
