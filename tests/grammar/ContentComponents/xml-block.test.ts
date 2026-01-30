/**
 * Grammar Tests: XmlBlock Component
 *
 * Tests XmlBlock component for Claude Code XML sections.
 * XmlBlock only has name prop - no attributes prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<XmlBlock>', () => {
  describe('type safety', () => {
    it('compiles with name prop', () => {
      const content = '<XmlBlock name="example"><p>Content</p></XmlBlock>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits XML tags with name', () => {
      const output = transformAgentContent('<XmlBlock name="example"><p>Content</p></XmlBlock>');
      expect(output).toContain('<example>');
      expect(output).toContain('Content');
      expect(output).toContain('</example>');
    });

    it('handles empty XmlBlock', () => {
      const output = transformAgentContent('<XmlBlock name="empty" />');
      expect(output).toContain('<empty>');
      expect(output).toContain('</empty>');
    });
  });

  describe('children content', () => {
    it('renders block children', () => {
      const output = transformAgentContent(`
        <XmlBlock name="example">
          <h2>Title</h2>
          <p>Paragraph</p>
        </XmlBlock>
      `);
      expect(output).toContain('<example>');
      expect(output).toContain('## Title');
      expect(output).toContain('Paragraph');
      expect(output).toContain('</example>');
    });

    it('renders nested XML blocks', () => {
      const output = transformAgentContent(`
        <XmlBlock name="outer">
          <XmlBlock name="inner">
            <p>Nested</p>
          </XmlBlock>
        </XmlBlock>
      `);
      expect(output).toContain('<outer>');
      expect(output).toContain('<inner>');
      expect(output).toContain('Nested');
      expect(output).toContain('</inner>');
      expect(output).toContain('</outer>');
    });
  });

  describe('common Claude Code patterns', () => {
    it('works for example blocks', () => {
      const output = transformAgentContent(`
        <XmlBlock name="example">
          <p>This is an example.</p>
        </XmlBlock>
      `);
      expect(output).toContain('<example>');
      expect(output).toContain('This is an example.');
      expect(output).toContain('</example>');
    });

    it('works for system-reminder', () => {
      const output = transformAgentContent(`
        <XmlBlock name="system-reminder">
          <p>Important note</p>
        </XmlBlock>
      `);
      expect(output).toContain('<system-reminder>');
      expect(output).toContain('Important note');
      expect(output).toContain('</system-reminder>');
    });
  });
});
