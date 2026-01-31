import { describe, expect, it } from 'vitest';
import { emit } from '../../src/index.js';
import type {
  ExecutionContextNode,
  XmlBlockNode,
  StepNode,
  DocumentNode,
} from '../../src/index.js';

describe('Semantic Components', () => {
  describe('ExecutionContext', () => {
    it('emits ExecutionContext with basic paths', () => {
      const execContextNode: ExecutionContextNode = {
        kind: 'executionContext',
        paths: [
          '.planning/PROJECT.md',
          '.planning/STATE.md',
          'docs/README.md',
        ],
        prefix: '@',
        children: [],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [execContextNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits ExecutionContext with custom prefix', () => {
      const execContextNode: ExecutionContextNode = {
        kind: 'executionContext',
        paths: [
          'src/components/Button.tsx',
          'src/components/Input.tsx',
        ],
        prefix: '#',
        children: [],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [execContextNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits ExecutionContext with children', () => {
      const execContextNode: ExecutionContextNode = {
        kind: 'executionContext',
        paths: [
          'package.json',
          'tsconfig.json',
        ],
        prefix: '@',
        children: [
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'Additional context about these files.' },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [execContextNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });

  describe('XmlBlock', () => {
    it('emits XmlBlock with basic name and children', () => {
      const xmlBlockNode: XmlBlockNode = {
        kind: 'xmlBlock',
        name: 'objective',
        children: [
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'Complete the migration to TypeScript.' },
            ],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [xmlBlockNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits XmlBlock with attributes', () => {
      const xmlBlockNode: XmlBlockNode = {
        kind: 'xmlBlock',
        name: 'section',
        attributes: {
          id: 'intro',
          class: 'important',
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Section content here.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [xmlBlockNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits nested XmlBlocks', () => {
      const innerXmlBlock: XmlBlockNode = {
        kind: 'xmlBlock',
        name: 'details',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Inner block content.' }],
          },
        ],
      };

      const xmlBlockNode: XmlBlockNode = {
        kind: 'xmlBlock',
        name: 'task',
        children: [
          {
            kind: 'heading',
            level: 2,
            children: [{ kind: 'text', value: 'Task Title' }],
          },
          innerXmlBlock,
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [xmlBlockNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits XmlBlock with mixed content', () => {
      const xmlBlockNode: XmlBlockNode = {
        kind: 'xmlBlock',
        name: 'instructions',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Follow these steps:' }],
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
                    children: [{ kind: 'text', value: 'First step' }],
                  },
                ],
              },
              {
                kind: 'listItem',
                children: [
                  {
                    kind: 'paragraph',
                    children: [{ kind: 'text', value: 'Second step' }],
                  },
                ],
              },
            ],
          },
          {
            kind: 'codeBlock',
            language: 'bash',
            content: 'npm install',
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [xmlBlockNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });

  describe('Step', () => {
    it('emits Step with heading variant', () => {
      const stepNode: StepNode = {
        kind: 'step',
        number: '1',
        name: 'Initialize Project',
        variant: 'heading',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Create a new project directory.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [stepNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Step with bold variant', () => {
      const stepNode: StepNode = {
        kind: 'step',
        number: '2',
        name: 'Install Dependencies',
        variant: 'bold',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Run npm install.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [stepNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Step with xml variant', () => {
      const stepNode: StepNode = {
        kind: 'step',
        number: '3',
        name: 'Configure Build',
        variant: 'xml',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Set up the build configuration.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [stepNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Step with sub-step numbering', () => {
      const stepNode: StepNode = {
        kind: 'step',
        number: '1.1',
        name: 'Create Subdirectory',
        variant: 'heading',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Create the src directory.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [stepNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits Step with complex content', () => {
      const stepNode: StepNode = {
        kind: 'step',
        number: '4',
        name: 'Run Tests',
        variant: 'heading',
        children: [
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'Execute the test suite with ' },
              { kind: 'bold', children: [{ kind: 'text', value: 'coverage' }] },
              { kind: 'text', value: ':' },
            ],
          },
          {
            kind: 'codeBlock',
            language: 'bash',
            content: 'npm test -- --coverage',
          },
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Verify all tests pass.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [stepNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });
});
