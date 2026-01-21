import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode, type ParagraphNode } from '../../src/index.js';

/**
 * Helper to create a document with a single paragraph
 */
function paragraphDoc(paragraph: ParagraphNode): DocumentNode {
  return {
    kind: 'document',
    children: [paragraph],
  };
}

describe('Paragraph emission', () => {
  it('emits plain text paragraph', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [{ kind: 'text', value: 'This is a simple paragraph.' }],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "This is a simple paragraph.
      "
    `);
  });

  it('emits paragraph with bold text', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'This is ' },
        { kind: 'bold', children: [{ kind: 'text', value: 'bold' }] },
        { kind: 'text', value: ' text.' },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "This is **bold** text.
      "
    `);
  });

  it('emits paragraph with italic text', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'This is ' },
        { kind: 'italic', children: [{ kind: 'text', value: 'italic' }] },
        { kind: 'text', value: ' text.' },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "This is *italic* text.
      "
    `);
  });

  it('emits paragraph with inline code', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'Use the ' },
        { kind: 'inlineCode', value: 'useState' },
        { kind: 'text', value: ' hook.' },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "Use the \`useState\` hook.
      "
    `);
  });

  it('emits paragraph with link', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'Visit ' },
        {
          kind: 'link',
          url: 'https://example.com',
          children: [{ kind: 'text', value: 'our website' }],
        },
        { kind: 'text', value: ' for more.' },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "Visit [our website](https://example.com) for more.
      "
    `);
  });

  it('emits paragraph with mixed formatting', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        { kind: 'text', value: 'This has ' },
        { kind: 'bold', children: [{ kind: 'text', value: 'bold' }] },
        { kind: 'text', value: ', ' },
        { kind: 'italic', children: [{ kind: 'text', value: 'italic' }] },
        { kind: 'text', value: ', ' },
        { kind: 'inlineCode', value: 'code' },
        { kind: 'text', value: ', and a ' },
        {
          kind: 'link',
          url: 'https://example.com',
          children: [{ kind: 'text', value: 'link' }],
        },
        { kind: 'text', value: '.' },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "This has **bold**, *italic*, \`code\`, and a [link](https://example.com).
      "
    `);
  });

  it('emits paragraph with link containing formatted text', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        {
          kind: 'link',
          url: 'https://example.com',
          children: [
            { kind: 'bold', children: [{ kind: 'text', value: 'Bold Link' }] },
          ],
        },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "[**Bold Link**](https://example.com)
      "
    `);
  });

  it('emits paragraph with nested bold and italic', () => {
    const doc = paragraphDoc({
      kind: 'paragraph',
      children: [
        {
          kind: 'bold',
          children: [
            { kind: 'italic', children: [{ kind: 'text', value: 'bold italic' }] },
          ],
        },
      ],
    });

    expect(emit(doc)).toMatchInlineSnapshot(`
      "***bold italic***
      "
    `);
  });
});
