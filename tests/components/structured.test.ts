import { describe, expect, it } from 'vitest';
import { emit } from '../../src/index.js';
import type {
  TableNode,
  ListNode,
  IndentNode,
  DocumentNode,
} from '../../src/index.js';

describe('Structured Components', () => {
  describe('Table', () => {
    it('emits Table with basic headers and rows', () => {
      const tableNode: TableNode = {
        kind: 'table',
        headers: ['Name', 'Age', 'City'],
        rows: [
          ['Alice', '30', 'New York'],
          ['Bob', '25', 'San Francisco'],
          ['Charlie', '35', 'Seattle'],
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [tableNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Table with column alignment', () => {
      const tableNode: TableNode = {
        kind: 'table',
        headers: ['Item', 'Price', 'Quantity'],
        rows: [
          ['Apple', '$1.50', '10'],
          ['Banana', '$0.75', '20'],
        ],
        align: ['left', 'right', 'center'],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [tableNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Table with empty cells', () => {
      const tableNode: TableNode = {
        kind: 'table',
        headers: ['Column 1', 'Column 2', 'Column 3'],
        rows: [
          ['Value 1', '', 'Value 3'],
          ['', 'Value 2', ''],
        ],
        emptyCell: '-',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [tableNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Table without headers', () => {
      const tableNode: TableNode = {
        kind: 'table',
        rows: [
          ['Row 1 Col 1', 'Row 1 Col 2'],
          ['Row 2 Col 1', 'Row 2 Col 2'],
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [tableNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });

  describe('List', () => {
    it('emits unordered list', () => {
      const listNode: ListNode = {
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'First item' }],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Second item' }],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Third item' }],
              },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [listNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits ordered list', () => {
      const listNode: ListNode = {
        kind: 'list',
        ordered: true,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Step one' }],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Step two' }],
              },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [listNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits ordered list with start number', () => {
      const listNode: ListNode = {
        kind: 'list',
        ordered: true,
        start: 5,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Item five' }],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Item six' }],
              },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [listNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits nested list', () => {
      const nestedList: ListNode = {
        kind: 'list',
        ordered: false,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Nested item 1' }],
              },
            ],
          },
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Nested item 2' }],
              },
            ],
          },
        ],
      };

      const listNode: ListNode = {
        kind: 'list',
        ordered: true,
        items: [
          {
            kind: 'listItem',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Top level item' }],
              },
              nestedList,
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [listNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });

  describe('Indent', () => {
    it('emits Indent with default indentation (2 spaces)', () => {
      const indentNode: IndentNode = {
        kind: 'indent',
        spaces: 2,
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Indented paragraph.' }],
          },
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Another indented paragraph.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [indentNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Indent with 4 spaces', () => {
      const indentNode: IndentNode = {
        kind: 'indent',
        spaces: 4,
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Indented with 4 spaces.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [indentNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Indent with nested blocks', () => {
      const indentNode: IndentNode = {
        kind: 'indent',
        spaces: 2,
        children: [
          {
            kind: 'heading',
            level: 3,
            children: [{ kind: 'text', value: 'Nested Heading' }],
          },
          {
            kind: 'list',
            ordered: true,
            items: [
              {
                kind: 'listItem',
                children: [
                  {
                    kind: 'paragraph',
                    children: [{ kind: 'text', value: 'Indented list item' }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [indentNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });
});
