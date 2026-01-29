/**
 * Grammar Tests: List Component
 *
 * Tests List component with structured items prop.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<List>', () => {
  describe('type safety', () => {
    it('compiles with items prop', () => {
      const content = `<List items={['Item 1', 'Item 2']} />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts ordered prop', () => {
      const content = `<List items={['One', 'Two']} ordered />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('accepts start prop', () => {
      const content = `<List items={['Fifth', 'Sixth']} ordered start={5} />`;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits unordered list by default', () => {
      const output = transformAgentContent(`
        <List items={['First', 'Second', 'Third']} />
      `);
      expect(output).toContain('- First');
      expect(output).toContain('- Second');
      expect(output).toContain('- Third');
    });

    it('emits ordered list when ordered prop', () => {
      const output = transformAgentContent(`
        <List items={['First', 'Second']} ordered />
      `);
      expect(output).toContain('1. First');
      expect(output).toContain('2. Second');
    });

    it('respects start prop for ordered', () => {
      const output = transformAgentContent(`
        <List items={['Fifth', 'Sixth']} ordered start={5} />
      `);
      expect(output).toContain('5. Fifth');
      expect(output).toContain('6. Sixth');
    });
  });

  describe('empty list', () => {
    it('handles empty items array', () => {
      const output = transformAgentContent(`<List items={[]} />`);
      // Should not throw and produce minimal output
      expect(() => transformAgentContent(`<List items={[]} />`)).not.toThrow();
    });
  });

  describe('item content', () => {
    it('handles items with special characters', () => {
      const output = transformAgentContent(`
        <List items={['Item with **markdown**', 'Item with \`code\`']} />
      `);
      expect(output).toContain('- Item with **markdown**');
      expect(output).toContain('- Item with `code`');
    });
  });
});
