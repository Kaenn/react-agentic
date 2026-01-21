import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode, type CodeBlockNode, type ParagraphNode } from '../../src/index.js';

/**
 * Helper to create a document with a single code block
 */
function codeBlockDoc(codeBlock: CodeBlockNode): DocumentNode {
  return {
    kind: 'document',
    children: [codeBlock],
  };
}

/**
 * Helper to create a document with a single paragraph
 */
function paragraphDoc(paragraph: ParagraphNode): DocumentNode {
  return {
    kind: 'document',
    children: [paragraph],
  };
}

describe('Code emission', () => {
  describe('code blocks', () => {
    it('emits code block without language', () => {
      const doc = codeBlockDoc({
        kind: 'codeBlock',
        content: 'const x = 1;',
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "\`\`\`
        const x = 1;
        \`\`\`
        "
      `);
    });

    it('emits code block with typescript language', () => {
      const doc = codeBlockDoc({
        kind: 'codeBlock',
        language: 'typescript',
        content: 'const x: number = 1;',
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "\`\`\`typescript
        const x: number = 1;
        \`\`\`
        "
      `);
    });

    it('emits code block with javascript language', () => {
      const doc = codeBlockDoc({
        kind: 'codeBlock',
        language: 'javascript',
        content: 'function hello() {\n  console.log("hi");\n}',
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "\`\`\`javascript
        function hello() {
          console.log("hi");
        }
        \`\`\`
        "
      `);
    });

    it('uses triple backticks for code fences', () => {
      const doc = codeBlockDoc({
        kind: 'codeBlock',
        content: 'code here',
      });

      const output = emit(doc);
      expect(output).toContain('```');
      expect(output.match(/```/g)?.length).toBe(2); // Opening and closing
    });

    it('emits multi-line code block preserving newlines', () => {
      const doc = codeBlockDoc({
        kind: 'codeBlock',
        language: 'python',
        content: 'def greet(name):\n    return f"Hello, {name}"',
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "\`\`\`python
        def greet(name):
            return f"Hello, {name}"
        \`\`\`
        "
      `);
    });
  });

  describe('inline code', () => {
    it('emits inline code in paragraph', () => {
      const doc = paragraphDoc({
        kind: 'paragraph',
        children: [
          { kind: 'text', value: 'Use ' },
          { kind: 'inlineCode', value: 'npm install' },
          { kind: 'text', value: ' to install.' },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "Use \`npm install\` to install.
        "
      `);
    });

    it('emits multiple inline code spans', () => {
      const doc = paragraphDoc({
        kind: 'paragraph',
        children: [
          { kind: 'inlineCode', value: 'useState' },
          { kind: 'text', value: ' and ' },
          { kind: 'inlineCode', value: 'useEffect' },
        ],
      });

      expect(emit(doc)).toMatchInlineSnapshot(`
        "\`useState\` and \`useEffect\`
        "
      `);
    });
  });
});
