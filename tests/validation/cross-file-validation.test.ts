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
import { transformDocument } from '../../src/parser/transformers/document.js';
import { transformRuntimeCommand, createRuntimeContext } from '../../src/parser/transformers/index.js';

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
      // Use runtime transformer for Command elements
      const ctx = createRuntimeContext(commandFile);
      const doc = transformRuntimeCommand(root!, ctx);

      // Get the SpawnAgent node
      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      expect(spawnAgent).toBeDefined();

      // Resolve type and check properties (interface is local to file)
      const resolved = resolveTypeImport('TaskInput', commandFile);
      expect(resolved).toBeDefined();

      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

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
      // Use runtime transformer for Command elements
      const ctx = createRuntimeContext(commandFile);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('CompleteInput', commandFile);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(0);
    });
  });

  describe('SpawnAgent cross-file input validation', () => {
    it('detects when input missing required property from local interface', () => {
      const source = `
        export interface TaskInput {
          goal: string;
          context: string;
        }
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<TaskInput>
                agent="worker"
                model="opus"
                description="Task"
                prompt="Goal: {goal}"
              />
            </Command>
          );
        }
      `;
      const file = parseSource(project, source, 'test-missing-1.tsx');
      const root = findRootJsxElement(file);
      const ctx = createRuntimeContext(file);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('TaskInput', file);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(1);
      expect(missing[0].name).toBe('context');
    });

    it('passes when all required properties provided for interface', () => {
      const source = `
        export interface TaskInput {
          goal: string;
          context: string;
        }
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<TaskInput>
                agent="worker"
                model="opus"
                description="Task"
                prompt="Goal: {goal}, Context: {context}"
              />
            </Command>
          );
        }
      `;
      const file = parseSource(project, source, 'test-complete-1.tsx');
      const root = findRootJsxElement(file);
      const ctx = createRuntimeContext(file);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('TaskInput', file);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(0);
    });

    it('handles placeholder values in prompt validation', () => {
      const source = `
        export interface Input {
          name: string;
          value: string;
        }
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<Input>
                agent="worker"
                model="opus"
                description="Task"
                prompt="Name: {name}, Value: {value}"
              />
            </Command>
          );
        }
      `;
      const file = parseSource(project, source, 'test-placeholders-1.tsx');
      const root = findRootJsxElement(file);
      const ctx = createRuntimeContext(file);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      expect(placeholders.has('name')).toBe(true);
      expect(placeholders.has('value')).toBe(true);
      expect(placeholders.size).toBe(2);
    });

    it('detects when multiple required properties are missing', () => {
      const source = `
        export interface MultiInput {
          a: string;
          b: string;
          c: string;
          optional?: string;
        }
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<MultiInput>
                agent="worker"
                model="opus"
                description="Task"
                prompt="A: {a}"
              />
            </Command>
          );
        }
      `;
      const file = parseSource(project, source, 'test-multi-missing-1.tsx');
      const root = findRootJsxElement(file);
      const ctx = createRuntimeContext(file);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('MultiInput', file);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(missing.length).toBe(2);
      expect(missing.map(m => m.name).sort()).toEqual(['b', 'c']);
    });

    it('passes when interface has only optional properties', () => {
      const source = `
        export interface OptionalInput {
          optional1?: string;
          optional2?: number;
        }
        export default function Test() {
          return (
            <Command name="test" description="Test">
              <SpawnAgent<OptionalInput>
                agent="worker"
                model="opus"
                description="Task"
                prompt="Simple prompt with no placeholders"
              />
            </Command>
          );
        }
      `;
      const file = parseSource(project, source, 'test-optional-1.tsx');
      const root = findRootJsxElement(file);
      const ctx = createRuntimeContext(file);
      const doc = transformRuntimeCommand(root!, ctx);

      const spawnAgent = doc.children.find(c => c.kind === 'spawnAgent');
      const resolved = resolveTypeImport('OptionalInput', file);
      const props = extractInterfaceProperties(resolved!.interface);
      const placeholders = extractPromptPlaceholders(spawnAgent!.prompt!);

      const required = props.filter(p => p.required);
      const missing = required.filter(p => !placeholders.has(p.name));

      expect(required.length).toBe(0);
      expect(missing.length).toBe(0);
    });
  });
});
