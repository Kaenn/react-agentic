/**
 * Grammar Tests: Paragraph (<p>)
 *
 * Tests paragraph element transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Paragraph (<p>)', () => {
  describe('type safety', () => {
    it('compiles with text content', () => {
      const content = '<p>Simple paragraph</p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts inline children', () => {
      const content = '<p>Text with <b>bold</b> and <i>italic</i></p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits plain text', () => {
      const output = transformAgentContent('<p>Simple paragraph</p>');
      expect(output).toContain('Simple paragraph');
    });

    it('emits mixed inline content', () => {
      const output = transformAgentContent("<p>Text with <b>bold</b>{' '}and{' '}<i>italic</i></p>");
      expect(output).toContain('Text with **bold** and *italic*');
    });

    it('emits inline code', () => {
      const output = transformAgentContent('<p>Run <code>npm install</code> first</p>');
      expect(output).toContain('Run `npm install` first');
    });

    it('emits links', () => {
      const output = transformAgentContent('<p>Visit <a href="https://example.com">our site</a></p>');
      expect(output).toContain('Visit [our site](https://example.com)');
    });
  });

  describe('whitespace handling', () => {
    it('normalizes multiple spaces', () => {
      const output = transformAgentContent('<p>Multiple    spaces   here</p>');
      expect(output).toContain('Multiple spaces here');
    });

    it('trims leading/trailing whitespace', () => {
      const output = transformAgentContent('<p>   Trimmed   </p>');
      expect(output).toContain('Trimmed');
    });

    it('handles multiline content', () => {
      const output = transformAgentContent(`<p>
        Line one
        Line two
      </p>`);
      expect(output).toContain('Line one Line two');
    });
  });

  describe('multiple paragraphs', () => {
    it('separates paragraphs with blank lines', () => {
      const output = transformAgentContent(`
        <p>First paragraph</p>
        <p>Second paragraph</p>
      `);
      expect(output).toContain('First paragraph\n\nSecond paragraph');
    });
  });
});
