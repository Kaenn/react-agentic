import { describe, it, expect } from 'vitest';
import { createProject, findRootJsxElement } from '../../src/parser/parser.js';
import { Transformer } from '../../src/parser/transformer.js';
import type { DocumentNode, SpawnAgentNode, SpawnAgentInput } from '../../src/ir/index.js';

/**
 * Helper to transform TSX string containing Command with SpawnAgent
 * Optionally passes sourceFile for type resolution during validation
 */
function transformTsx(tsx: string, options?: { withSourceFile?: boolean }): DocumentNode {
  const project = createProject();
  const source = project.createSourceFile('test.tsx', tsx, { overwrite: true });
  const root = findRootJsxElement(source);
  if (!root) throw new Error('No JSX found');
  const transformer = new Transformer();
  const doc = transformer.transform(root, options?.withSourceFile ? source : undefined);
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

  describe('input prop parsing', () => {
    it('transforms input with VariableRef', () => {
      const tsx = `
        const ctx = useVariable("CTX", { bash: \`echo hi\` });
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent input={ctx} agent="a" model="m" description="d" />
            </Command>
          );
        }`;
      const doc = transformTsx(tsx, { withSourceFile: true });
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.input).toEqual({ type: 'variable', variableName: 'CTX' });
      expect(spawn.prompt).toBeUndefined();
    });

    it('transforms input with object literal', () => {
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              input={{ phase: "5", goal: "Complete task" }}
              agent="a" model="m" description="d"
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx, { withSourceFile: true });
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.input?.type).toBe('object');
      if (spawn.input?.type === 'object') {
        expect(spawn.input.properties).toContainEqual({
          name: 'phase',
          value: { type: 'string', value: '5' }
        });
        expect(spawn.input.properties).toContainEqual({
          name: 'goal',
          value: { type: 'string', value: 'Complete task' }
        });
      }
    });

    it('preserves {placeholder} patterns in object values', () => {
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              input={{ phase: "{phase_var}" }}
              agent="a" model="m" description="d"
            />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx, { withSourceFile: true });
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.input?.type).toBe('object');
      if (spawn.input?.type === 'object') {
        expect(spawn.input.properties).toContainEqual({
          name: 'phase',
          value: { type: 'placeholder', name: 'phase_var' }
        });
      }
    });

    it('extracts children as extraInstructions', () => {
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent input={{ phase: "5" }} agent="a" model="m" description="d">
              Additional context here.
            </SpawnAgent>
          </Command>
        );
      }`;
      const doc = transformTsx(tsx, { withSourceFile: true });
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.extraInstructions).toContain('Additional context');
    });

    it('throws if both prompt and input provided', () => {
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              prompt="old style"
              input={{ phase: "5" }}
              agent="a" model="m" description="d"
            />
          </Command>
        );
      }`;
      expect(() => transformTsx(tsx, { withSourceFile: true })).toThrow(/Cannot use both prompt and input/);
    });

    it('throws if input missing required interface property', () => {
      const tsx = `
        export interface TaskInput {
          goal: string;
          context: string;
          priority?: number;
        }

        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<TaskInput>
                input={{ goal: "Complete task" }}
                agent="a" model="m" description="d"
              />
            </Command>
          );
        }`;
      // Input provides 'goal' but missing required 'context'
      expect(() => transformTsx(tsx, { withSourceFile: true })).toThrow(/missing required properties.*context/i);
    });

    it('passes validation when all required properties present', () => {
      const tsx = `
        export interface CompleteInput {
          a: string;
          b: string;
          c?: string;
        }

        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<CompleteInput>
                input={{ a: "value1", b: "value2" }}
                agent="a" model="m" description="d"
              />
            </Command>
          );
        }`;
      // Should not throw - required 'a' and 'b' are provided, 'c' is optional
      expect(() => transformTsx(tsx, { withSourceFile: true })).not.toThrow();
    });

    it('still supports prompt prop (backward compat)', () => {
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent prompt="Do task" agent="a" model="m" description="d" />
          </Command>
        );
      }`;
      const doc = transformTsx(tsx);
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.prompt).toBe('Do task');
      expect(spawn.input).toBeUndefined();
    });

    it('skips validation when no type parameter provided', () => {
      // No generic type = no validation (backward compat)
      const tsx = `export default function Test() {
        return (
          <Command name="test" description="Test">
            <SpawnAgent
              input={{ anything: "works" }}
              agent="a" model="m" description="d"
            />
          </Command>
        );
      }`;
      // Should not throw even though 'anything' is not a known property
      expect(() => transformTsx(tsx, { withSourceFile: true })).not.toThrow();
    });

    it('handles VariableRef in object properties', () => {
      const tsx = `
        const myVar = useVariable("MY_VAR", { bash: \`echo hello\` });
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent
                input={{ phase: "5", data: myVar }}
                agent="a" model="m" description="d"
              />
            </Command>
          );
        }`;
      const doc = transformTsx(tsx, { withSourceFile: true });
      const spawn = doc.children[0] as SpawnAgentNode;
      expect(spawn.input?.type).toBe('object');
      if (spawn.input?.type === 'object') {
        expect(spawn.input.properties).toContainEqual({
          name: 'data',
          value: { type: 'variable', name: 'MY_VAR' }
        });
      }
    });
  });
});
