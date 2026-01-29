import { describe, expect, it } from 'vitest';
import {
  createProject,
  parseSource,
  findRootJsxElement,
  transformRuntimeCommand,
  createRuntimeContext,
} from '../../src/index.js';
import { emitDocument } from '../../src/emitter/index.js';
import type { DocumentNode } from '../../src/ir/index.js';

describe('Markdown and Indent', () => {
  let testCounter = 0;

  /**
   * Transform and emit a Command TSX to markdown
   */
  function buildCommand(tsx: string): string {
    const project = createProject();
    const source = parseSource(project, tsx, `test-${testCounter++}.tsx`);
    const root = findRootJsxElement(source);
    if (!root) throw new Error('No JSX found');
    const ctx = createRuntimeContext(source);
    const doc = transformRuntimeCommand(root, ctx);
    return emitDocument(doc);
  }

  describe('raw markdown preservation', () => {
    it('preserves line breaks in raw markdown content', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                # Heading

                ## Subheading

                Some content here.

                ## Another Section
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('# Heading');
      expect(output).toContain('## Subheading');
      expect(output).toContain('Some content here.');
      expect(output).toContain('## Another Section');
      // Check that headings are on separate lines
      expect(output).toMatch(/# Heading\n\n## Subheading/);
    });

    it('handles markdown without collapsing to single line', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                First line
                Second line
                Third line
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      // Should have multiple lines, not collapsed to one
      expect(output).toContain('First line');
      expect(output).toContain('Second line');
      expect(output).toContain('Third line');
      // They should be on separate lines
      expect(output).toMatch(/First line\nSecond line\nThird line/);
    });
  });

  describe('Indent component', () => {
    it('indents content by default 2 spaces', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                <Indent>
                  Indented content
                </Indent>
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('  Indented content');
    });

    it('indents content by custom spaces', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                <Indent spaces={4}>
                  Four spaces indent
                </Indent>
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('    Four spaces indent');
    });

    it('indents all lines of multi-line content', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                <Indent spaces={2}>
                  Line one
                  Line two
                  Line three
                </Indent>
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('  Line one');
      expect(output).toContain('  Line two');
      expect(output).toContain('  Line three');
    });

    it('preserves empty lines without adding spaces', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                <Indent spaces={4}>
                  First paragraph

                  Second paragraph
                </Indent>
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('    First paragraph');
      expect(output).toContain('    Second paragraph');
      // Empty line should remain empty, not have spaces
      expect(output).toMatch(/    First paragraph\n\n    Second paragraph/);
    });

    it('works with nested elements', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                <Indent spaces={2}>
                  <h2>Indented Heading</h2>
                  <p>Indented paragraph</p>
                </Indent>
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('  ## Indented Heading');
      expect(output).toContain('  Indented paragraph');
    });

    it('combines with raw markdown', () => {
      const tsx = `export default function MyCommand() {
        return (
          <Command name="test" description="Test">
            {() => (
              <>
                # Main Title

                <Indent spaces={4}>
                  ## Indented Section

                  This content is indented.
                </Indent>

                ## Back to Normal
              </>
            )}
          </Command>
        );
      }`;

      const output = buildCommand(tsx);

      expect(output).toContain('# Main Title');
      expect(output).toContain('    ## Indented Section');
      expect(output).toContain('    This content is indented.');
      expect(output).toContain('## Back to Normal');
      // Back to Normal should NOT be indented
      expect(output).not.toContain('    ## Back to Normal');
    });
  });
});
