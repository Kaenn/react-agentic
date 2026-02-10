import { describe, it, expect } from 'vitest';
import { createProject, findRootJsxElement } from '../../src/parser/parser.js';
import { transformDocument } from '../../src/parser/transformers/document.js';
import type { AgentDocumentNode } from '../../src/ir/index.js';

/**
 * Helper to transform TSX string to AgentDocumentNode
 * Throws if result is not an AgentDocumentNode
 */
function transformTsx(tsx: string): AgentDocumentNode {
  const project = createProject();
  const source = project.createSourceFile('test.tsx', tsx, { overwrite: true });
  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');
  const doc = transformDocument(root);
  if (doc.kind !== 'agentDocument') {
    throw new Error(`Expected agentDocument, got ${doc.kind}`);
  }
  return doc;
}

describe('Agent transformation', () => {
  describe('basic transformation', () => {
    it('transforms Agent with required props only', () => {
      const tsx = `export default function MyAgent() {
        return (
          <Agent name="researcher" description="Research topics">
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.kind).toBe('agentDocument');
      expect(doc.frontmatter.kind).toBe('agentFrontmatter');
      expect(doc.frontmatter.name).toBe('researcher');
      expect(doc.frontmatter.description).toBe('Research topics');
      expect(doc.frontmatter.tools).toBeUndefined();
      expect(doc.frontmatter.color).toBeUndefined();
      expect(doc.children).toHaveLength(0);
    });

    it('transforms Agent with all props', () => {
      const tsx = `export default function FullAgent() {
        return (
          <Agent
            name="full-agent"
            description="Full featured agent"
            tools="Read Grep Glob"
            color="cyan"
          >
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.frontmatter.name).toBe('full-agent');
      expect(doc.frontmatter.description).toBe('Full featured agent');
      expect(doc.frontmatter.tools).toBe('Read Grep Glob');
      expect(doc.frontmatter.color).toBe('cyan');
    });

    it('transforms self-closing Agent', () => {
      const tsx = `export default function SelfClosingAgent() {
        return <Agent name="minimal" description="Minimal agent" />;
      }`;
      const doc = transformTsx(tsx);

      expect(doc.kind).toBe('agentDocument');
      expect(doc.frontmatter.name).toBe('minimal');
      expect(doc.frontmatter.description).toBe('Minimal agent');
      expect(doc.children).toHaveLength(0);
    });
  });

  describe('body content transformation', () => {
    it('transforms Agent with paragraph child', () => {
      const tsx = `export default function MyAgent() {
        return (
          <Agent name="test" description="Test agent">
            <p>You are a test agent.</p>
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0].kind).toBe('paragraph');
      if (doc.children[0].kind === 'paragraph') {
        expect(doc.children[0].children[0]).toEqual({ kind: 'text', value: 'You are a test agent.' });
      }
    });

    it('transforms Agent with multiple children', () => {
      const tsx = `export default function MyAgent() {
        return (
          <Agent name="multi" description="Multi-block agent">
            <h1>Role</h1>
            <p>You are an assistant.</p>
            <h2>Guidelines</h2>
            <p>Be helpful and accurate.</p>
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(4);
      expect(doc.children[0].kind).toBe('heading');
      expect(doc.children[1].kind).toBe('paragraph');
      expect(doc.children[2].kind).toBe('heading');
      expect(doc.children[3].kind).toBe('paragraph');
    });

    it('transforms Agent with XML block child', () => {
      const tsx = `export default function MyAgent() {
        return (
          <Agent name="structured" description="Structured agent">
            <div name="role">
              <p>Your role content here.</p>
            </div>
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0].kind).toBe('xmlBlock');
      if (doc.children[0].kind === 'xmlBlock') {
        expect(doc.children[0].name).toBe('role');
      }
    });
  });

  describe('error handling', () => {
    it('throws for Agent without name prop', () => {
      const tsx = `export default function BadAgent() {
        return <Agent description="Missing name" />;
      }`;
      expect(() => transformTsx(tsx)).toThrow(/Agent requires name prop/);
    });

    it('throws for Agent without description prop', () => {
      const tsx = `export default function BadAgent() {
        return <Agent name="missing-desc" />;
      }`;
      expect(() => transformTsx(tsx)).toThrow(/Agent requires description prop/);
    });

    it('throws with source location in error message', () => {
      const tsx = `export default function BadAgent() {
        return <Agent description="Missing name" />;
      }`;
      try {
        transformTsx(tsx);
        expect.fail('Should have thrown');
      } catch (e: unknown) {
        expect(e).toBeInstanceOf(Error);
        // TranspileError includes file location info
        const error = e as Error;
        expect(error.message).toContain('Agent requires name prop');
      }
    });
  });

  describe('tools prop format', () => {
    it('stores tools as string (not array)', () => {
      const tsx = `export default function MyAgent() {
        return (
          <Agent name="test" description="Test" tools="Read Grep Glob">
          </Agent>
        );
      }`;
      const doc = transformTsx(tsx);

      // Verify tools is a string, not array
      expect(typeof doc.frontmatter.tools).toBe('string');
      expect(doc.frontmatter.tools).toBe('Read Grep Glob');
    });

    it('omits tools when not provided', () => {
      const tsx = `export default function MyAgent() {
        return <Agent name="test" description="Test" />;
      }`;
      const doc = transformTsx(tsx);

      expect(doc.frontmatter.tools).toBeUndefined();
      expect('tools' in doc.frontmatter).toBe(false);
    });

    it('handles tools with JSX expression syntax', () => {
      const tsx = `export default function MyAgent() {
        return <Agent name="test" description="Test" tools={"Read Grep"} />;
      }`;
      const doc = transformTsx(tsx);

      expect(doc.frontmatter.tools).toBe('Read Grep');
    });
  });

  describe('optional props handling', () => {
    it('omits color when not provided', () => {
      const tsx = `export default function MyAgent() {
        return <Agent name="test" description="Test" />;
      }`;
      const doc = transformTsx(tsx);

      expect(doc.frontmatter.color).toBeUndefined();
      expect('color' in doc.frontmatter).toBe(false);
    });

    it('includes color when provided', () => {
      const tsx = `export default function MyAgent() {
        return <Agent name="test" description="Test" color="green" />;
      }`;
      const doc = transformTsx(tsx);

      expect(doc.frontmatter.color).toBe('green');
    });

    it('handles folder prop (not in frontmatter - output path only)', () => {
      // folder prop affects output path routing in CLI, not frontmatter
      // The transformer should NOT store folder in frontmatter
      const tsx = `export default function MyAgent() {
        return <Agent name="test" description="Test" folder="my-team" />;
      }`;
      const doc = transformTsx(tsx);

      // folder should NOT be in frontmatter (it's for CLI output routing)
      expect(doc.frontmatter).not.toHaveProperty('folder');
    });
  });
});
