/**
 * Grammar Tests: Indent Component
 *
 * Tests Indent component for indented content blocks.
 * Indent is implemented in the V3 runtime transformer.
 */

import { describe, it, expect } from 'vitest';
import { transformCommandContent } from '../_helpers/test-utils.js';

describe('<Indent>', () => {
  describe('type safety', () => {
    it('compiles with children', () => {
      const output = transformCommandContent('<Indent><p>Content</p></Indent>');
      expect(output).toBeDefined();
    });

    it('accepts spaces prop', () => {
      const output = transformCommandContent('<Indent spaces={4}><p>Content</p></Indent>');
      expect(output).toBeDefined();
    });
  });

  describe('output correctness', () => {
    it('indents content with default spaces (2)', () => {
      const output = transformCommandContent('<Indent><p>Content</p></Indent>');
      expect(output).toContain('  Content');
    });

    it('indents content with custom spaces', () => {
      const output = transformCommandContent('<Indent spaces={4}><p>Content</p></Indent>');
      expect(output).toContain('    Content');
    });

    it('indents each line of multiline content', () => {
      const output = transformCommandContent(`
        <Indent spaces={2}>
          <p>Line 1</p>
          <p>Line 2</p>
        </Indent>
      `);
      expect(output).toContain('  Line 1');
      expect(output).toContain('  Line 2');
    });
  });

  describe('nested content', () => {
    it('indents block elements', () => {
      const output = transformCommandContent(`
        <Indent spaces={2}>
          <h2>Title</h2>
          <p>Paragraph</p>
        </Indent>
      `);
      expect(output).toContain('  ## Title');
      expect(output).toContain('  Paragraph');
    });

    it('handles nested Indent', () => {
      const output = transformCommandContent(`
        <Indent spaces={2}>
          <Indent spaces={2}>
            <p>Double indented</p>
          </Indent>
        </Indent>
      `);
      expect(output).toContain('    Double indented');
    });
  });
});
