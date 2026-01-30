import { describe, expect, it } from 'vitest';
import type {
  AgentDocumentNode,
  AgentFrontmatterNode,
  SpawnAgentNode,
  TypeReference,
} from '../../src/index.js';

describe('AgentFrontmatterNode', () => {
  it('creates with required fields only', () => {
    const node: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'researcher',
      description: 'Research topics using available tools',
    };
    expect(node.kind).toBe('agentFrontmatter');
    expect(node.name).toBe('researcher');
    expect(node.description).toBe('Research topics using available tools');
    expect(node.tools).toBeUndefined();
    expect(node.color).toBeUndefined();
  });

  it('creates with all optional fields', () => {
    const node: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'full-agent',
      description: 'Full featured agent',
      tools: 'Read Grep Glob WebFetch',
      color: 'cyan',
    };
    expect(node.tools).toBe('Read Grep Glob WebFetch');
    expect(node.color).toBe('cyan');
  });
});

describe('AgentDocumentNode', () => {
  it('creates with frontmatter and empty children', () => {
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'test-agent',
      description: 'A test agent',
    };
    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter,
      children: [],
    };
    expect(doc.kind).toBe('agentDocument');
    expect(doc.frontmatter.name).toBe('test-agent');
    expect(doc.children).toHaveLength(0);
  });

  it('creates with frontmatter and block children', () => {
    const frontmatter: AgentFrontmatterNode = {
      kind: 'agentFrontmatter',
      name: 'doc-agent',
      description: 'Agent with content',
    };
    const doc: AgentDocumentNode = {
      kind: 'agentDocument',
      frontmatter,
      children: [
        { kind: 'heading', level: 1, children: [{ kind: 'text', value: 'Role' }] },
        { kind: 'paragraph', children: [{ kind: 'text', value: 'You are a researcher.' }] },
      ],
    };
    expect(doc.children).toHaveLength(2);
    expect(doc.children[0].kind).toBe('heading');
  });
});

describe('SpawnAgentNode', () => {
  it('creates with all required fields', () => {
    const node: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'gsd-researcher',
      model: '{researcher_model}',
      description: 'Research the topic thoroughly',
      prompt: 'Research {topic} and summarize findings',
    };
    expect(node.kind).toBe('spawnAgent');
    expect(node.agent).toBe('gsd-researcher');
    expect(node.model).toBe('{researcher_model}');
    expect(node.description).toBe('Research the topic thoroughly');
    expect(node.prompt).toBe('Research {topic} and summarize findings');
  });

  it('preserves variable placeholders in prompt', () => {
    const node: SpawnAgentNode = {
      kind: 'spawnAgent',
      agent: 'analyzer',
      model: 'sonnet',
      description: 'Analyze code',
      prompt: `<context>
Analyze {file_path} for:
- {analysis_type}
- Performance issues
</context>`,
    };
    expect(node.prompt).toContain('{file_path}');
    expect(node.prompt).toContain('{analysis_type}');
  });
});

describe('TypeReference', () => {
  it('creates with name only', () => {
    const ref: TypeReference = {
      kind: 'typeReference',
      name: 'ResearcherInput',
    };
    expect(ref.kind).toBe('typeReference');
    expect(ref.name).toBe('ResearcherInput');
    expect(ref.sourceFile).toBeUndefined();
    expect(ref.resolved).toBeUndefined();
  });

  it('creates with source file reference', () => {
    const ref: TypeReference = {
      kind: 'typeReference',
      name: 'ResearcherInput',
      sourceFile: './agents/researcher.tsx',
      resolved: false,
    };
    expect(ref.sourceFile).toBe('./agents/researcher.tsx');
    expect(ref.resolved).toBe(false);
  });

  it('tracks resolution status', () => {
    const resolved: TypeReference = {
      kind: 'typeReference',
      name: 'AnalyzerOutput',
      sourceFile: './agents/analyzer.tsx',
      resolved: true,
    };
    expect(resolved.resolved).toBe(true);
  });
});

describe('IR union type checking', () => {
  it('SpawnAgentNode is assignable to BlockNode', () => {
    // TypeScript compile-time check - if this compiles, the union is correct
    const block: import('../../src/index.js').BlockNode = {
      kind: 'spawnAgent',
      agent: 'test',
      model: 'sonnet',
      description: 'Test',
      prompt: 'Test prompt',
    };
    expect(block.kind).toBe('spawnAgent');
  });
});
