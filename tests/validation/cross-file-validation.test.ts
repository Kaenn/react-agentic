import { describe, it, expect, beforeAll } from 'vitest';
import { Project } from 'ts-morph';
import {
  createProject,
  parseSource,
  findRootJsxElement,
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
} from '../../src/parser/parser.js';
import { transform } from '../../src/parser/transformer.js';

describe('Cross-file validation', () => {
  let project: Project;

  beforeAll(() => {
    project = createProject({ inMemory: true });
  });

  describe('resolveTypeImport', () => {
    it('resolves locally defined interface', () => {
      const source = `
        export interface LocalInput {
          name: string;
          value: number;
        }

        export default function Test() {
          return <Agent<LocalInput> name="test" description="test" />;
        }
      `;
      const sourceFile = parseSource(project, source, 'local.tsx');
      const resolved = resolveTypeImport('LocalInput', sourceFile);

      expect(resolved).toBeDefined();
      expect(resolved?.interfaceName).toBe('LocalInput');
    });

    it('resolves type from same file (import simulation)', () => {
      // In-memory projects don't support cross-file imports
      // This test verifies local interface resolution which is the core mechanism
      const source = `
        export interface ResearcherInput {
          phase: string;
          description: string;
          requirements?: string;
        }

        export default function Researcher() {
          return <Agent<ResearcherInput> name="researcher" description="Research topics" />;
        }
      `;
      const sourceFile = parseSource(project, source, 'researcher.tsx');
      const resolved = resolveTypeImport('ResearcherInput', sourceFile);

      expect(resolved).toBeDefined();
      expect(resolved?.interfaceName).toBe('ResearcherInput');
      expect(resolved?.interface.getProperties()).toHaveLength(3);
    });

    it('returns undefined for non-existent type', () => {
      const source = `
        export default function Test() {
          return <Agent name="test" description="test" />;
        }
      `;
      const sourceFile = parseSource(project, source, 'notype.tsx');
      const resolved = resolveTypeImport('NonExistent', sourceFile);

      expect(resolved).toBeUndefined();
    });
  });

  describe('extractInterfaceProperties', () => {
    it('extracts required and optional properties', () => {
      const source = `
        export interface TestInput {
          required: string;
          alsoRequired: number;
          optional?: boolean;
        }
      `;
      const sourceFile = parseSource(project, source, 'props.tsx');
      const iface = sourceFile.getInterface('TestInput')!;
      const props = extractInterfaceProperties(iface);

      expect(props).toHaveLength(3);
      expect(props.find(p => p.name === 'required')?.required).toBe(true);
      expect(props.find(p => p.name === 'alsoRequired')?.required).toBe(true);
      expect(props.find(p => p.name === 'optional')?.required).toBe(false);
    });
  });

  describe('extractPromptPlaceholders', () => {
    it('extracts placeholder names from prompt', () => {
      const prompt = 'Phase: {phase}, Description: {description}';
      const placeholders = extractPromptPlaceholders(prompt);

      expect(placeholders.has('phase')).toBe(true);
      expect(placeholders.has('description')).toBe(true);
      expect(placeholders.size).toBe(2);
    });

    it('handles multi-line prompts', () => {
      const prompt = `<context>
Phase: {phase}
Goal: {goal}
</context>

Research: {topic}`;
      const placeholders = extractPromptPlaceholders(prompt);

      expect(placeholders.has('phase')).toBe(true);
      expect(placeholders.has('goal')).toBe(true);
      expect(placeholders.has('topic')).toBe(true);
      expect(placeholders.size).toBe(3);
    });

    it('returns empty set for prompt without placeholders', () => {
      const prompt = 'Just a plain prompt with no variables';
      const placeholders = extractPromptPlaceholders(prompt);

      expect(placeholders.size).toBe(0);
    });
  });

  describe('SpawnAgent validation integration', () => {
    it('validates prompt contains required interface properties', () => {
      // In-memory projects work with locally defined interfaces
      // This simulates the validation logic with interface in same file
      const commandSource = `
        export interface TaskInput {
          goal: string;
          context: string;
          priority?: number;
        }

        export default function RunTask() {
          return (
            <Command name="run" description="Run task">
              <SpawnAgent<TaskInput>
                agent="worker"
                model="opus"
                description="Execute task"
                prompt="Goal: {goal}"
              />
            </Command>
          );
        }
      `;
      const commandFile = parseSource(project, commandSource, 'commands/run.tsx');
      const root = findRootJsxElement(commandFile);
      const doc = transform(root!, commandFile);

      // Get the SpawnAgent node
      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      expect(spawnAgent).toBeDefined();
      expect(spawnAgent?.inputType?.name).toBe('TaskInput');

      // Resolve type and check properties (interface is local to file)
      const resolved = resolveTypeImport('TaskInput', commandFile);
      expect(resolved).toBeDefined();

      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt);

      // Check for missing required
      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(1);
      expect(missing[0].name).toBe('context');
    });

    it('passes validation when all required properties present', () => {
      // In-memory projects work with locally defined interfaces
      const commandSource = `
        export interface CompleteInput {
          a: string;
          b: string;
          c?: string;
        }

        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<CompleteInput>
                agent="complete"
                model="opus"
                description="test"
                prompt="{a} and {b}"
              />
            </Command>
          );
        }
      `;
      const commandFile = parseSource(project, commandSource, 'commands/test.tsx');
      const root = findRootJsxElement(commandFile);
      const doc = transform(root!, commandFile);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('CompleteInput', commandFile);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(0);
    });
  });

  describe('SpawnAgent cross-file input validation', () => {
    it('throws when input missing required property from local interface', () => {
      // In-memory projects work with locally defined interfaces
      // This test simulates the cross-file pattern using local interface
      const commandSource = `
        export interface ResearcherInput {
          topic: string;
          depth: string;
          format?: string;
        }

        export default function Research() {
          return (
            <Command name="research" description="Do research">
              <SpawnAgent<ResearcherInput>
                agent="researcher"
                model="opus"
                description="Research task"
                input={{ topic: "TypeScript" }}
              />
            </Command>
          );
        }
      `;

      const commandFile = parseSource(project, commandSource, 'commands/research.tsx');
      const root = findRootJsxElement(commandFile);

      // Transformer should throw because 'depth' is required but missing
      expect(() => {
        transform(root!, commandFile);
      }).toThrow(/missing required properties.*depth/i);
    });

    it('passes when all required properties provided for interface', () => {
      const commandSource = `
        export interface TaskInput {
          name: string;
          priority: string;
          notes?: string;
        }

        export default function RunTask() {
          return (
            <Command name="run" description="Run a task">
              <SpawnAgent<TaskInput>
                agent="task-runner"
                model="opus"
                description="Execute task"
                input={{ name: "Build", priority: "high" }}
              />
            </Command>
          );
        }
      `;

      const commandFile = parseSource(project, commandSource, 'commands/run.tsx');
      const root = findRootJsxElement(commandFile);

      // Should not throw - 'name' and 'priority' are provided, 'notes' is optional
      expect(() => {
        transform(root!, commandFile);
      }).not.toThrow();
    });

    it('handles placeholder values in cross-file input validation', () => {
      const commandSource = `
        export interface DynamicInput {
          phase: string;
          goal: string;
        }

        export default function Plan() {
          return (
            <Command name="plan" description="Plan phase">
              <SpawnAgent<DynamicInput>
                agent="planner"
                model="opus"
                description="Plan"
                input={{ phase: "{phase_num}", goal: "{goal_var}" }}
              />
            </Command>
          );
        }
      `;

      const commandFile = parseSource(project, commandSource, 'commands/plan.tsx');
      const root = findRootJsxElement(commandFile);

      // Should pass - both required properties provided (as placeholders)
      expect(() => {
        const doc = transform(root!, commandFile);
        const spawn = doc.children.find(c => c.kind === 'spawnAgent');
        expect(spawn?.input?.type).toBe('object');
      }).not.toThrow();
    });

    it('throws when multiple required properties are missing', () => {
      const commandSource = `
        export interface MultiInput {
          first: string;
          second: string;
          third: string;
          optional?: string;
        }

        export default function Multi() {
          return (
            <Command name="multi" description="Multi">
              <SpawnAgent<MultiInput>
                agent="multi"
                model="opus"
                description="Multi task"
                input={{ first: "only first" }}
              />
            </Command>
          );
        }
      `;

      const commandFile = parseSource(project, commandSource, 'commands/multi.tsx');
      const root = findRootJsxElement(commandFile);

      // Should throw with both 'second' and 'third' mentioned
      expect(() => {
        transform(root!, commandFile);
      }).toThrow(/missing required properties.*second.*third/i);
    });

    it('passes when interface has only optional properties', () => {
      const commandSource = `
        export interface OptionalInput {
          setting1?: string;
          setting2?: number;
        }

        export default function Optional() {
          return (
            <Command name="optional" description="Optional">
              <SpawnAgent<OptionalInput>
                agent="optional"
                model="opus"
                description="Optional task"
                input={{}}
              />
            </Command>
          );
        }
      `;

      const commandFile = parseSource(project, commandSource, 'commands/optional.tsx');
      const root = findRootJsxElement(commandFile);

      // Should not throw - all properties are optional
      expect(() => {
        transform(root!, commandFile);
      }).not.toThrow();
    });
  });
});
