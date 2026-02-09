import { describe, expect, it } from 'vitest';
import { emitDocument, emitAgent } from '../../src/index.js';
import type {
  DocumentNode,
  AgentDocumentNode,
  FrontmatterNode,
  RuntimeVarDeclNode,
  AgentFrontmatterNode,
} from '../../src/index.js';

describe('Document Components', () => {
  describe('DocumentNode', () => {
    it('emits document with frontmatter', () => {
      const frontmatter: FrontmatterNode = {
        kind: 'frontmatter',
        data: {
          name: 'deploy',
          description: 'Deploy application to production',
          allowedTools: ['Read', 'Write', 'Bash'],
        },
      };

      const doc: DocumentNode = {
        kind: 'document',
        frontmatter,
        runtimeVars: [],
        runtimeFunctions: [],
        children: [
          {
            kind: 'heading',
            level: 1,
            children: [{ kind: 'text', value: 'Deploy Application' }],
          },
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'This command deploys the application to production.' },
            ],
          },
        ],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits document with runtime variables', () => {
      const runtimeVars: RuntimeVarDeclNode[] = [
        {
          kind: 'runtimeVarDecl',
          varName: 'CTX',
          tsType: 'DeployContext',
        },
        {
          kind: 'runtimeVarDecl',
          varName: 'RESULT',
          tsType: 'DeployResult',
        },
      ];

      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars,
        runtimeFunctions: [],
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Runtime-enabled command.' }],
          },
        ],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits document with runtime functions', () => {
      const doc: DocumentNode = {
        kind: 'document',
        runtimeVars: [],
        runtimeFunctions: ['validateConfig', 'deployToServer', 'sendNotification'],
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Command with runtime functions.' }],
          },
        ],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits complete document with all features', () => {
      const frontmatter: FrontmatterNode = {
        kind: 'frontmatter',
        data: {
          name: 'migrate',
          description: 'Run database migrations',
          allowedTools: ['Read', 'Bash'],
          args: ['environment'],
        },
      };

      const runtimeVars: RuntimeVarDeclNode[] = [
        {
          kind: 'runtimeVarDecl',
          varName: 'ENV',
          tsType: 'string',
        },
      ];

      const doc: DocumentNode = {
        kind: 'document',
        frontmatter,
        runtimeVars,
        runtimeFunctions: ['runMigration'],
        children: [
          {
            kind: 'heading',
            level: 1,
            children: [{ kind: 'text', value: 'Database Migration' }],
          },
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'Run migrations for the specified environment.' },
            ],
          },
          {
            kind: 'codeBlock',
            language: 'bash',
            content: 'npm run migrate -- --env=$ENV',
          },
        ],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });

    it('emits document with metadata (folder)', () => {
      const doc: DocumentNode = {
        kind: 'document',
        metadata: {
          folder: 'gsd',
        },
        runtimeVars: [],
        runtimeFunctions: [],
        children: [
          {
            kind: 'paragraph',
            children: [{ kind: 'text', value: 'Command in gsd folder.' }],
          },
        ],
      };

      expect(emitDocument(doc)).toMatchSnapshot();
    });
  });

  describe('AgentDocumentNode', () => {
    it('emits agent with basic frontmatter', () => {
      const frontmatter: AgentFrontmatterNode = {
        kind: 'agentFrontmatter',
        name: 'test-runner',
        description: 'Executes test suites and reports results',
        tools: 'Read Bash',
      };

      const doc: AgentDocumentNode = {
        kind: 'agentDocument',
        frontmatter,
        children: [
          {
            kind: 'heading',
            level: 1,
            children: [{ kind: 'text', value: 'Test Runner Agent' }],
          },
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'This agent runs tests and provides detailed reports.' },
            ],
          },
        ],
      };

      expect(emitAgent(doc)).toMatchSnapshot();
    });

    it('emits agent with typed input/output', () => {
      const frontmatter: AgentFrontmatterNode = {
        kind: 'agentFrontmatter',
        name: 'code-reviewer',
        description: 'Reviews code for quality and security',
        tools: 'Read Grep',
        color: 'cyan',
        inputType: {
          kind: 'typeReference',
          name: 'ReviewInput',
          resolved: true,
        },
        outputType: {
          kind: 'typeReference',
          name: 'ReviewOutput',
          resolved: true,
        },
      };

      const doc: AgentDocumentNode = {
        kind: 'agentDocument',
        frontmatter,
        children: [
          {
            kind: 'xmlBlock',
            name: 'role',
            children: [
              {
                kind: 'paragraph',
                children: [
                  { kind: 'text', value: 'You are a code review expert.' },
                ],
              },
            ],
          },
          {
            kind: 'xmlBlock',
            name: 'process',
            children: [
              {
                kind: 'list',
                ordered: true,
                items: [
                  {
                    kind: 'listItem',
                    children: [
                      {
                        kind: 'paragraph',
                        children: [{ kind: 'text', value: 'Read the input files' }],
                      },
                    ],
                  },
                  {
                    kind: 'listItem',
                    children: [
                      {
                        kind: 'paragraph',
                        children: [{ kind: 'text', value: 'Check for issues' }],
                      },
                    ],
                  },
                  {
                    kind: 'listItem',
                    children: [
                      {
                        kind: 'paragraph',
                        children: [{ kind: 'text', value: 'Return structured output' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      expect(emitAgent(doc)).toMatchSnapshot();
    });

    it('emits agent with all optional fields', () => {
      const frontmatter: AgentFrontmatterNode = {
        kind: 'agentFrontmatter',
        name: 'analyzer',
        description: 'Analyzes data and provides insights',
        tools: 'Read Bash Grep Glob',
        color: 'magenta',
        inputType: {
          kind: 'typeReference',
          name: 'AnalyzerInput',
          resolved: true,
        },
        outputType: {
          kind: 'typeReference',
          name: 'AnalyzerOutput',
          resolved: true,
        },
      };

      const doc: AgentDocumentNode = {
        kind: 'agentDocument',
        frontmatter,
        children: [
          {
            kind: 'heading',
            level: 1,
            children: [{ kind: 'text', value: 'Data Analyzer' }],
          },
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'Analyzes structured data and returns insights.' },
            ],
          },
          {
            kind: 'xmlBlock',
            name: 'output',
            children: [
              {
                kind: 'paragraph',
                children: [
                  { kind: 'text', value: 'Return JSON with analysis results.' },
                ],
              },
            ],
          },
        ],
      };

      expect(emitAgent(doc)).toMatchSnapshot();
    });

    it('emits agent without tools', () => {
      const frontmatter: AgentFrontmatterNode = {
        kind: 'agentFrontmatter',
        name: 'strategist',
        description: 'Provides strategic recommendations',
      };

      const doc: AgentDocumentNode = {
        kind: 'agentDocument',
        frontmatter,
        children: [
          {
            kind: 'paragraph',
            children: [
              { kind: 'text', value: 'This agent provides high-level strategic guidance.' },
            ],
          },
        ],
      };

      expect(emitAgent(doc)).toMatchSnapshot();
    });
  });
});
