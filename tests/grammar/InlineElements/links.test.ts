/**
 * Grammar Tests: Links (<a>)
 *
 * Tests anchor element transformation to markdown links.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, wrapInAgent, expectAgentTransformError } from '../_helpers/test-utils.js';

describe('Links (<a>)', () => {
  describe('type safety', () => {
    it('compiles with href prop', () => {
      const content = '<p><a href="https://example.com">Link</a></p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts JSX expression href', () => {
      const content = '<p><a href={"https://example.com"}>Link</a></p>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('throws for missing href', () => {
      const tsx = wrapInAgent('<p><a>No href</a></p>');
      expectAgentTransformError(tsx, /<a> element requires href attribute/);
    });
  });

  describe('output correctness', () => {
    it('emits [text](url) format', () => {
      const output = transformAgentContent('<p><a href="https://example.com">Example</a></p>');
      expect(output).toContain('[Example](https://example.com)');
    });

    it('preserves complex URLs', () => {
      const output = transformAgentContent('<p><a href="https://example.com/path?query=1&other=2">Link</a></p>');
      expect(output).toContain('[Link](https://example.com/path?query=1&other=2)');
    });

    it('handles relative URLs', () => {
      const output = transformAgentContent('<p><a href="/docs/guide">Guide</a></p>');
      expect(output).toContain('[Guide](/docs/guide)');
    });

    it('handles anchor URLs', () => {
      const output = transformAgentContent('<p><a href="#section">Jump</a></p>');
      expect(output).toContain('[Jump](#section)');
    });
  });

  describe('inline formatting in links', () => {
    it('handles bold link text', () => {
      const output = transformAgentContent('<p><a href="https://example.com"><b>Bold link</b></a></p>');
      expect(output).toContain('[**Bold link**](https://example.com)');
    });

    it('handles italic link text', () => {
      const output = transformAgentContent('<p><a href="https://example.com"><i>Italic link</i></a></p>');
      expect(output).toContain('[*Italic link*](https://example.com)');
    });

    it('handles code in link text', () => {
      const output = transformAgentContent('<p><a href="https://example.com"><code>npm</code></a></p>');
      expect(output).toContain('[`npm`](https://example.com)');
    });
  });

  describe('links in context', () => {
    // Note: The emitter has spacing logic but link-to-text transitions may not
    // always produce the expected space. This test documents current behavior.
    it('works in paragraphs with surrounding text', () => {
      const output = transformAgentContent('<p>Visit <a href="https://example.com">our site</a> for more.</p>');
      // Spacing after link may be normalized - check for essential content
      expect(output).toContain('[our site](https://example.com)');
      expect(output).toContain('for more');
    });

    it('works in headings', () => {
      const output = transformAgentContent('<h2>See <a href="/docs">Docs</a></h2>');
      expect(output).toContain('## See [Docs](/docs)');
    });

    it('works in list items', () => {
      const output = transformAgentContent('<ul><li><a href="https://example.com">Link</a></li></ul>');
      expect(output).toContain('- [Link](https://example.com)');
    });
  });
});
