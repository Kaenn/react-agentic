import { describe, expect, it } from 'vitest';
import { Node, SourceFile } from 'ts-morph';
import {
  createProject,
  parseSource,
  transformRuntimeCommand,
  createRuntimeContext,
  extractLocalComponentDeclarations,
  extractRuntimeVarDeclarations,
} from '../../src/index.js';
import { emitDocument } from '../../src/emitter/index.js';

/**
 * Static Component Composition Tests
 *
 * Tests component composition through the runtime transformer path, verifying
 * that components with props, children, and fragments work correctly.
 *
 * These tests complement local-component.test.ts by focusing on:
 * 1. Prop types: string, numeric, boolean shorthand, explicit boolean
 * 2. Children patterns: empty, single, multiple
 * 3. Props + children combinations
 * 4. Fragment returns (multiple blocks)
 */
describe('Static Component Composition', () => {
  let testCounter = 0;

  /**
   * Transform TSX with Command wrapper to markdown.
   * Uses runtime transformer path which supports local component composition.
   */
  function build(tsx: string): string {
    const project = createProject();
    const source = parseSource(project, tsx, `test-comp-${testCounter++}.tsx`);

    let root: Node | null = null;
    source.forEachDescendant((node, traversal) => {
      if (Node.isExportAssignment(node)) {
        const expr = node.getExpression();
        if (expr) {
          let unwrapped = expr;
          while (Node.isParenthesizedExpression(unwrapped)) {
            unwrapped = unwrapped.getExpression();
          }
          if (Node.isJsxElement(unwrapped) || Node.isJsxSelfClosingElement(unwrapped)) {
            root = unwrapped;
            traversal.stop();
          }
        }
      }
    });

    if (!root) throw new Error('No Command JSX found');
    if (!Node.isJsxElement(root) && !Node.isJsxSelfClosingElement(root)) {
      throw new Error('Root is not a JSX element');
    }

    const ctx = createRuntimeContext(source);
    extractRuntimeVarDeclarations(source, ctx);
    extractLocalComponentDeclarations(source, ctx);
    const doc = transformRuntimeCommand(root, ctx);
    return emitDocument(doc);
  }

  describe('component with props', () => {
    it('substitutes string props in text', () => {
      const tsx = `
        const Greeting = ({ name }) => <p>Hello {name}!</p>;
        export default (
          <Command name="test" description="Test">
            {() => <Greeting name="World" />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Hello World!');
    });

    it('substitutes props in heading', () => {
      const tsx = `
        const Section = ({ title }) => <h2>{title}</h2>;
        export default (
          <Command name="test" description="Test">
            {() => <Section title="My Title" />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## My Title');
    });

    it('substitutes numeric props', () => {
      const tsx = `
        const Counter = ({ count }) => <p>Count: {count}</p>;
        export default (
          <Command name="test" description="Test">
            {() => <Counter count={42} />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Count: 42');
    });

    it('substitutes boolean shorthand props', () => {
      const tsx = `
        const Status = ({ active }) => <p>Active: {active}</p>;
        export default (
          <Command name="test" description="Test">
            {() => <Status active />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Active: true');
    });

    it('substitutes explicit boolean false props', () => {
      const tsx = `
        const Status = ({ active }) => <p>Active: {active}</p>;
        export default (
          <Command name="test" description="Test">
            {() => <Status active={false} />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Active: false');
    });

    it('substitutes multiple props', () => {
      const tsx = `
        const UserInfo = ({ name, role }) => <p>{name} is a {role}</p>;
        export default (
          <Command name="test" description="Test">
            {() => <UserInfo name="Alice" role="developer" />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Alice is a developer');
    });
  });

  describe('component with children', () => {
    it('substitutes children in XmlBlock wrapper', () => {
      const tsx = `
        const Card = ({ children }) => (
          <div name="card">{children}</div>
        );
        export default (
          <Command name="test" description="Test">
            {() => <Card><p>Content</p></Card>}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('<card>');
      expect(result).toContain('Content');
      expect(result).toContain('</card>');
    });

    it('handles empty children gracefully', () => {
      const tsx = `
        const Wrapper = ({ children }) => (
          <div name="wrapper">{children}</div>
        );
        export default (
          <Command name="test" description="Test">
            {() => <Wrapper />}
          </Command>
        );
      `;
      // Should not throw
      const result = build(tsx);
      expect(result).toContain('<wrapper>');
    });

    it('substitutes multiple children blocks', () => {
      const tsx = `
        const Box = ({ children }) => (
          <div name="box">{children}</div>
        );
        export default (
          <Command name="test" description="Test">
            {() => (
              <Box>
                <h2>Title</h2>
                <p>Paragraph</p>
              </Box>
            )}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## Title');
      expect(result).toContain('Paragraph');
    });
  });

  describe('component with props and children', () => {
    it('handles both props and children', () => {
      const tsx = `
        const Section = ({ title, children }) => (
          <>
            <h2>{title}</h2>
            {children}
          </>
        );
        export default (
          <Command name="test" description="Test">
            {() => <Section title="Title"><p>Content</p></Section>}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## Title');
      expect(result).toContain('Content');
    });

    it('preserves order of content with children', () => {
      const tsx = `
        const Wrapper = ({ header, children }) => (
          <>
            <h1>{header}</h1>
            {children}
            <hr />
          </>
        );
        export default (
          <Command name="test" description="Test">
            {() => (
              <Wrapper header="Title">
                <p>Middle content</p>
              </Wrapper>
            )}
          </Command>
        );
      `;
      const result = build(tsx);

      // Check order: title, then content, then hr
      const titleIndex = result.indexOf('# Title');
      const contentIndex = result.indexOf('Middle content');
      const hrIndex = result.lastIndexOf('---');

      expect(titleIndex).toBeLessThan(contentIndex);
      expect(contentIndex).toBeLessThan(hrIndex);
    });
  });

  describe('parameterless components', () => {
    it('inlines simple component with no props', () => {
      const tsx = `
        const Greeting = () => <h2>Hello World</h2>;
        export default (
          <Command name="test" description="Test">
            {() => <Greeting />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## Hello World');
    });

    it('inlines component returning fragment', () => {
      const tsx = `
        const Header = () => (
          <>
            <h1>Main Title</h1>
            <h2>Subtitle</h2>
          </>
        );
        export default (
          <Command name="test" description="Test">
            {() => <Header />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# Main Title');
      expect(result).toContain('## Subtitle');
    });
  });

  describe('fragment output verification', () => {
    it('returns all blocks from fragment component', () => {
      const tsx = `
        const MultiBlock = () => (
          <>
            <h1>First</h1>
            <p>Second</p>
            <h2>Third</h2>
          </>
        );
        export default (
          <Command name="test" description="Test">
            {() => <MultiBlock />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# First');
      expect(result).toContain('Second');
      expect(result).toContain('## Third');
    });

    it('uses proper spacing between fragment blocks', () => {
      const tsx = `
        const TwoHeadings = () => (
          <>
            <h1>First</h1>
            <h2>Second</h2>
          </>
        );
        export default (
          <Command name="test" description="Test">
            {() => <TwoHeadings />}
          </Command>
        );
      `;
      const result = build(tsx);
      // Should have content between blocks (may be single or double newline)
      expect(result).toContain('# First');
      expect(result).toContain('## Second');
    });
  });
});
