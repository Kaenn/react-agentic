/**
 * Grammar Tests: SuccessCriteria Component
 *
 * Tests SuccessCriteria for checkbox-style criteria lists.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent } from '../_helpers/test-utils.js';

describe('<SuccessCriteria>', () => {
  describe('type safety', () => {
    it('compiles with string items', () => {
      const content = `
        <SuccessCriteria items={['First criterion', 'Second criterion']} />
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });

    it('compiles with object items', () => {
      const content = `
        <SuccessCriteria items={[
          { text: 'Checked item', checked: true },
          { text: 'Unchecked item', checked: false }
        ]} />
      `;
      expect(() => transformAgentContent(content)).not.toThrow();
    });
  });

  describe('output correctness', () => {
    it('emits success_criteria XML block', () => {
      const output = transformAgentContent(`
        <SuccessCriteria items={['Test criterion']} />
      `);
      expect(output).toContain('<success_criteria>');
      expect(output).toContain('</success_criteria>');
    });

    it('emits unchecked checkboxes by default', () => {
      const output = transformAgentContent(`
        <SuccessCriteria items={['First', 'Second']} />
      `);
      expect(output).toContain('- [ ] First');
      expect(output).toContain('- [ ] Second');
    });

    it('emits checked checkboxes when specified', () => {
      const output = transformAgentContent(`
        <SuccessCriteria items={[
          { text: 'Done', checked: true },
          { text: 'Pending', checked: false }
        ]} />
      `);
      expect(output).toContain('- [x] Done');
      expect(output).toContain('- [ ] Pending');
    });
  });

  describe('mixed items', () => {
    it('handles mix of string and object items', () => {
      const output = transformAgentContent(`
        <SuccessCriteria items={[
          'Simple string',
          { text: 'Object item', checked: true }
        ]} />
      `);
      expect(output).toContain('- [ ] Simple string');
      expect(output).toContain('- [x] Object item');
    });
  });
});
