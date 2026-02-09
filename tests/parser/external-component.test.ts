import { describe, expect, it } from 'vitest';
import { Node, SourceFile, Project } from 'ts-morph';
import {
  createProject,
  parseSource,
  transformRuntimeCommand,
  createRuntimeContext,
  extractLocalComponentDeclarations,
  extractExternalComponentDeclarations,
  extractRuntimeVarDeclarations,
} from '../../src/index.js';
import { emitDocument } from '../../src/emitter/index.js';

/**
 * Find root JSX element from export default (prioritized) or return statement
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

  if (result) return result;

  // Pass 2: Look for return statements in export default function
  sourceFile.forEachDescendant((node, traversal) => {
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

describe('External Component Imports', () => {
  let testCounter = 0;

  /**
   * Create a project with external component files and build the main file
   */
  function buildWithExternals(
    mainTsx: string,
    externalFiles: Record<string, string>
  ): string {
    const project = createProject();

    // Add external files first
    for (const [filename, content] of Object.entries(externalFiles)) {
      project.createSourceFile(filename, content);
    }

    // Add main file
    const mainFilename = `test-external-${testCounter++}.tsx`;
    const source = project.createSourceFile(mainFilename, mainTsx);

    const root = findRootElement(source);
    if (!root) throw new Error('No JSX found');
    if (!Node.isJsxElement(root) && !Node.isJsxSelfClosingElement(root)) {
      throw new Error('Root is not a JSX element');
    }

    const ctx = createRuntimeContext(source);
    extractRuntimeVarDeclarations(source, ctx);
    extractLocalComponentDeclarations(source, ctx);
    extractExternalComponentDeclarations(source, ctx);

    const doc = transformRuntimeCommand(root, ctx);
    return emitDocument(doc);
  }

  describe('named imports', () => {
    it('imports named component from external file', () => {
      const output = buildWithExternals(
        `
          import { Banner } from './components/banner';

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
        `,
        {
          './components/banner.tsx': `
            export const Banner = () => <h1>Welcome Banner</h1>;
          `,
        }
      );

      expect(output).toContain('# Welcome Banner');
    });

    it('imports multiple components from same file', () => {
      const output = buildWithExternals(
        `
          import { Header, Footer } from './components/layout';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Header />
                    <Footer />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/layout.tsx': `
            export const Header = () => <h1>Site Header</h1>;
            export const Footer = () => <p>Site Footer</p>;
          `,
        }
      );

      expect(output).toContain('# Site Header');
      expect(output).toContain('Site Footer');
    });

    it('imports component with function declaration', () => {
      const output = buildWithExternals(
        `
          import { Card } from './components/card';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Card />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/card.tsx': `
            export function Card() {
              return <h2>Card Component</h2>;
            }
          `,
        }
      );

      expect(output).toContain('## Card Component');
    });
  });

  describe('default imports', () => {
    it('imports default export component', () => {
      const output = buildWithExternals(
        `
          import Banner from './components/banner';

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
        `,
        {
          './components/banner.tsx': `
            const Banner = () => <h1>Default Banner</h1>;
            export default Banner;
          `,
        }
      );

      expect(output).toContain('# Default Banner');
    });

    it('imports default export function declaration', () => {
      const output = buildWithExternals(
        `
          import Hero from './components/hero';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Hero />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/hero.tsx': `
            export default function Hero() {
              return <h1>Hero Section</h1>;
            }
          `,
        }
      );

      expect(output).toContain('# Hero Section');
    });
  });

  describe('props and children', () => {
    it('passes props to external component', () => {
      const output = buildWithExternals(
        `
          import { Greeting } from './components/greeting';

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
        `,
        {
          './components/greeting.tsx': `
            export const Greeting = ({ name }: { name: string }) => <p>Hello {name}!</p>;
          `,
        }
      );

      expect(output).toContain('Hello World!');
    });

    it('passes multiple props to external component', () => {
      const output = buildWithExternals(
        `
          import { UserCard } from './components/user-card';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <UserCard name="Alice" role="developer" />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/user-card.tsx': `
            export const UserCard = ({ name, role }: { name: string; role: string }) => (
              <p>{name} is a {role}</p>
            );
          `,
        }
      );

      expect(output).toContain('Alice is a developer');
    });

    it('substitutes props.xxx pattern in template literals', () => {
      const output = buildWithExternals(
        `
          import Banner from './components/banner';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Banner prefix="TEST" title="Hello" />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/banner.tsx': `
            export default function Banner(props: { prefix: string, title: string }) {
              return (
                <pre>{\`GSD ► \${props.prefix} \${props.title}\`}</pre>
              );
            }
          `,
        }
      );

      expect(output).toContain('GSD ► TEST Hello');
      expect(output).not.toContain('props.prefix');
      expect(output).not.toContain('props.title');
    });

    it('substitutes props.xxx pattern in standalone expressions', () => {
      const output = buildWithExternals(
        `
          import { Status } from './components/status';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Status label="Active" />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/status.tsx': `
            export const Status = (props: { label: string }) => (
              <p>Status: {props.label}</p>
            );
          `,
        }
      );

      expect(output).toContain('Status: Active');
      expect(output).not.toContain('props.label');
    });

    it('passes children to external component', () => {
      const output = buildWithExternals(
        `
          import { Wrapper } from './components/wrapper';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <Wrapper>
                      <p>Child content here</p>
                    </Wrapper>
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/wrapper.tsx': `
            export const Wrapper = ({ children }: { children?: any }) => (
              <XmlBlock name="container">
                {children}
              </XmlBlock>
            );
          `,
        }
      );

      expect(output).toContain('<container>');
      expect(output).toContain('Child content here');
      expect(output).toContain('</container>');
    });
  });

  describe('errors', () => {
    it('throws for non-exported component', () => {
      expect(() =>
        buildWithExternals(
          `
            import { Hidden } from './components/hidden';

            export default function Test() {
              return (
                <Command name="test" description="Test">
                  {() => (
                    <>
                      <Hidden />
                    </>
                  )}
                </Command>
              );
            }
          `,
          {
            './components/hidden.tsx': `
              // Not exported
              const Hidden = () => <p>Hidden</p>;
            `,
          }
        )
      ).toThrow(/Cannot resolve import|not exported/);
    });
  });

  describe('integration', () => {
    it('works with local and external components together', () => {
      const output = buildWithExternals(
        `
          import { ExternalBanner } from './components/banner';

          const LocalSection = () => <h2>Local Section</h2>;

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <ExternalBanner />
                    <LocalSection />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/banner.tsx': `
            export const ExternalBanner = () => <h1>External Banner</h1>;
          `,
        }
      );

      expect(output).toContain('# External Banner');
      expect(output).toContain('## Local Section');
    });

    it('local component takes precedence over external with same name', () => {
      const output = buildWithExternals(
        `
          import { Banner } from './components/banner';

          // Local definition takes precedence
          const Banner = () => <h1>Local Banner Override</h1>;

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
        `,
        {
          './components/banner.tsx': `
            export const Banner = () => <h1>External Banner</h1>;
          `,
        }
      );

      // Local definition should take precedence
      expect(output).toContain('# Local Banner Override');
      expect(output).not.toContain('External Banner');
    });

    it('external component can use fragment', () => {
      const output = buildWithExternals(
        `
          import { MultiPart } from './components/multi';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => (
                  <>
                    <MultiPart />
                  </>
                )}
              </Command>
            );
          }
        `,
        {
          './components/multi.tsx': `
            export const MultiPart = () => (
              <>
                <h1>Part One</h1>
                <h2>Part Two</h2>
              </>
            );
          `,
        }
      );

      expect(output).toContain('# Part One');
      expect(output).toContain('## Part Two');
    });

    it('works with runtime features inside external component usage', () => {
      const output = buildWithExternals(
        `
          import { StatusBadge } from './components/status';

          export default function Test() {
            return (
              <Command name="test" description="Test">
                {() => {
                  const ctx = useRuntimeVar<{status: string}>('CTX');
                  return (
                    <>
                      <StatusBadge label="Status" />
                      <If condition={ctx.status}>
                        <p>Active</p>
                      </If>
                    </>
                  );
                }}
              </Command>
            );
          }
        `,
        {
          './components/status.tsx': `
            export const StatusBadge = ({ label }: { label: string }) => <h2>{label}</h2>;
          `,
        }
      );

      expect(output).toContain('## Status');
      expect(output).toContain('**If $CTX.status:**');
    });
  });
});
