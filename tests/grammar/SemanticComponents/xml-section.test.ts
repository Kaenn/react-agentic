/**
 * Grammar Tests: XmlSection Component
 *
 * Tests XmlSection for dynamic XML blocks with custom tag names.
 * Similar to XmlBlock but with different naming convention.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<XmlSection>', () => {
  describe('type safety', () => {
    it('compiles with name prop', () => {
      const content = '<XmlSection name="rules"><p>Content</p></XmlSection>';
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles with children', () => {
      const content = `
        <XmlSection name="guidelines">
          <p>First guideline</p>
          <p>Second guideline</p>
        </XmlSection>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits XML tags with name', () => {
      const output = transformAgentContent('<XmlSection name="rules"><p>Follow these rules</p></XmlSection>');
      expect(output).toContain('<rules>');
      expect(output).toContain('Follow these rules');
      expect(output).toContain('</rules>');
    });

    it('handles empty XmlSection', () => {
      const output = transformAgentContent('<XmlSection name="placeholder" />');
      expect(output).toContain('<placeholder>');
      expect(output).toContain('</placeholder>');
    });

    it('handles complex nested content', () => {
      const output = transformAgentContent(`
        <XmlSection name="process">
          <h2>Step 1</h2>
          <p>Description</p>
          <ul>
            <li>Item A</li>
            <li>Item B</li>
          </ul>
        </XmlSection>
      `);
      expect(output).toContain('<process>');
      expect(output).toContain('## Step 1');
      expect(output).toContain('- Item A');
      expect(output).toContain('</process>');
    });
  });

  describe('nesting', () => {
    it('allows nested XmlSection', () => {
      const output = transformAgentContent(`
        <XmlSection name="outer">
          <XmlSection name="inner">
            <p>Nested content</p>
          </XmlSection>
        </XmlSection>
      `);
      expect(output).toContain('<outer>');
      expect(output).toContain('<inner>');
      expect(output).toContain('Nested content');
      expect(output).toContain('</inner>');
      expect(output).toContain('</outer>');
    });
  });
});
