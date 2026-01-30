/**
 * Grammar Tests: Emphasis (<b>, <strong>, <i>, <em>)
 *
 * Tests inline emphasis element transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('Emphasis Elements', () => {
  describe('<b> (bold)', () => {
    describe('type safety', () => {
      it('compiles with text content', () => {
        const content = '<p><b>bold text</b></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });

      it('accepts nested inline elements', () => {
        const content = '<p><b><i>bold italic</i></b></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits with ** markers', () => {
        const output = transformAgentContent('<p><b>bold text</b></p>');
        expect(output).toContain('**bold text**');
      });
    });
  });

  describe('<strong> (bold)', () => {
    describe('type safety', () => {
      it('compiles with text content', () => {
        const content = '<p><strong>strong text</strong></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits with ** markers (same as <b>)', () => {
        const output = transformAgentContent('<p><strong>strong text</strong></p>');
        expect(output).toContain('**strong text**');
      });
    });
  });

  describe('<i> (italic)', () => {
    describe('type safety', () => {
      it('compiles with text content', () => {
        const content = '<p><i>italic text</i></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });

      it('accepts nested inline elements', () => {
        const content = '<p><i><b>italic bold</b></i></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits with * markers', () => {
        const output = transformAgentContent('<p><i>italic text</i></p>');
        expect(output).toContain('*italic text*');
      });
    });
  });

  describe('<em> (italic)', () => {
    describe('type safety', () => {
      it('compiles with text content', () => {
        const content = '<p><em>emphasized text</em></p>';
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits with * markers (same as <i>)', () => {
        const output = transformAgentContent('<p><em>emphasized text</em></p>');
        expect(output).toContain('*emphasized text*');
      });
    });
  });

  describe('nested emphasis', () => {
    it('handles bold inside italic', () => {
      const output = transformAgentContent('<p><i><b>bold and italic</b></i></p>');
      expect(output).toContain('***bold and italic***');
    });

    it('handles italic inside bold', () => {
      const output = transformAgentContent('<p><b><i>bold and italic</i></b></p>');
      expect(output).toContain('***bold and italic***');
    });
  });

  describe('emphasis in context', () => {
    it('works in headings', () => {
      const output = transformAgentContent('<h1>Title with <b>bold</b></h1>');
      expect(output).toContain('# Title with **bold**');
    });

    it('works in list items', () => {
      const output = transformAgentContent('<ul><li><b>Bold</b> item</li></ul>');
      expect(output).toContain('- **Bold**');
    });

    it('works in blockquotes', () => {
      const output = transformAgentContent('<blockquote><p><i>Quoted italic</i></p></blockquote>');
      expect(output).toContain('> *Quoted italic*');
    });
  });
});
