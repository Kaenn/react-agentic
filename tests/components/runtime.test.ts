import { describe, expect, it } from 'vitest';
import { emitDocument, emit } from '../../src/index.js';
import type {
  SpawnAgentNode,
  AskUserNode,
  RuntimeCallNode,
  OnStatusNode,
  OutputReference,
  LoopNode,
  BreakNode,
  DocumentNode,
} from '../../src/index.js';

describe('Runtime Components', () => {
  describe('SpawnAgent', () => {
    it('emits basic SpawnAgent with prompt', () => {
      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'test-runner',
        model: 'claude-opus-4',
        description: 'Run the test suite',
        prompt: 'Execute all tests and report results.',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [spawnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits SpawnAgent with input object', () => {
      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'code-reviewer',
        model: 'claude-sonnet-4',
        description: 'Review code changes',
        input: {
          type: 'object',
          properties: [
            {
              name: 'files',
              value: { type: 'string', value: 'src/*.ts' },
            },
            {
              name: 'severity',
              value: { type: 'string', value: 'high' },
            },
          ],
        },
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [spawnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits SpawnAgent with output variable', () => {
      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'researcher',
        model: 'claude-opus-4',
        description: 'Research the topic',
        prompt: 'Investigate best practices for React testing.',
        outputVar: 'RESEARCH_RESULT',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [spawnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits SpawnAgent with runtime variable reference in input', () => {
      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'analyzer',
        model: 'claude-sonnet-4',
        description: 'Analyze data',
        input: {
          type: 'object',
          properties: [
            {
              name: 'dataPath',
              value: {
                type: 'runtimeVarRef',
                ref: {
                  kind: 'runtimeVarRef',
                  varName: 'CTX',
                  path: ['filePath'],
                },
              },
            },
          ],
        },
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [spawnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits SpawnAgent loaded from file', () => {
      const spawnNode: SpawnAgentNode = {
        kind: 'spawnAgent',
        agent: 'custom-agent',
        model: 'claude-opus-4',
        description: 'Custom agent from file',
        prompt: 'Execute custom workflow.',
        loadFromFile: '.claude/agents/custom-agent.md',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [spawnNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('AskUser', () => {
    it('emits basic AskUser with options', () => {
      const askUserNode: AskUserNode = {
        kind: 'askUser',
        question: 'Which environment should we deploy to?',
        options: [
          { value: 'staging', label: 'Staging' },
          { value: 'production', label: 'Production' },
        ],
        outputVar: 'ENVIRONMENT',
        multiSelect: false,
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [askUserNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits AskUser with multiSelect', () => {
      const askUserNode: AskUserNode = {
        kind: 'askUser',
        question: 'Which features should be enabled?',
        options: [
          { value: 'feature-a', label: 'Feature A', description: 'Enable experimental feature A' },
          { value: 'feature-b', label: 'Feature B', description: 'Enable beta feature B' },
          { value: 'feature-c', label: 'Feature C' },
        ],
        outputVar: 'FEATURES',
        multiSelect: true,
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [askUserNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits AskUser with header', () => {
      const askUserNode: AskUserNode = {
        kind: 'askUser',
        question: 'Confirm deletion?',
        options: [
          { value: 'yes', label: 'Yes, delete' },
          { value: 'no', label: 'No, keep it' },
        ],
        outputVar: 'CONFIRM_DELETE',
        header: 'Warning',
        multiSelect: false,
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [askUserNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('RuntimeCall', () => {
    it('emits basic RuntimeCall with literal args', () => {
      const runtimeCallNode: RuntimeCallNode = {
        kind: 'runtimeCall',
        fnName: 'calculatePrice',
        args: {
          quantity: { type: 'literal', value: 10 },
          unitPrice: { type: 'literal', value: 5.99 },
        },
        outputVar: 'TOTAL_PRICE',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: ['calculatePrice'],
        children: [runtimeCallNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits RuntimeCall with runtime variable references', () => {
      const runtimeCallNode: RuntimeCallNode = {
        kind: 'runtimeCall',
        fnName: 'processData',
        args: {
          input: {
            type: 'runtimeVarRef',
            ref: {
              kind: 'runtimeVarRef',
              varName: 'CTX',
              path: ['data'],
            },
          },
          config: {
            type: 'runtimeVarRef',
            ref: {
              kind: 'runtimeVarRef',
              varName: 'CONFIG',
              path: [],
            },
          },
        },
        outputVar: 'RESULT',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: ['processData'],
        children: [runtimeCallNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits RuntimeCall with mixed arg types', () => {
      const runtimeCallNode: RuntimeCallNode = {
        kind: 'runtimeCall',
        fnName: 'sendNotification',
        args: {
          message: { type: 'literal', value: 'Task completed' },
          userId: {
            type: 'runtimeVarRef',
            ref: {
              kind: 'runtimeVarRef',
              varName: 'USER',
              path: ['id'],
            },
          },
          priority: { type: 'literal', value: 'high' },
        },
        outputVar: 'NOTIFICATION_ID',
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: ['sendNotification'],
        children: [runtimeCallNode],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('OnStatus', () => {
    it('emits OnStatus with SUCCESS status', () => {
      const outputRef: OutputReference = {
        kind: 'outputReference',
        agent: 'test-runner',
      };

      const onStatusNode: OnStatusNode = {
        kind: 'onStatus',
        outputRef,
        status: 'SUCCESS',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'All tests passed!' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [onStatusNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits OnStatus with ERROR status', () => {
      const outputRef: OutputReference = {
        kind: 'outputReference',
        agent: 'deployer',
      };

      const onStatusNode: OnStatusNode = {
        kind: 'onStatus',
        outputRef,
        status: 'ERROR',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Deployment failed. Rolling back...' }],
          },
          {
            kind: 'codeBlock',
            language: 'bash',
            content: 'git revert HEAD',
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [onStatusNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits OnStatus with BLOCKED status', () => {
      const outputRef: OutputReference = {
        kind: 'outputReference',
        agent: 'approval-agent',
      };

      const onStatusNode: OnStatusNode = {
        kind: 'onStatus',
        outputRef,
        status: 'BLOCKED',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Approval required before proceeding.' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [onStatusNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });

    it('emits OnStatus with NOT_FOUND status', () => {
      const outputRef: OutputReference = {
        kind: 'outputReference',
        agent: 'finder',
      };

      const onStatusNode: OnStatusNode = {
        kind: 'onStatus',
        outputRef,
        status: 'NOT_FOUND',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Resource not found. Creating new one...' }],
          },
        ],
      };

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: [],
        children: [onStatusNode],
      };

      expect(emit(doc)).toMatchSnapshot();
    });
  });

  describe('Control Flow Integration', () => {
    it('emits Loop containing Break', () => {
      const breakNode: BreakNode = {
        kind: 'break',
        message: 'Found matching item.',
      };

      const loopNode: LoopNode = {
        kind: 'loop',
        max: 100,
        counterVar: 'i',
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Searching...' }],
          },
          breakNode,
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
});
