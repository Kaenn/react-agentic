/**
 * Grammar Tests: PromptTemplate Component
 *
 * Tests PromptTemplate for code fence wrapping.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<PromptTemplate>', () => {
  describe('type safety', () => {
    it('compiles with children', () => {
      const content = `
        <PromptTemplate>
          <p>Template content</p>
        </PromptTemplate>
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('wraps content in markdown code fence', () => {
      const output = transformAgentContent(`
        <PromptTemplate>
          <p>Template text</p>
        </PromptTemplate>
      `);
      expect(output).toContain('```markdown');
      expect(output).toContain('Template text');
      expect(output).toContain('```');
    });

    it('preserves internal markdown', () => {
      const output = transformAgentContent(`
        <PromptTemplate>
          <h2>Title</h2>
          <p>Paragraph content</p>
          <ul>
            <li>Item</li>
          </ul>
        </PromptTemplate>
      `);
      expect(output).toContain('```markdown');
      expect(output).toContain('## Title');
      expect(output).toContain('Paragraph content');
      expect(output).toContain('- Item');
    });
  });

  describe('use case', () => {
    it('used for embedding prompts without nested escaping', () => {
      const output = transformAgentContent(`
        <PromptTemplate>
          <p>You are a helpful assistant.</p>
          <p>Follow these guidelines:</p>
          <ul>
            <li>Be concise</li>
            <li>Be accurate</li>
          </ul>
        </PromptTemplate>
      `);
      // Should be wrapped in markdown code fence to avoid escaping issues
      expect(output).toContain('```markdown');
      expect(output).toContain('You are a helpful assistant');
    });
  });
});
