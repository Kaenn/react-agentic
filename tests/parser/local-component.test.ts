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
 * Find root JSX element from export default (prioritized) or return statement
 * This mimics the behavior of findRuntimeRootElement in runtime-build.ts
 */
function findRootElement(sourceFile: SourceFile): Node | null {
  let result: Node | null = null;

  // Pass 1: Look for export default (highest priority)
  sourceFile.forEachDescendant((node, traversal) => {
    if (Node.isExportAssignment(node)) {
      const expr = node.getExpression();
      if (expr) {
        let unwrapped = expr;
        while (Node.isParenthesizedExpression(unwrapped)) {
          unwrapped = unwrapped.getExpression();
        }
        if (Node.isJsxElement(unwrapped) || Node.isJsxSelfClosingElement(unwrapped)) {
          result = unwrapped;
          traversal.stop();
        }
      }
    }
  });

  // If found via export default, return it
  if (result) return result;

  // Pass 2: Look for return statements in export default function
  sourceFile.forEachDescendant((node, traversal) => {
    // Only check return statements inside export default function
    if (Node.isFunctionDeclaration(node) && node.isDefaultExport()) {
      node.forEachDescendant((inner, innerTraversal) => {
        if (Node.isReturnStatement(inner)) {
          const expr = inner.getExpression();
          if (expr) {
            let unwrapped = expr;
            while (Node.isParenthesizedExpression(unwrapped)) {
              unwrapped = unwrapped.getExpression();
            }
            if (Node.isJsxElement(unwrapped) || Node.isJsxSelfClosingElement(unwrapped)) {
              result = unwrapped;
              innerTraversal.stop();
            }
          }
        }
      });
      traversal.stop();
    }
  });

  return result;
}

