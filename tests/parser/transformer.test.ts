import { describe, expect, it } from 'vitest';
import {
  createProject,
  parseSource,
  findRootJsxElement,
  Transformer,
  transform,
} from '../../src/index.js';
import { emit } from '../../src/emitter/index.js';

describe('Transformer', () => {
  let testCounter = 0;

  function transformTsx(tsx: string) {
    // Create fresh project for each test to avoid stale AST issues
    const project = createProject();
    const fileName = `test-${testCounter++}.tsx`;
    const source = parseSource(project, tsx, fileName);
    const root = findRootJsxElement(source);
    if (!root) throw new Error('No JSX found');
    const transformer = new Transformer();
    return transformer.transform(root);
  }

  describe('headings', () => {
    it('transforms h1 to HeadingNode with level 1', () => {
      const tsx = `export default function Doc() { return <h1>Title</h1>; }`;
      const doc = transformTsx(tsx);

      expect(doc.kind).toBe('document');
      expect(doc.children).toHaveLength(1);
      expect(doc.children[0]).toEqual({
        kind: 'heading',
        level: 1,
        children: [{ kind: 'text', value: 'Title' }],
      });
    });

    it('transforms h2 to HeadingNode with level 2', () => {
      const tsx = `export default function Doc() { return <h2>Subtitle</h2>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'heading',
        level: 2,
        children: [{ kind: 'text', value: 'Subtitle' }],
      });
    });

    it('transforms h3 through h6 with correct levels', () => {
      for (let level = 3; level <= 6; level++) {
        const tsx = `export default function Doc() { return <h${level}>Heading ${level}</h${level}>; }`;
        const doc = transformTsx(tsx);

        expect(doc.children[0]).toEqual({
          kind: 'heading',
          level,
          children: [{ kind: 'text', value: `Heading ${level}` }],
        });
      }
    });

    it('transforms heading with inline formatting', () => {
      // Note: JSX whitespace quirk - space after </b> is lost, so use {' '}
      const tsx = `export default function Doc() { return <h1>Hello <b>bold</b>{' '}world</h1>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'heading',
        level: 1,
        children: [
          { kind: 'text', value: 'Hello ' },
          { kind: 'bold', children: [{ kind: 'text', value: 'bold' }] },
          { kind: 'text', value: ' ' },
          { kind: 'text', value: 'world' },
        ],
      });
    });
  });

  describe('paragraphs', () => {
    it('transforms p to ParagraphNode with text', () => {
      const tsx = `export default function Doc() { return <p>Simple paragraph</p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [{ kind: 'text', value: 'Simple paragraph' }],
      });
    });

    it('transforms paragraph with mixed inline content', () => {
      // Note: JSX whitespace quirk - spaces after closing tags are lost, use {' '}
      const tsx = `export default function Doc() { return <p>Text with <b>bold</b>{' '}and{' '}<i>italic</i></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'text', value: 'Text with ' },
          { kind: 'bold', children: [{ kind: 'text', value: 'bold' }] },
          { kind: 'text', value: ' ' },
          { kind: 'text', value: 'and' },
          { kind: 'text', value: ' ' },
          { kind: 'italic', children: [{ kind: 'text', value: 'italic' }] },
        ],
      });
    });

    it('normalizes whitespace in paragraph text', () => {
      const tsx = `export default function Doc() {
        return (
          <p>
            Multiple   spaces
            and newlines
          </p>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [{ kind: 'text', value: 'Multiple spaces and newlines' }],
      });
    });
  });

  describe('text formatting', () => {
    it('transforms <b> to BoldNode', () => {
      const tsx = `export default function Doc() { return <p><b>bold text</b></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'bold', children: [{ kind: 'text', value: 'bold text' }] },
        ],
      });
    });

    it('transforms <strong> to BoldNode', () => {
      const tsx = `export default function Doc() { return <p><strong>strong text</strong></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'bold', children: [{ kind: 'text', value: 'strong text' }] },
        ],
      });
    });

    it('transforms <i> to ItalicNode', () => {
      const tsx = `export default function Doc() { return <p><i>italic text</i></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'italic', children: [{ kind: 'text', value: 'italic text' }] },
        ],
      });
    });

    it('transforms <em> to ItalicNode', () => {
      const tsx = `export default function Doc() { return <p><em>emphasized text</em></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'italic', children: [{ kind: 'text', value: 'emphasized text' }] },
        ],
      });
    });

    it('transforms <code> to InlineCodeNode', () => {
      const tsx = `export default function Doc() { return <p><code>const x = 1</code></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [{ kind: 'inlineCode', value: 'const x = 1' }],
      });
    });

    it('transforms nested inline elements', () => {
      const tsx = `export default function Doc() { return <p><b><i>bold and italic</i></b></p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          {
            kind: 'bold',
            children: [
              {
                kind: 'italic',
                children: [{ kind: 'text', value: 'bold and italic' }],
              },
            ],
          },
        ],
      });
    });
  });

  describe('self-closing elements', () => {
    it('transforms <br /> to LineBreakNode', () => {
      const tsx = `export default function Doc() { return <p>Line one<br />Line two</p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [
          { kind: 'text', value: 'Line one' },
          { kind: 'lineBreak' },
          { kind: 'text', value: 'Line two' },
        ],
      });
    });

    it('transforms <hr /> to ThematicBreakNode', () => {
      const tsx = `export default function Doc() {
        return (
          <>
            <p>Above</p>
            <hr />
            <p>Below</p>
          </>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(3);
      expect(doc.children[1]).toEqual({ kind: 'thematicBreak' });
    });
  });

  describe('whitespace handling', () => {
    it('collapses multiple spaces to single space', () => {
      const tsx = `export default function Doc() { return <p>Hello    world</p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [{ kind: 'text', value: 'Hello world' }],
      });
    });

    it('trims leading and trailing whitespace', () => {
      const tsx = `export default function Doc() { return <p>   trimmed   </p>; }`;
      const doc = transformTsx(tsx);

      expect(doc.children[0]).toEqual({
        kind: 'paragraph',
        children: [{ kind: 'text', value: 'trimmed' }],
      });
    });

    it('filters whitespace-only text nodes between elements', () => {
      const tsx = `export default function Doc() {
        return (
          <>
            <h1>Title</h1>
            <p>Content</p>
          </>
        );
      }`;
      const doc = transformTsx(tsx);

      // Should have exactly 2 children, not whitespace nodes
      expect(doc.children).toHaveLength(2);
      expect(doc.children[0].kind).toBe('heading');
      expect(doc.children[1].kind).toBe('paragraph');
    });
  });

  describe('fragment handling', () => {
    it('transforms JSX fragment with multiple children', () => {
      const tsx = `export default function Doc() {
        return (
          <>
            <h1>Title</h1>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(3);
      expect(doc.children[0].kind).toBe('heading');
      expect(doc.children[1].kind).toBe('paragraph');
      expect(doc.children[2].kind).toBe('paragraph');
    });
  });

  describe('convenience function', () => {
    it('transform() returns DocumentNode', () => {
      const project = createProject();
      const source = parseSource(project, `export default function Doc() { return <p>Hello</p>; }`, 'convenience.tsx');
      const root = findRootJsxElement(source);
      if (!root) throw new Error('No JSX');

      const doc = transform(root);
      expect(doc.kind).toBe('document');
      expect(doc.children).toHaveLength(1);
    });
  });

  describe('end-to-end pipeline', () => {
    it('parse -> transform -> emit produces valid Markdown', () => {
      // Note: JSX whitespace is quirky - spaces after closing tags are not
      // preserved. For proper spacing, use JSX expressions: {' '}
      // This test uses {' '} to ensure spaces between inline elements
      const tsx = `export default function Doc() {
        return (
          <>
            <h1>Hello World</h1>
            <p>This is <b>bold</b>{' '}and{' '}<i>italic</i>{' '}text.</p>
            <hr />
          </>
        );
      }`;
      const doc = transformTsx(tsx);
      const markdown = emit(doc);

      // Note: emitter adds trailing newline per POSIX convention
      expect(markdown).toBe(
        '# Hello World\n\nThis is **bold** and *italic* text.\n\n---\n'
      );
    });

    it('full document with multiple heading levels', () => {
      // Note: Use explicit {' '} for spaces around inline elements
      const tsx = `export default function Doc() {
        return (
          <>
            <h1>Main Title</h1>
            <p>Introduction paragraph.</p>
            <h2>Section One</h2>
            <p>Section content with{' '}<code>inline code</code>.</p>
          </>
        );
      }`;
      const doc = transformTsx(tsx);
      const markdown = emit(doc);

      // Note: emitter adds trailing newline per POSIX convention
      expect(markdown).toBe(
        '# Main Title\n\n' +
          'Introduction paragraph.\n\n' +
          '## Section One\n\n' +
          'Section content with `inline code`.\n'
      );
    });
  });

  describe('error handling', () => {
    it('throws for unsupported block element', () => {
      const tsx = `export default function Doc() { return <div>content</div>; }`;

      expect(() => transformTsx(tsx)).toThrow('Unsupported block element: <div>');
    });

    it('throws for unsupported inline element', () => {
      const tsx = `export default function Doc() { return <p><span>text</span></p>; }`;

      expect(() => transformTsx(tsx)).toThrow('Unsupported inline element: <span>');
    });

    it('throws for unsupported self-closing inline element', () => {
      const tsx = `export default function Doc() { return <p><img /></p>; }`;

      expect(() => transformTsx(tsx)).toThrow('Unsupported inline self-closing element: <img>');
    });

    it('error message includes element name', () => {
      const tsx = `export default function Doc() { return <article>content</article>; }`;

      try {
        transformTsx(tsx);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('article');
      }
    });
  });

  describe('lists', () => {
    it('transforms simple unordered list', () => {
      const tsx = `export default function Doc() {
        return (
          <ul>
            <li>First item</li>
            <li>Second item</li>
          </ul>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0]).toEqual({
        kind: 'list',
        ordered: false,
        items: [
          { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'First item' }] }] },
          { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'Second item' }] }] },
        ],
      });
    });

    it('transforms simple ordered list', () => {
      const tsx = `export default function Doc() {
        return (
          <ol>
            <li>First</li>
            <li>Second</li>
            <li>Third</li>
          </ol>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0]).toEqual({
        kind: 'list',
        ordered: true,
        items: [
          { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'First' }] }] },
          { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'Second' }] }] },
          { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'Third' }] }] },
        ],
      });
    });

    it('transforms list item with inline formatting', () => {
      const tsx = `export default function Doc() {
        return (
          <ul>
            <li><b>bold</b> text</li>
          </ul>
        );
      }`;
      const doc = transformTsx(tsx);

      const list = doc.children[0];
      expect(list.kind).toBe('list');
      if (list.kind === 'list') {
        expect(list.items[0]).toEqual({
          kind: 'listItem',
          children: [
            {
              kind: 'paragraph',
              children: [
                { kind: 'bold', children: [{ kind: 'text', value: 'bold' }] },
              ],
            },
            {
              kind: 'paragraph',
              children: [{ kind: 'text', value: 'text' }],
            },
          ],
        });
      }
    });

    it('transforms nested list', () => {
      const tsx = `export default function Doc() {
        return (
          <ul>
            <li>parent
              <ul>
                <li>child</li>
              </ul>
            </li>
          </ul>
        );
      }`;
      const doc = transformTsx(tsx);

      const list = doc.children[0];
      expect(list.kind).toBe('list');
      if (list.kind === 'list') {
        expect(list.items[0]).toEqual({
          kind: 'listItem',
          children: [
            { kind: 'paragraph', children: [{ kind: 'text', value: 'parent' }] },
            {
              kind: 'list',
              ordered: false,
              items: [
                { kind: 'listItem', children: [{ kind: 'paragraph', children: [{ kind: 'text', value: 'child' }] }] },
              ],
            },
          ],
        });
      }
    });

    it('transforms deeply nested lists (3 levels)', () => {
      const tsx = `export default function Doc() {
        return (
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
        );
      }`;
      const doc = transformTsx(tsx);

      const list = doc.children[0];
      expect(list.kind).toBe('list');
      if (list.kind === 'list') {
        const level1Item = list.items[0];
        expect(level1Item.children).toHaveLength(2);
        expect(level1Item.children[1].kind).toBe('list');

        if (level1Item.children[1].kind === 'list') {
          const level2Item = level1Item.children[1].items[0];
          expect(level2Item.children).toHaveLength(2);
          expect(level2Item.children[1].kind).toBe('list');
        }
      }
    });

    it('transforms mixed ordered/unordered nesting', () => {
      const tsx = `export default function Doc() {
        return (
          <ol>
            <li>Ordered parent
              <ul>
                <li>Unordered child</li>
              </ul>
            </li>
          </ol>
        );
      }`;
      const doc = transformTsx(tsx);

      const list = doc.children[0];
      expect(list.kind).toBe('list');
      if (list.kind === 'list') {
        expect(list.ordered).toBe(true);
        const item = list.items[0];
        expect(item.children[1].kind).toBe('list');
        if (item.children[1].kind === 'list') {
          expect(item.children[1].ordered).toBe(false);
        }
      }
    });

    it('throws for non-li children in list', () => {
      const tsx = `export default function Doc() {
        return (
          <ul>
            <p>Not a list item</p>
          </ul>
        );
      }`;

      expect(() => transformTsx(tsx)).toThrow('Expected <li> inside list');
    });
  });
});
