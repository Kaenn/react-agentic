import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode, type HeadingNode } from '../../src/index.js';

/**
 * Helper to create a document with a single heading
 */
function headingDoc(heading: HeadingNode): DocumentNode {
  return {
    kind: 'document',
    children: [heading],
  };
}

describe('Heading emission', () => {
  describe('heading levels', () => {
    it('emits heading level 1', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 1,
        children: [{ kind: 'text', value: 'Hello World' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "# Hello World
        "
      `);
    });

    it('emits heading level 2', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 2,
        children: [{ kind: 'text', value: 'Section' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "## Section
        "
      `);
    });

    it('emits heading level 3', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 3,
        children: [{ kind: 'text', value: 'Subsection' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "### Subsection
        "
      `);
    });

    it('emits heading level 4', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 4,
        children: [{ kind: 'text', value: 'Minor Section' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "#### Minor Section
        "
      `);
    });

    it('emits heading level 5', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 5,
        children: [{ kind: 'text', value: 'Sub-subsection' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "##### Sub-subsection
        "
      `);
    });

    it('emits heading level 6', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 6,
        children: [{ kind: 'text', value: 'Smallest' }],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "###### Smallest
        "
      `);
    });
  });

  describe('heading with inline formatting', () => {
    it('emits heading with bold text', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 2,
        children: [
          { kind: 'text', value: 'This is ' },
          { kind: 'bold', children: [{ kind: 'text', value: 'important' }] },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "## This is **important**
        "
      `);
    });

    it('emits heading with italic text', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 3,
        children: [
          { kind: 'text', value: 'The ' },
          { kind: 'italic', children: [{ kind: 'text', value: 'Odyssey' }] },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "### The *Odyssey*
        "
      `);
    });

    it('emits heading with inline code', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 2,
        children: [
          { kind: 'text', value: 'Using ' },
          { kind: 'inlineCode', value: 'useState' },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "## Using \`useState\`
        "
      `);
    });

    it('emits heading with mixed formatting', () => {
      const doc = headingDoc({
        kind: 'heading',
        level: 1,
        children: [
          { kind: 'bold', children: [{ kind: 'text', value: 'Bold' }] },
          { kind: 'text', value: ' and ' },
          { kind: 'italic', children: [{ kind: 'text', value: 'italic' }] },
          { kind: 'text', value: ' in ' },
          { kind: 'inlineCode', value: 'code' },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "# **Bold** and *italic* in \`code\`
        "
      `);
    });
  });
});
