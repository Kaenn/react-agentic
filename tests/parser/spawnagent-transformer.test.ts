import { describe, it, expect } from 'vitest';
import { createProject, findRootJsxElement } from '../../src/parser/parser.js';
import { Transformer } from '../../src/parser/transformer.js';
import type { DocumentNode, SpawnAgentNode } from '../../src/ir/index.js';

/**
 * Helper to transform TSX string containing Command with SpawnAgent
 */
function transformTsx(tsx: string): DocumentNode {
  const project = createProject();
  const source = project.createSourceFile('test.tsx', tsx, { overwrite: true });
  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');
  const transformer = new Transformer();
  const doc = transformer.transform(root);
  if (doc.kind !== 'document') {
    throw new Error(`Expected document, got ${doc.kind}`);
  }
  return doc;
}

describe('SpawnAgent transformation', () => {
  describe('basic transformation', () => {
    it('transforms SpawnAgent with all props', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test command">
            <SpawnAgent
              agent="gsd-researcher"
              model="{model}"
              description="Research task"
              prompt="Do research"
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0].kind).toBe('spawnAgent');

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.agent).toBe('gsd-researcher');
      expect(spawn.model).toBe('{model}');
      expect(spawn.description).toBe('Research task');
      expect(spawn.prompt).toBe('Do research');
    });

    it('transforms self-closing SpawnAgent', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent agent="test" model="m" description="d" prompt="p" />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(1);
      expect(doc.children[0].kind).toBe('spawnAgent');
    });
  });

  describe('placeholder preservation', () => {
    it('preserves {variable} in model prop', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="{researcher_model}"
              description="desc"
              prompt="prompt"
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.model).toBe('{researcher_model}');
    });

    it('preserves {variable} in prompt prop (string literal)', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt="Phase: {phase_number}"
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Phase: {phase_number}');
    });

    it('preserves {variable} in JSX expression string', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt={"Content: {variable}"}
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Content: {variable}');
    });
  });

  describe('template literal handling', () => {
    it('handles no-substitution template literal', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt={\`Simple template content\`}
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Simple template content');
    });

    it('converts ${var} to {var} in template expressions', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt={\`Phase: \${phase}\`}
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Phase: {phase}');
    });

    it('preserves multi-line template content', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt={\`Line 1
Line 2
Line 3\`}
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Line 1\nLine 2\nLine 3');
    });

    it('handles complex template with multiple substitutions', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              agent="test"
              model="m"
              description="d"
              prompt={\`<context>
Phase: \${phase}
Goal: \${goal}
</context>\`}
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toContain('{phase}');
      expect(spawn.prompt).toContain('{goal}');
      expect(spawn.prompt).toContain('<context>');
    });
  });

  describe('error handling', () => {
    it('throws for missing agent prop', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent model="m" description="d" prompt="p" />
          </Command>
        );
      }`;
      expect(() => transformTsx(tsx)).toThrow(/SpawnAgent requires agent prop/);
    });

    it('throws for missing model prop', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent agent="a" description="d" prompt="p" />
          </Command>
        );
      }`;
      expect(() => transformTsx(tsx)).toThrow(/SpawnAgent requires model prop/);
    });

    it('throws for missing description prop', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent agent="a" model="m" prompt="p" />
          </Command>
        );
      }`;
      expect(() => transformTsx(tsx)).toThrow(/SpawnAgent requires description prop/);
    });

    it('throws for missing prompt or input prop', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent agent="a" model="m" description="d" />
          </Command>
        );
      }`;
      expect(() => transformTsx(tsx)).toThrow(/SpawnAgent requires either prompt or input prop/);
    });
  });

  describe('multiple SpawnAgent elements', () => {
    it('transforms multiple SpawnAgent in single Command', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent agent="a1" model="m1" description="d1" prompt="p1" />
            <SpawnAgent agent="a2" model="m2" description="d2" prompt="p2" />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(2);
      expect(doc.children[0].kind).toBe('spawnAgent');
      expect(doc.children[1].kind).toBe('spawnAgent');

      const spawn1 = doc.children[0] as SpawnAgentNode;
      const spawn2 = doc.children[1] as SpawnAgentNode;
      expect(spawn1.agent).toBe('a1');
      expect(spawn2.agent).toBe('a2');
    });
  });

  describe('SpawnAgent with sibling content', () => {
    it('transforms SpawnAgent alongside other block elements', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            <h1>Phase Planning</h1>
            <p>This command spawns an agent.</p>
            <SpawnAgent agent="researcher" model="{model}" description="Research" prompt="Do research" />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);

      expect(doc.children).toHaveLength(3);
      expect(doc.children[0].kind).toBe('heading');
      expect(doc.children[1].kind).toBe('paragraph');
      expect(doc.children[2].kind).toBe('spawnAgent');
    });
  });
});
