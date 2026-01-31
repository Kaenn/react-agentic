import { describe, expect, it } from 'vitest';
import { emitDocument } from '../../src/index.js';
import type {
  IfNode,
  ElseNode,
  LoopNode,
  BreakNode,
  ReturnNode,
  RuntimeVarRefNode,
  SpawnAgentNode,
  DocumentNode,
} from '../../src/index.js';

describe('Control Flow Components', () => {
  describe('If', () => {
    it('emits If with runtime variable reference condition', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'CTX',
        path: ['error'],
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Error occurred.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [ifNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits If with literal true condition', () => {
      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'literal',
          value: true,
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Always executes.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [ifNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits If with nested content', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'RESULT',
        path: ['success'],
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [
          {
            kind: 'heading',
            level: 2,
            children: [{ kind: 'text', value: 'Success' }],
          },
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Operation completed.' }],
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
                    children: [{ kind: 'text', value: 'Step 1' }],
                  },
                ],
              },
              {
                kind: 'listItem',
                children: [
                  {
                    kind: 'paragraph',
                    children: [{ kind: 'text', value: 'Step 2' }],
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
        children: [ifNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits If with equality condition', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'STATUS',
        path: [],
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'eq',
          left: {
            type: 'ref',
            ref: conditionRef,
          },
          right: 'complete',
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Status is complete.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [ifNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('If + Else', () => {
    it('emits If-Else pair', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'READY',
        path: [],
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'System is ready.' }],
          },
        ],
      };

      const elseNode: ElseNode = {
        kind: 'else',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'System is not ready.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [ifNode, elseNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('Loop', () => {
    it('emits basic Loop with max iterations', () => {
      const loopNode: LoopNode = {
        kind: 'loop',
        max: 3,
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Iteration content.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [loopNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Loop with counter variable', () => {
      const loopNode: LoopNode = {
        kind: 'loop',
        max: 5,
        counterVar: 'i',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Counter iteration.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [loopNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Loop with nested If', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'ITEM',
        path: ['valid'],
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Valid item found.' }],
          },
        ],
      };

      const loopNode: LoopNode = {
        kind: 'loop',
        max: 10,
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Processing item...' }],
          },
          ifNode,
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [loopNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('Break', () => {
    it('emits standalone Break without message', () => {
      const breakNode: BreakNode = {
        kind: 'break',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [breakNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Break with message', () => {
      const breakNode: BreakNode = {
        kind: 'break',
        message: 'Target found, exiting loop.',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [breakNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Loop containing Break', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'FOUND',
        path: [],
      };

      const breakNode: BreakNode = {
        kind: 'break',
        message: 'Item found.',
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [breakNode],
      };

      const loopNode: LoopNode = {
        kind: 'loop',
        max: 20,
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Searching...' }],
          },
          ifNode,
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [loopNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('Return', () => {
    it('emits basic Return without status', () => {
      const returnNode: ReturnNode = {
        kind: 'return',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [returnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Return with SUCCESS status', () => {
      const returnNode: ReturnNode = {
        kind: 'return',
        status: 'SUCCESS',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [returnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Return with status and message', () => {
      const returnNode: ReturnNode = {
        kind: 'return',
        status: 'ERROR',
        message: 'Configuration file not found.',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [returnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits Return with BLOCKED status', () => {
      const returnNode: ReturnNode = {
        kind: 'return',
        status: 'BLOCKED',
        message: 'Authentication required.',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [returnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('If + SpawnAgent nesting', () => {
    it('emits If containing SpawnAgent', () => {
      const conditionRef: RuntimeVarRefNode = {
        kind: 'runtimeVarRef',
        varName: 'NEEDS_REVIEW',
        path: [],
      };

      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'code-reviewer',
        model: 'claude-opus-4',
        description: 'Review the code changes',
        prompt: 'Please review the following code changes for security issues.',
        outputVar: 'REVIEW_RESULT',
      };

      const ifNode: IfNode = {
        kind: 'if',
        condition: {
          type: 'ref',
          ref: conditionRef,
        },
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Starting code review...' }],
          },
          spawnNode,
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [ifNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });
});
