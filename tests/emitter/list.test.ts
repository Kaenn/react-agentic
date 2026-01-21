import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode, type ListNode } from '../../src/index.js';

/**
 * Helper to create a document with a single list
 */
function listDoc(list: ListNode): DocumentNode {
  return {
    kind: 'document',
    children: [list],
  };
}

describe('List emission', () => {
  describe('unordered lists', () => {
    it('emits unordered list with simple items', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'First item' }] },
            ],
          },
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Second item' }] },
            ],
          },
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Third item' }] },
            ],
          },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "- First item
        - Second item
        - Third item
        "
      `);
    });

    it('uses dash markers for unordered lists', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Item' }] },
            ],
          },
        ],
      });

      expect(emit(doc)).toContain('- Item');
    });
  });

  describe('ordered lists', () => {
    it('emits ordered list with simple items', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: true,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'First item' }] },
            ],
          },
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Second item' }] },
            ],
          },
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Third item' }] },
            ],
          },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "1. First item
        2. Second item
        3. Third item
        "
      `);
    });
  });

  describe('nested lists', () => {
    it('emits nested unordered list (2 levels)', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Parent item' }] },
              {
                kind: 'list',
                ordered: false,
                items: [
                  {
                    kind: 'listItem',
                    children: [
                      { kind: 'paragraph', children: [{ kind: 'text', value: 'Child item 1' }] },
                    ],
                  },
                  {
                    kind: 'listItem',
                    children: [
                      { kind: 'paragraph', children: [{ kind: 'text', value: 'Child item 2' }] },
                    ],
                  },
                ],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Another parent' }] },
            ],
          },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "- Parent item
          - Child item 1
          - Child item 2
        - Another parent
        "
      `);
    });

    it('emits nested mixed list (unordered containing ordered)', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Steps to follow:' }] },
              {
                kind: 'list',
                ordered: true,
                items: [
                  {
                    kind: 'listItem',
                    children: [
                      { kind: 'paragraph', children: [{ kind: 'text', value: 'First step' }] },
                    ],
                  },
                  {
                    kind: 'listItem',
                    children: [
                      { kind: 'paragraph', children: [{ kind: 'text', value: 'Second step' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "- Steps to follow:
          1. First step
          2. Second step
        "
      `);
    });

    it('verifies correct indentation for nested items', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              { kind: 'paragraph', children: [{ kind: 'text', value: 'Level 1' }] },
              {
                kind: 'list',
                ordered: false,
                items: [
                  {
                    kind: 'listItem',
                    children: [
                      { kind: 'paragraph', children: [{ kind: 'text', value: 'Level 2' }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });

      const output = emit(doc);
      // Top level has no indent
      expect(output).toContain('- Level 1');
      // Nested level has 2-space indent
      expect(output).toContain('  - Level 2');
    });
  });

  describe('list items with formatting', () => {
    it('emits list items with bold text', () => {
      const doc = listDoc({
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [
                  { kind: 'bold', children: [{ kind: 'text', value: 'Important' }] },
                  { kind: 'text', value: ': do this' },
                ],
              },
            ],
          },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "- **Important**: do this
        "
      `);
    });
  });
});
