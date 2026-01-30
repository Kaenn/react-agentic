import { describe, expect, it } from 'vitest';
import { emit, type DocumentNode, type CodeBlockNode, type ReadFilesNode, type PromptTemplateNode, type XmlBlockNode, type ParagraphNode } from '../../src/index.js';

/**
 * Tests for TSX Developer Experience Improvements
 * - Bash component (Phase 1)
 * - ReadFiles component (Phase 3)
 * - PromptTemplate component (Phase 4)
 */

/**
 * Helper to create a document with a single block
 */
function doc(child: DocumentNode['children'][0]): DocumentNode {
  return {
    kind: 'document',
    children: [child],
  };
}

describe('DX Improvements', () => {
  describe('Bash component (Phase 1)', () => {
    it('emits bash code block with language', () => {
      const codeBlock: CodeBlockNode = {
        kind: 'codeBlock',
        language: 'bash',
        content: 'ls -la',
      };

      expect(emit(doc(codeBlock))).toMatchInlineSnapshot(`
        "\`\`\`bash
        ls -la
        \`\`\`
        "
      `);
    });

    it('emits multi-line bash code block', () => {
      const codeBlock: CodeBlockNode = {
        kind: 'codeBlock',
        language: 'bash',
        content: 'PHASE=$(cat .planning/STATE.md | grep "Current Phase")\necho "Phase: $PHASE"',
      };

      expect(emit(doc(codeBlock))).toMatchInlineSnapshot(`
        "\`\`\`bash
        PHASE=$(cat .planning/STATE.md | grep "Current Phase")
        echo "Phase: $PHASE"
        \`\`\`
        "
      `);
    });

    it('emits empty bash code block', () => {
      const codeBlock: CodeBlockNode = {
        kind: 'codeBlock',
        language: 'bash',
        content: '',
      };

      expect(emit(doc(codeBlock))).toMatchInlineSnapshot(`
        "\`\`\`bash

        \`\`\`
        "
      `);
    });
  });

  describe('ReadFiles component (Phase 3)', () => {
    it('emits cat commands for required files', () => {
      const readFiles: ReadFilesNode = {
        kind: 'readFiles',
        files: [
          { varName: 'STATE_CONTENT', path: '.planning/STATE.md', required: true },
        ],
      };

      expect(emit(doc(readFiles))).toMatchInlineSnapshot(`
        "\`\`\`bash
        STATE_CONTENT=$(cat .planning/STATE.md)
        \`\`\`
        "
      `);
    });

    it('emits cat commands with error suppression for optional files', () => {
      const readFiles: ReadFilesNode = {
        kind: 'readFiles',
        files: [
          { varName: 'REQUIREMENTS_CONTENT', path: '.planning/REQUIREMENTS.md', required: false },
        ],
      };

      expect(emit(doc(readFiles))).toMatchInlineSnapshot(`
        "\`\`\`bash
        REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
        \`\`\`
        "
      `);
    });

    it('emits multiple file reads in single block', () => {
      const readFiles: ReadFilesNode = {
        kind: 'readFiles',
        files: [
          { varName: 'STATE_CONTENT', path: '.planning/STATE.md', required: true },
          { varName: 'REQUIREMENTS_CONTENT', path: '.planning/REQUIREMENTS.md', required: false },
          { varName: 'ROADMAP_CONTENT', path: '.planning/ROADMAP.md', required: true },
        ],
      };

      expect(emit(doc(readFiles))).toMatchInlineSnapshot(`
        "\`\`\`bash
        STATE_CONTENT=$(cat .planning/STATE.md)
        REQUIREMENTS_CONTENT=$(cat .planning/REQUIREMENTS.md 2>/dev/null)
        ROADMAP_CONTENT=$(cat .planning/ROADMAP.md)
        \`\`\`
        "
      `);
    });

    it('quotes paths with variable references', () => {
      const readFiles: ReadFilesNode = {
        kind: 'readFiles',
        files: [
          { varName: 'CONTEXT_CONTENT', path: '${PHASE_DIR}/*-CONTEXT.md', required: false },
        ],
      };

      expect(emit(doc(readFiles))).toMatchInlineSnapshot(`
        "\`\`\`bash
        CONTEXT_CONTENT=$(cat "\${PHASE_DIR}/*-CONTEXT.md" 2>/dev/null)
        \`\`\`
        "
      `);
    });
  });

  describe('PromptTemplate component (Phase 4)', () => {
    it('wraps content in markdown code fence', () => {
      const promptTemplate: PromptTemplateNode = {
        kind: 'promptTemplate',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Simple content' }],
          } as ParagraphNode,
        ],
      };

      expect(emit(doc(promptTemplate))).toMatchInlineSnapshot(`
        "\`\`\`markdown
        Simple content
        \`\`\`
        "
      `);
    });

    it('wraps XML blocks in markdown fence', () => {
      const promptTemplate: PromptTemplateNode = {
        kind: 'promptTemplate',
        children: [
          {
            kind: 'xmlBlock',
            name: 'objective',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Research Phase {phase_number}' }],
              } as ParagraphNode,
            ],
          } as XmlBlockNode,
        ],
      };

      expect(emit(doc(promptTemplate))).toMatchInlineSnapshot(`
        "\`\`\`markdown
        <objective>
        Research Phase {phase_number}
        </objective>
        \`\`\`
        "
      `);
    });

    it('handles multiple children', () => {
      const promptTemplate: PromptTemplateNode = {
        kind: 'promptTemplate',
        children: [
          {
            kind: 'heading',
            level: 2,
            children: [{ kind: 'text', value: 'Instructions' }],
          },
          {
            kind: 'xmlBlock',
            name: 'rules',
            children: [
              {
                kind: 'paragraph',
                children: [{ kind: 'text', value: 'Rule 1' }],
              } as ParagraphNode,
            ],
          } as XmlBlockNode,
        ],
      };

      expect(emit(doc(promptTemplate))).toMatchInlineSnapshot(`
        "\`\`\`markdown
        ## Instructions

        <rules>
        Rule 1
        </rules>
        \`\`\`
        "
      `);
    });

    it('handles empty children', () => {
      const promptTemplate: PromptTemplateNode = {
        kind: 'promptTemplate',
        children: [],
      };

      expect(emit(doc(promptTemplate))).toMatchInlineSnapshot(`
        "\`\`\`markdown

        \`\`\`
        "
      `);
    });
  });
});