describe('Local Component Inlining', () => {
  let testCounter = 0;

  /**
   * Transform and emit a Command TSX to markdown with local component support
   */
  function buildCommand(tsx: string): string {
    const project = createProject();
    const source = parseSource(project, tsx, `test-component-${testCounter++}.tsx`);
    const root = findRootElement(source);
    if (!root) throw new Error('No JSX found');
    if (!Node.isJsxElement(root) && !Node.isJsxSelfClosingElement(root)) {
      throw new Error('Root is not a JSX element');
    }
    const ctx = createRuntimeContext(source);
    // Extract declarations before transforming
    extractRuntimeVarDeclarations(source, ctx);
    extractLocalComponentDeclarations(source, ctx);
    const doc = transformRuntimeCommand(root, ctx);
    return emitDocument(doc);
  }

  describe('simple component', () => {
    it('inlines a simple component with no props', () => {
      const tsx = `
        const Greeting = () => <h2>Hello World</h2>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Greeting />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('## Hello World');
    });

    it('inlines component returning fragment', () => {
      const tsx = `
        const Header = () => (
          <>
            <h1>Main Title</h1>
            <h2>Subtitle</h2>
          </>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Header />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('# Main Title');
      expect(output).toContain('## Subtitle');
    });

    it('inlines component with arrow function block body', () => {
      const tsx = `
        const Footer = () => {
          return (
            <>
              <hr />
              <p>End of document</p>
            </>
          );
        };

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Footer />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('---');
      expect(output).toContain('End of document');
    });

    it('inlines function declaration component', () => {
      const tsx = `
        function Banner() {
          return <h1>Welcome Banner</h1>;
        }

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Banner />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('# Welcome Banner');
    });
  });

  describe('component with props', () => {
    it('substitutes string props', () => {
      const tsx = `
        const Greeting = ({ name }: { name: string }) => <p>Hello {name}!</p>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Greeting name="World" />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Hello World!');
    });

    it('substitutes multiple props', () => {
      const tsx = `
        const UserInfo = ({ name, role }: { name: string; role: string }) => (
          <p>{name} is a {role}</p>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <UserInfo name="Alice" role="developer" />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Alice is a developer');
    });

    it('substitutes numeric props', () => {
      const tsx = `
        const Counter = ({ count }: { count: number }) => <p>Count: {count}</p>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Counter count={42} />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Count: 42');
    });

    it('substitutes boolean shorthand props', () => {
      const tsx = `
        const Status = ({ active }: { active: boolean }) => (
          <p>Active: {active}</p>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Status active />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Active: true');
    });

    it('substitutes props in heading', () => {
      const tsx = `
        const Section = ({ title }: { title: string }) => <h2>{title}</h2>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Section title="My Section" />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('## My Section');
    });
  });

  describe('component with children', () => {
    it('substitutes children in XmlBlock', () => {
      const tsx = `
        const Card = ({ children }: { children?: any }) => (
          <XmlBlock name="card">
            {children}
          </XmlBlock>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Card>
                    <p>Card content here</p>
                  </Card>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('<card>');
      expect(output).toContain('Card content here');
      expect(output).toContain('</card>');
    });

    it('substitutes children in div wrapper', () => {
      const tsx = `
        const Box = ({ children }: { children?: any }) => (
          <div name="box">
            {children}
          </div>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Box>
                    <h3>Box Title</h3>
                    <p>Box content</p>
                  </Box>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('<box>');
      expect(output).toContain('### Box Title');
      expect(output).toContain('Box content');
      expect(output).toContain('</box>');
    });

    it('handles empty children gracefully', () => {
      const tsx = `
        const Wrapper = ({ children }: { children?: any }) => (
          <div name="wrapper">
            {children}
          </div>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Wrapper />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('<wrapper>');
      expect(output).toContain('</wrapper>');
    });
  });

  describe('nested components', () => {
    it('expands nested component references', () => {
      const tsx = `
        const Inner = () => <p>Inner content</p>;
        const Outer = () => (
          <>
            <h2>Outer heading</h2>
            <Inner />
          </>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Outer />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('## Outer heading');
      expect(output).toContain('Inner content');
    });

    it('expands deeply nested components', () => {
      const tsx = `
        const Level3 = () => <p>Level 3</p>;
        const Level2 = () => (
          <>
            <p>Level 2</p>
            <Level3 />
          </>
        );
        const Level1 = () => (
          <>
            <p>Level 1</p>
            <Level2 />
          </>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Level1 />
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Level 1');
      expect(output).toContain('Level 2');
      expect(output).toContain('Level 3');
    });

    it('handles multiple usages of same component', () => {
      const tsx = `
        const Divider = () => <hr />;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <h1>Section 1</h1>
                  <Divider />
                  <h1>Section 2</h1>
                  <Divider />
                  <h1>Section 3</h1>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('# Section 1');
      expect(output).toContain('# Section 2');
      expect(output).toContain('# Section 3');
      // Should have two horizontal rules (count lines that are exactly ---)
      // Note: frontmatter also uses --- so we count thematic breaks which are on their own line
      const lines = output.split('\n');
      const hrCount = lines.filter(line => line === '---' && lines[lines.indexOf(line) - 1] !== '').length;
      // Check that there are at least 2 horizontal rules (after frontmatter)
      expect(output).toMatch(/# Section 1\n\n---\n\n# Section 2/);
      expect(output).toMatch(/# Section 2\n\n---\n\n# Section 3/);
    });
  });

  describe('circular reference detection', () => {
    it('throws error for direct circular reference', () => {
      const tsx = `
        const Recursive = () => <Recursive />;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Recursive />
                </>
              )}
            </Command>
          );
        }
      `;

      expect(() => buildCommand(tsx)).toThrow(/Circular component reference/);
    });

    it('throws error for indirect circular reference', () => {
      const tsx = `
        const CompA = () => <CompB />;
        const CompB = () => <CompA />;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <CompA />
                </>
              )}
            </Command>
          );
        }
      `;

      expect(() => buildCommand(tsx)).toThrow(/Circular component reference/);
    });
  });

  describe('component with mixed content', () => {
    it('handles component with both props and children', () => {
      const tsx = `
        const Section = ({ title, children }: { title: string; children?: any }) => (
          <>
            <h2>{title}</h2>
            {children}
          </>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Section title="My Section">
                    <p>Section content</p>
                  </Section>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('## My Section');
      expect(output).toContain('Section content');
    });

    it('preserves order of content with children', () => {
      const tsx = `
        const Wrapper = ({ header, children }: { header: string; children?: any }) => (
          <>
            <h1>{header}</h1>
            {children}
            <hr />
          </>
        );

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <Wrapper header="Title">
                    <p>Middle content</p>
                  </Wrapper>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      // Check order: title, then content, then hr
      // Use lastIndexOf for hr since indexOf finds frontmatter delimiter first
      const titleIndex = output.indexOf('# Title');
      const contentIndex = output.indexOf('Middle content');
      const hrIndex = output.lastIndexOf('---');

      expect(titleIndex).toBeLessThan(contentIndex);
      expect(contentIndex).toBeLessThan(hrIndex);
    });
  });

  describe('component does not capture non-components', () => {
    it('ignores lowercase function names', () => {
      const tsx = `
        const helperFunction = () => <p>Should not be a component</p>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <h1>Test</h1>
                </>
              )}
            </Command>
          );
        }
      `;

      // Should not throw - lowercase functions are ignored
      const output = buildCommand(tsx);
      expect(output).toContain('# Test');
    });

    it('does not treat HTML elements as components', () => {
      const tsx = `
        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => (
                <>
                  <div name="wrapper">
                    <p>Content</p>
                  </div>
                </>
              )}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('<wrapper>');
      expect(output).toContain('Content');
    });
  });

  describe('integration with runtime features', () => {
    it('works alongside If/Else', () => {
      const tsx = `
        const Status = ({ label }: { label: string }) => <p>{label}</p>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => {
                const ctx = useRuntimeVar<{success: boolean}>('CTX');
                return (
                  <>
                    <Status label="Status Check" />
                    <If condition={ctx.success}>
                      <p>Success!</p>
                    </If>
                  </>
                );
              }}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('Status Check');
      expect(output).toContain('**If ctx.success:**');
    });

    it('works inside If block', () => {
      const tsx = `
        const SuccessMessage = () => <p>Operation completed successfully!</p>;

        export default function Test() {
          return (
            <Command name="test" description="Test">
              {() => {
                const ctx = useRuntimeVar<{success: boolean}>('CTX');
                return (
                  <>
                    <If condition={ctx.success}>
                      <SuccessMessage />
                    </If>
                  </>
                );
              }}
            </Command>
          );
        }
      `;

      const output = buildCommand(tsx);

      expect(output).toContain('**If ctx.success:**');
      expect(output).toContain('Operation completed successfully!');
    });
  });
});
