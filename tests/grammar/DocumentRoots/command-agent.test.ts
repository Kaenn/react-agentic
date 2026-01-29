/**
 * Grammar Tests: Document Roots (Command, Agent)
 *
 * Tests Command and Agent document root components.
 */

import { describe, it, expect } from 'vitest';
import {
  transformCommand,
  transformAgent,
  expectTransformError,
  expectAgentTransformError,
  getCommandIR,
  getAgentIR,
} from '../_helpers/test-utils.js';

describe('Document Roots', () => {
  describe('<Command>', () => {
    describe('required props', () => {
      // Note: The V3 runtime transformer doesn't validate required props at transform time.
      // TypeScript provides compile-time safety, but runtime validation is not performed.
      // These tests document current behavior.

      it('compiles without name prop (no runtime validation)', () => {
        const tsx = `export default function Doc() {
          return <Command description="Test"><p>Content</p></Command>;
        }`;
        // No error thrown - runtime transformer doesn't validate props
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('compiles without description prop (no runtime validation)', () => {
        const tsx = `export default function Doc() {
          return <Command name="test"><p>Content</p></Command>;
        }`;
        // No error thrown - runtime transformer doesn't validate props
        expect(() => transformCommand(tsx)).not.toThrow();
      });

      it('compiles with required props', () => {
        const tsx = `export default function Doc() {
          return <Command name="test" description="Test command"><p>Content</p></Command>;
        }`;
        expect(() => transformCommand(tsx)).not.toThrow();
      });
    });

    describe('optional props', () => {
      it('accepts argumentHint prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Command name="test" description="Test" argumentHint="[filename]">
              <p>Content</p>
            </Command>
          );
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('argument-hint: [filename]');
      });

      it('accepts allowedTools array', () => {
        const tsx = `export default function Doc() {
          return (
            <Command name="test" description="Test" allowedTools={['Read', 'Write']}>
              <p>Content</p>
            </Command>
          );
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('allowed-tools');
        expect(output).toContain('Read');
        expect(output).toContain('Write');
      });

      it('accepts folder prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Command name="test" description="Test" folder="custom">
              <p>Content</p>
            </Command>
          );
        }`;
        const ir = getCommandIR(tsx);
        expect(ir.metadata?.folder).toBe('custom');
      });

      it('accepts agent prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Command name="test" description="Test" agent="researcher">
              <p>Content</p>
            </Command>
          );
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('agent: researcher');
      });
    });

    describe('output format', () => {
      it('emits YAML frontmatter', () => {
        const tsx = `export default function Doc() {
          return <Command name="analyze" description="Analyze code"><p>Content</p></Command>;
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('---');
        expect(output).toContain('name: analyze');
        expect(output).toContain('description: Analyze code');
      });

      it('emits body content after frontmatter', () => {
        const tsx = `export default function Doc() {
          return (
            <Command name="test" description="Test">
              <h1>Title</h1>
              <p>Paragraph</p>
            </Command>
          );
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('---\n\n# Title');
        expect(output).toContain('Paragraph');
      });
    });

    describe('self-closing (no body)', () => {
      it('handles self-closing Command', () => {
        const tsx = `export default function Doc() {
          return <Command name="empty" description="Empty command" />;
        }`;
        const output = transformCommand(tsx);
        expect(output).toContain('name: empty');
        expect(output).toContain('description: Empty command');
      });
    });
  });

  describe('<Agent>', () => {
    describe('required props', () => {
      it('requires name prop', () => {
        const tsx = `export default function Doc() {
          return <Agent description="Test"><p>Content</p></Agent>;
        }`;
        expectAgentTransformError(tsx, /Agent requires.*name/);
      });

      it('requires description prop', () => {
        const tsx = `export default function Doc() {
          return <Agent name="test"><p>Content</p></Agent>;
        }`;
        expectAgentTransformError(tsx, /Agent requires.*description/);
      });

      it('compiles with required props', () => {
        const tsx = `export default function Doc() {
          return <Agent name="researcher" description="Research agent"><p>Content</p></Agent>;
        }`;
        expect(() => transformAgent(tsx)).not.toThrow();
      });
    });

    describe('optional props', () => {
      it('accepts tools prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Agent name="test" description="Test" tools="Read Grep Glob">
              <p>Content</p>
            </Agent>
          );
        }`;
        const output = transformAgent(tsx);
        expect(output).toContain('tools: Read Grep Glob');
      });

      it('accepts color prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Agent name="test" description="Test" color="cyan">
              <p>Content</p>
            </Agent>
          );
        }`;
        const output = transformAgent(tsx);
        expect(output).toContain('color: cyan');
      });

      it('accepts folder prop', () => {
        const tsx = `export default function Doc() {
          return (
            <Agent name="test" description="Test" folder="custom">
              <p>Content</p>
            </Agent>
          );
        }`;
        const ir = getAgentIR(tsx);
        // folder is handled at build time, not in IR
        expect(ir.frontmatter.name).toBe('test');
      });
    });

    describe('output format', () => {
      it('emits GSD-style frontmatter', () => {
        const tsx = `export default function Doc() {
          return (
            <Agent name="researcher" description="Research agent" tools="Read Grep">
              <p>Content</p>
            </Agent>
          );
        }`;
        const output = transformAgent(tsx);
        expect(output).toContain('---');
        expect(output).toContain('name: researcher');
        expect(output).toContain('description: Research agent');
        expect(output).toContain('tools: Read Grep');
      });

      it('emits body content', () => {
        const tsx = `export default function Doc() {
          return (
            <Agent name="test" description="Test">
              <h1>Agent Instructions</h1>
              <p>Do something.</p>
            </Agent>
          );
        }`;
        const output = transformAgent(tsx);
        expect(output).toContain('# Agent Instructions');
        expect(output).toContain('Do something.');
      });
    });

    describe('generic type parameters', () => {
      it('accepts input type parameter', () => {
        const tsx = `
          interface MyInput { query: string; }
          export default function Doc() {
            return (
              <Agent<MyInput> name="test" description="Test">
                <p>Content</p>
              </Agent>
            );
          }
        `;
        const ir = getAgentIR(tsx);
        expect(ir.frontmatter.inputType?.name).toBe('MyInput');
      });

      it('accepts input and output type parameters', () => {
        const tsx = `
          interface MyInput { query: string; }
          interface MyOutput { result: string; }
          export default function Doc() {
            return (
              <Agent<MyInput, MyOutput> name="test" description="Test">
                <p>Content</p>
              </Agent>
            );
          }
        `;
        const ir = getAgentIR(tsx);
        expect(ir.frontmatter.inputType?.name).toBe('MyInput');
        expect(ir.frontmatter.outputType?.name).toBe('MyOutput');
      });
    });
  });
});
