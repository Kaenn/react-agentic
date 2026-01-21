import { describe, expect, it } from 'vitest';
import {
  createProject,
  parseSource,
  getElementName,
  getAttributeValue,
  findRootJsxElement,
  getJsxChildren,
} from '../../src/index.js';
import { Node } from 'ts-morph';

describe('Parser', () => {
  describe('createProject', () => {
    it('returns a valid ts-morph Project', () => {
      const project = createProject();
      expect(project).toBeDefined();
      expect(typeof project.createSourceFile).toBe('function');
    });
  });

  describe('parseSource', () => {
    it('parses simple TSX content', () => {
      const project = createProject();
      const source = `export default function Page() { return <div>Hello</div>; }`;
      const sourceFile = parseSource(project, source);

      expect(sourceFile).toBeDefined();
      expect(sourceFile.getFullText()).toContain('<div>');
    });

    it('parses TSX with nested elements', () => {
      const project = createProject();
      const source = `
        export default function Page() {
          return (
            <div>
              <h1>Title</h1>
              <p>Content</p>
            </div>
          );
        }
      `;
      const sourceFile = parseSource(project, source);

      expect(sourceFile).toBeDefined();
      expect(sourceFile.getFullText()).toContain('<h1>');
      expect(sourceFile.getFullText()).toContain('<p>');
    });
  });

  describe('getElementName', () => {
    it('extracts tag name from JsxElement', () => {
      const project = createProject();
      const source = `export default function Page() { return <div>Hello</div>; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);
      expect(getElementName(root!)).toBe('div');
    });

    it('extracts tag name from JsxSelfClosingElement', () => {
      const project = createProject();
      const source = `export default function Page() { return <br />; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxSelfClosingElement(root)).toBe(true);
      expect(getElementName(root!)).toBe('br');
    });

    it('extracts tag name with namespace', () => {
      const project = createProject();
      const source = `export default function Page() { return <Custom.Component />; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(getElementName(root!)).toBe('Custom.Component');
    });
  });

  describe('getAttributeValue', () => {
    it('extracts string literal attribute value', () => {
      const project = createProject();
      const source = `export default function Page() { return <a href="https://example.com">Link</a>; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);

      const element = (root as any).getOpeningElement();
      expect(getAttributeValue(element, 'href')).toBe('https://example.com');
    });

    it('extracts JSX expression with string literal', () => {
      const project = createProject();
      const source = `export default function Page() { return <a href={"https://example.com"}>Link</a>; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);

      const element = (root as any).getOpeningElement();
      expect(getAttributeValue(element, 'href')).toBe('https://example.com');
    });

    it('returns undefined for missing attribute', () => {
      const project = createProject();
      const source = `export default function Page() { return <a>Link</a>; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      const element = (root as any).getOpeningElement();
      expect(getAttributeValue(element, 'href')).toBeUndefined();
    });

    it('returns undefined for non-string expression', () => {
      const project = createProject();
      const source = `export default function Page() { return <a href={someVariable}>Link</a>; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      const element = (root as any).getOpeningElement();
      expect(getAttributeValue(element, 'href')).toBeUndefined();
    });

    it('extracts attribute from self-closing element', () => {
      const project = createProject();
      const source = `export default function Page() { return <img src="photo.jpg" />; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxSelfClosingElement(root)).toBe(true);
      expect(getAttributeValue(root as any, 'src')).toBe('photo.jpg');
    });
  });

  describe('findRootJsxElement', () => {
    it('finds JSX in function return', () => {
      const project = createProject();
      const source = `
        export default function Page() {
          return <div>Content</div>;
        }
      `;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);
    });

    it('finds JSX in parenthesized return', () => {
      const project = createProject();
      const source = `
        export default function Page() {
          return (
            <div>Content</div>
          );
        }
      `;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);
    });

    it('finds self-closing element', () => {
      const project = createProject();
      const source = `export default function Page() { return <hr />; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxSelfClosingElement(root)).toBe(true);
    });

    it('finds JSX fragment', () => {
      const project = createProject();
      const source = `
        export default function Page() {
          return (
            <>
              <h1>Title</h1>
              <p>Content</p>
            </>
          );
        }
      `;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxFragment(root)).toBe(true);
    });

    it('returns null when no JSX found', () => {
      const project = createProject();
      const source = `export default function Page() { return null; }`;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).toBeNull();
    });
  });

  describe('getJsxChildren', () => {
    it('returns children of JSX element', () => {
      const project = createProject();
      const source = `
        export default function Page() {
          return (
            <div>
              <span>Text</span>
              <br />
            </div>
          );
        }
      `;
      const sourceFile = parseSource(project, source);
      const root = findRootJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);

      const children = getJsxChildren(root as any);
      // Children include whitespace text nodes + actual elements
      const elementChildren = children.filter(
        (c) => Node.isJsxElement(c) || Node.isJsxSelfClosingElement(c)
      );

      expect(elementChildren.length).toBe(2);
    });
  });
});
