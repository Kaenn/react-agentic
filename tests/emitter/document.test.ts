import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode } from '../../src/index.js';

describe('Document emission', () => {
  it('emits document with frontmatter only', () => {
    const doc: DocumentNode = {
      kind: 'document',
      frontmatter: {
        kind: 'frontmatter',
        data: {
          name: 'my-command',
          description: 'A test command',
        },
      },
      children: [],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "---
      name: my-command
      description: A test command
      ---
      "
    `);
  });

  it('emits document with heading and paragraphs', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'heading',
          level: 1,
          children: [{ kind: 'text', value: 'Title' }],
        },
        {
          kind: 'paragraph',
          children: [{ kind: 'text', value: 'First paragraph.' }],
        },
        {
          kind: 'paragraph',
          children: [{ kind: 'text', value: 'Second paragraph.' }],
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "# Title

      First paragraph.

      Second paragraph.
      "
    `);
  });

  it('emits complete document with frontmatter and multiple block types', () => {
    const doc: DocumentNode = {
      kind: 'document',
      frontmatter: {
        kind: 'frontmatter',
        data: {
          name: 'example',
          allowedTools: ['Read', 'Write', 'Bash'],
        },
      },
      children: [
        {
          kind: 'heading',
          level: 1,
          children: [{ kind: 'text', value: 'Example Command' }],
        },
        {
          kind: 'paragraph',
          children: [
            { kind: 'text', value: 'This command does ' },
            { kind: 'bold', children: [{ kind: 'text', value: 'important' }] },
            { kind: 'text', value: ' things.' },
          ],
        },
        {
          kind: 'heading',
          level: 2,
          children: [{ kind: 'text', value: 'Steps' }],
        },
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
        {
          kind: 'codeBlock',
          language: 'typescript',
          content: 'const x = 1;',
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "---
      name: example
      allowedTools:
        - Read
        - Write
        - Bash
      ---

      # Example Command

      This command does **important** things.

      ## Steps

      1. First step
      2. Second step

      \`\`\`typescript
      const x = 1;
      \`\`\`
      "
    `);
  });

  it('verifies single blank line between block elements', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'heading',
          level: 1,
          children: [{ kind: 'text', value: 'Title' }],
        },
        {
          kind: 'paragraph',
          children: [{ kind: 'text', value: 'Content.' }],
        },
      ],
    };

    const output = emit(doc);
    // Should have exactly one blank line (two newlines) between heading and paragraph
    expect(output).toContain('# Title\n\nContent.');
  });

  it('emits empty document correctly', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`""`);
  });

  it('emits document with blockquote', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'blockquote',
          children: [
            {
              kind: 'paragraph',
              children: [{ kind: 'text', value: 'This is a quote.' }],
            },
          ],
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "> This is a quote.
      "
    `);
  });

  it('emits document with thematic break', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'paragraph',
          children: [{ kind: 'text', value: 'Before.' }],
        },
        {
          kind: 'thematicBreak',
        },
        {
          kind: 'paragraph',
          children: [{ kind: 'text', value: 'After.' }],
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "Before.

      ---

      After.
      "
    `);
  });

  it('emits document with XML block', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'xmlBlock',
          name: 'example',
          children: [
            {
              kind: 'paragraph',
              children: [{ kind: 'text', value: 'Content inside XML block.' }],
            },
          ],
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "<example>
      Content inside XML block.
      </example>
      "
    `);
  });

  it('emits document with raw markdown', () => {
    const doc: DocumentNode = {
      kind: 'document',
      children: [
        {
          kind: 'raw',
          content: '<!-- This is a comment -->',
        },
      ],
    };

    expect(emit(doc)).toMatchInlineSnapshot(`
      "<!-- This is a comment -->
      "
    `);
  });
});
