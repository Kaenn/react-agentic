/**
 * Grammar Tests: Lists (<ul>, <ol>, <li>)
 *
 * Tests HTML list elements transformation to markdown.
 */

import { describe, it, expect } from 'vitest';
import { transformAgentContent, expectAgentTransformError, wrapInAgent } from '../_helpers/test-utils.js';

describe('Lists (<ul>, <ol>, <li>)', () => {
  describe('unordered list (<ul>)', () => {
    describe('type safety', () => {
      it('compiles with li children', () => {
        const content = `<ul><li>Item</li></ul>`;
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits unordered list with dash markers', () => {
        const output = transformAgentContent(`
          <ul>
            <li>First item</li>
            <li>Second item</li>
          </ul>
        `);
        expect(output).toContain('- First item');
        expect(output).toContain('- Second item');
      });

      it('preserves inline formatting in list items', () => {
        const output = transformAgentContent(`
          <ul>
            <li><b>Bold</b> item</li>
            <li><i>Italic</i> item</li>
          </ul>
        `);
        expect(output).toContain('- **Bold**');
        expect(output).toContain('- *Italic*');
      });
    });
  });

  describe('ordered list (<ol>)', () => {
    describe('type safety', () => {
      it('compiles with li children', () => {
        const content = `<ol><li>Item</li></ol>`;
        expect(() => transformAgentContent(content)).not.toThrow();
      });

      it('accepts start prop', () => {
        const content = `<ol start={5}><li>Item</li></ol>`;
        expect(() => transformAgentContent(content)).not.toThrow();
      });
    });

    describe('output correctness', () => {
      it('emits ordered list with numbers', () => {
        const output = transformAgentContent(`
          <ol>
            <li>First</li>
            <li>Second</li>
            <li>Third</li>
          </ol>
        `);
        expect(output).toContain('1. First');
        expect(output).toContain('2. Second');
        expect(output).toContain('3. Third');
      });

      // Note: The 'start' prop is defined in HTML but not currently extracted by the
      // V1 transformer. The emitter supports it, but the transformer doesn't pass it through.
      // This test documents current behavior - start prop is ignored.
      it('ignores start prop (not implemented in transformer)', () => {
        const output = transformAgentContent(`
          <ol start={5}>
            <li>Fifth</li>
            <li>Sixth</li>
          </ol>
        `);
        // Currently ignores start prop - always starts at 1
        expect(output).toContain('1. Fifth');
        expect(output).toContain('2. Sixth');
      });
    });
  });

  describe('nested lists', () => {
    it('handles nested unordered list', () => {
      const output = transformAgentContent(`
        <ul>
          <li>Parent
            <ul>
              <li>Child</li>
            </ul>
          </li>
        </ul>
      `);
      expect(output).toContain('- Parent');
      expect(output).toContain('  - Child');
    });

    it('handles nested ordered list', () => {
      const output = transformAgentContent(`
        <ol>
          <li>Parent
            <ol>
              <li>Child</li>
            </ol>
          </li>
        </ol>
      `);
      expect(output).toContain('1. Parent');
      expect(output).toContain('  1. Child');
    });

    it('handles mixed nesting (ordered inside unordered)', () => {
      const output = transformAgentContent(`
        <ul>
          <li>Parent
            <ol>
              <li>Numbered child</li>
            </ol>
          </li>
        </ul>
      `);
      expect(output).toContain('- Parent');
      expect(output).toContain('  1. Numbered child');
    });

    it('handles deep nesting (3 levels)', () => {
      const output = transformAgentContent(`
        <ul>
          <li>Level 1
            <ul>
              <li>Level 2
                <ul>
                  <li>Level 3</li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `);
      expect(output).toContain('- Level 1');
      expect(output).toContain('  - Level 2');
      expect(output).toContain('    - Level 3');
    });
  });

  describe('nesting constraints (C3, C4)', () => {
    it('throws for non-li children in ul (C4)', () => {
      const tsx = wrapInAgent(`
        <ul>
          <p>Not a list item</p>
        </ul>
      `);
      expectAgentTransformError(tsx, /Expected <li> inside list/);
    });

    it('throws for non-li children in ol (C4)', () => {
      const tsx = wrapInAgent(`
        <ol>
          <p>Not a list item</p>
        </ol>
      `);
      expectAgentTransformError(tsx, /Expected <li> inside list/);
    });
  });
});
