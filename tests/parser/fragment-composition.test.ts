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
 * Fragment Composition Tests
 *
 * Tests for components that return JSX fragments (multiple blocks without wrapper).
 * Verifies that fragments are properly expanded and all children are included.
 */
describe('Fragment Composition', () => {
  let testCounter = 0;

  /**
   * Transform TSX with Command wrapper to markdown.
   */
  function build(tsx: string): string {
    const project = createProject();
    const source = parseSource(project, tsx, `test-frag-${testCounter++}.tsx`);

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

  describe('basic fragment components', () => {
    it('returns multiple blocks from fragment component', () => {
      const tsx = `
        const Header = () => (
          <>
            <h1>Title</h1>
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
      expect(result).toContain('# Title');
      expect(result).toContain('## Subtitle');
    });

    it('returns all three blocks from fragment', () => {
      const tsx = `
        const ThreeItems = () => (
          <>
            <h1>First</h1>
            <p>Middle</p>
            <h2>Last</h2>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <ThreeItems />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# First');
      expect(result).toContain('Middle');
      expect(result).toContain('## Last');
    });

    it('handles single child in fragment', () => {
      const tsx = `
        const SingleChild = () => (
          <>
            <h1>Only One</h1>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <SingleChild />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# Only One');
    });
  });

  describe('fragment content patterns', () => {
    it('handles fragment with inline elements', () => {
      const tsx = `
        const InlineFragment = () => (
          <>
            <p><b>Bold text</b> and <i>italic text</i></p>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <InlineFragment />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('**Bold text**');
      expect(result).toContain('*italic text*');
    });

    it('handles fragment with code elements', () => {
      const tsx = `
        const CodeFragment = () => (
          <>
            <p>Use <code>const</code> for constants</p>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <CodeFragment />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('`const`');
    });
  });

  describe('fragment components with props', () => {
    it('substitutes props in fragment children', () => {
      const tsx = `
        const TitledSection = ({ main, sub }) => (
          <>
            <h1>{main}</h1>
            <h2>{sub}</h2>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <TitledSection main="Main Title" sub="Subtitle" />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# Main Title');
      expect(result).toContain('## Subtitle');
    });

    it('handles fragment with children prop', () => {
      const tsx = `
        const Section = ({ title, children }) => (
          <>
            <h2>{title}</h2>
            {children}
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => (
              <Section title="Section Title">
                <p>Content goes here</p>
              </Section>
            )}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## Section Title');
      expect(result).toContain('Content goes here');
    });
  });

  describe('fragment block ordering', () => {
    it('preserves order of blocks in fragment', () => {
      const tsx = `
        const Ordered = () => (
          <>
            <h1>1. First</h1>
            <h2>2. Second</h2>
            <h3>3. Third</h3>
            <p>4. Fourth</p>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <Ordered />}
          </Command>
        );
      `;
      const result = build(tsx);

      // Verify order by checking indices
      const firstIdx = result.indexOf('# 1. First');
      const secondIdx = result.indexOf('## 2. Second');
      const thirdIdx = result.indexOf('### 3. Third');
      const fourthIdx = result.indexOf('4. Fourth');

      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
      expect(thirdIdx).toBeLessThan(fourthIdx);
    });

    it('preserves fragment order with sibling content', () => {
      const tsx = `
        const Fragment = () => (
          <>
            <h2>Fragment A</h2>
            <h2>Fragment B</h2>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => (
              <>
                <h1>Before</h1>
                <Fragment />
                <h1>After</h1>
              </>
            )}
          </Command>
        );
      `;
      const result = build(tsx);

      const beforeIdx = result.indexOf('# Before');
      const fragAIdx = result.indexOf('## Fragment A');
      const fragBIdx = result.indexOf('## Fragment B');
      const afterIdx = result.indexOf('# After');

      expect(beforeIdx).toBeLessThan(fragAIdx);
      expect(fragAIdx).toBeLessThan(fragBIdx);
      expect(fragBIdx).toBeLessThan(afterIdx);
    });
  });

  describe('fragment with mixed content types', () => {
    it('handles fragments with different block types', () => {
      const tsx = `
        const MixedContent = () => (
          <>
            <h1>Heading</h1>
            <p>Paragraph</p>
            <div name="section">
              <p>Nested content</p>
            </div>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <MixedContent />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# Heading');
      expect(result).toContain('Paragraph');
      expect(result).toContain('<section>');
      expect(result).toContain('Nested content');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
    });

    it('handles fragment with code block', () => {
      const tsx = `
        const CodeExample = () => (
          <>
            <h2>Example</h2>
            <pre lang="typescript">
              const x = 1;
            </pre>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <CodeExample />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('## Example');
      expect(result).toContain('```typescript');
      expect(result).toContain('const x = 1;');
    });
  });

  describe('fragment composition edge cases', () => {
    it('handles fragment with whitespace-only content', () => {
      const tsx = `
        const Spacer = () => (
          <>
            <p>Before spacer</p>
            <p>After spacer</p>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => <Spacer />}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('Before spacer');
      expect(result).toContain('After spacer');
    });

    it('handles multiple fragment components', () => {
      const tsx = `
        const FragA = () => (
          <>
            <h1>A1</h1>
            <h2>A2</h2>
          </>
        );

        const FragB = () => (
          <>
            <h1>B1</h1>
            <h2>B2</h2>
          </>
        );

        export default (
          <Command name="test" description="Test">
            {() => (
              <>
                <FragA />
                <FragB />
              </>
            )}
          </Command>
        );
      `;
      const result = build(tsx);
      expect(result).toContain('# A1');
      expect(result).toContain('## A2');
      expect(result).toContain('# B1');
      expect(result).toContain('## B2');
    });
  });
});
