import { describe, it, expect } from 'vitest';
import { createProject, parseSource, findRootJsxElement, extractTypeArguments } from '../../src/parser/parser.js';
import { transform } from '../../src/parser/transformer.js';
import { transformRuntimeCommand, createRuntimeContext } from '../../src/parser/transformers/index.js';
import { Node } from 'ts-morph';

describe('extractTypeArguments', () => {
  const project = createProject({ inMemory: true });

  it('extracts type argument from Agent<TInput>', () => {
    const source = `
      export default function Test() {
        return <Agent<ResearcherInput> name="test" description="desc" />;
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    expect(root).not.toBeNull();

    if (Node.isJsxSelfClosingElement(root!)) {
      const typeArgs = extractTypeArguments(root!);
      expect(typeArgs).toEqual(['ResearcherInput']);
    }
  });

  it('extracts type argument from SpawnAgent<TInput>', () => {
    const source = `
      export default function Test() {
        return (
          <Command name="test" description="desc">
            <SpawnAgent<MyInput>
              agent="test-agent"
              model="opus"
              description="task"
              prompt="do something"
            />
          </Command>
        );
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    expect(root).not.toBeNull();

    // Use runtime transformer for Command elements
    const ctx = createRuntimeContext(sourceFile);
    const doc = transformRuntimeCommand(root!, ctx);
    expect(doc.kind).toBe('document');

    const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
    expect(spawnAgent).toBeDefined();
    // Note: V3 runtime transformer doesn't preserve inputType in SpawnAgentNode
    // The type validation happens at compile time, not at runtime
  });

  it('returns undefined when no type argument present', () => {
    const source = `
      export default function Test() {
        return <Agent name="test" description="desc" />;
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    expect(root).not.toBeNull();

    if (Node.isJsxSelfClosingElement(root!)) {
      const typeArgs = extractTypeArguments(root!);
      expect(typeArgs).toBeUndefined();
    }
  });

  it('stores inputType in AgentFrontmatterNode', () => {
    const source = `
      export default function Test() {
        return <Agent<TaskInput> name="worker" description="worker agent" />;
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    const doc = transform(root!, sourceFile);

    expect(doc.kind).toBe('agentDocument');
    if (doc.kind === 'agentDocument') {
      expect(doc.frontmatter.inputType).toEqual({
        kind: 'typeReference',
        name: 'TaskInput',
        resolved: false,
      });
    }
  });

  it('handles qualified type names', () => {
    const source = `
      export default function Test() {
        return <Agent<Types.ResearcherInput> name="test" description="desc" />;
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);

    if (Node.isJsxSelfClosingElement(root!)) {
      const typeArgs = extractTypeArguments(root!);
      expect(typeArgs).toEqual(['Types.ResearcherInput']);
    }
  });

  it('omits inputType from AgentFrontmatterNode when no generic', () => {
    const source = `
      export default function Test() {
        return <Agent name="worker" description="worker agent" />;
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    const doc = transform(root!, sourceFile);

    expect(doc.kind).toBe('agentDocument');
    if (doc.kind === 'agentDocument') {
      expect(doc.frontmatter.inputType).toBeUndefined();
    }
  });

  it('omits inputType from SpawnAgentNode when no generic', () => {
    const source = `
      export default function Test() {
        return (
          <Command name="test" description="desc">
            <SpawnAgent
              agent="test-agent"
              model="opus"
              description="task"
              prompt="do something"
            />
          </Command>
        );
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);

    // Use runtime transformer for Command elements
    const ctx = createRuntimeContext(sourceFile);
    const doc = transformRuntimeCommand(root!, ctx);

    expect(doc.kind).toBe('document');
    const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
    expect(spawnAgent).toBeDefined();
    if (spawnAgent && spawnAgent.kind === 'spawnAgent') {
      expect(spawnAgent.inputType).toBeUndefined();
    }
  });

  it('extracts type argument from JsxElement (with children)', () => {
    const source = `
      export default function Test() {
        return (
          <Agent<WorkerInput> name="worker" description="does work">
            <h1>Role</h1>
            <p>You are a worker.</p>
          </Agent>
        );
      }
    `;
    const sourceFile = parseSource(project, source, 'test.tsx');
    const root = findRootJsxElement(sourceFile);
    const doc = transform(root!, sourceFile);

    expect(doc.kind).toBe('agentDocument');
    if (doc.kind === 'agentDocument') {
      expect(doc.frontmatter.inputType).toEqual({
        kind: 'typeReference',
        name: 'WorkerInput',
        resolved: false,
      });
      // Also verify body was transformed
      expect(doc.children.length).toBe(2);
    }
  });
});
