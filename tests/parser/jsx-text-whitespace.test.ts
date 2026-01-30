import { describe, expect, it } from 'vitest';
import { createProject, parseSource } from '../../src/index.js';
import { Node, JsxElement } from 'ts-morph';

/**
 * Tests for JSX text whitespace preservation
 *
 * The goal: Allow users to write plain text content in XmlBlock without template literals,
 * while preserving newlines for markdown output.
 *
 * JSX normally collapses whitespace, but we need to extract the raw source text
 * to preserve newlines for markdown content.
 */

function findFirstJsxElement(sourceFile: any): JsxElement | null {
  let result: JsxElement | null = null;
  sourceFile.forEachDescendant((node: any) => {
    if (Node.isJsxElement(node) && !result) {
      result = node;
    }
  });
  return result;
}

describe('JSX Text Whitespace Preservation', () => {
  describe('JsxText node source positions', () => {
    it('should have correct source positions for multi-line content', () => {
      const project = createProject();
      const source = `const x = <XmlBlock name="role">
You are a GSD research synthesizer.

You are spawned by:

- Item 1
- Item 2
</XmlBlock>;`;
      const sourceFile = parseSource(project, source);
      const root = findFirstJsxElement(sourceFile);

      expect(root).not.toBeNull();
      expect(Node.isJsxElement(root)).toBe(true);

      // Get the JSX children
      const children = root!.getJsxChildren();
      expect(children.length).toBeGreaterThan(0);

      // Find JsxText node
      const jsxTextNode = children.find((c: any) => Node.isJsxText(c));
      expect(jsxTextNode).toBeDefined();

      const srcText = sourceFile.getFullText();
      const sliced = srcText.slice(jsxTextNode!.getStart(), jsxTextNode!.getEnd());

      // The key assertion: raw source slice should preserve newlines
      expect(sliced).toContain('\n');
    });

    it('should extract raw source text preserving newlines', () => {
      const project = createProject();
      const source = `const x = <div>
Line 1

Line 2

Line 3
</div>;`;
      const sourceFile = parseSource(project, source);
      const root = findFirstJsxElement(sourceFile);

      const children = root!.getJsxChildren();
      const jsxTextNode = children.find((c: any) => Node.isJsxText(c));

      // Extract raw source text using positions
      const srcText = sourceFile.getFullText();
      const rawText = srcText.slice(jsxTextNode!.getStart(), jsxTextNode!.getEnd());

      // Count newlines - should have multiple
      const newlineCount = (rawText.match(/\n/g) || []).length;
      expect(newlineCount).toBeGreaterThanOrEqual(5); // At least 5 newlines
    });
  });

  describe('extractMarkdownText function', () => {
    it('should preserve newlines in multi-line JSX text', async () => {
      // Import the function we're testing
      const { extractMarkdownText } = await import('../../src/parser/transformers/runtime-utils.js');

      const project = createProject();
      const source = `const x = <XmlBlock name="role">
You are a GSD research synthesizer.

You are spawned by:

- Item 1
- Item 2
</XmlBlock>;`;
      const sourceFile = parseSource(project, source);
      const root = findFirstJsxElement(sourceFile);

      const children = root!.getJsxChildren();
      const jsxTextNode = children.find((c: any) => Node.isJsxText(c));

      const result = extractMarkdownText(jsxTextNode!);

      // The result should preserve newlines
      expect(result).toContain('\n');
      expect(result).toContain('You are a GSD research synthesizer.');
      expect(result).toContain('You are spawned by:');
      expect(result).toContain('- Item 1');
    });
  });

  // Full pipeline test skipped - module resolution issues in vitest
  // See actual build test in get-shit-done project
});
