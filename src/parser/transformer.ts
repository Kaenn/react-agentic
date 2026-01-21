/**
 * Transformer - JSX AST to IR Node transformation
 *
 * Converts parsed JSX elements from ts-morph into IR nodes
 * for emission to Markdown.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxFragment,
} from 'ts-morph';
import type {
  BlockNode,
  InlineNode,
  DocumentNode,
} from '../ir/index.js';
import { getElementName, extractText, extractInlineText } from './parser.js';

export class Transformer {
  /**
   * Transform a root JSX element/fragment into a DocumentNode
   */
  transform(node: JsxElement | JsxSelfClosingElement | JsxFragment): DocumentNode {
    // Fragment: transform each child as a block
    if (Node.isJsxFragment(node)) {
      const blocks = this.transformFragmentChildren(node);
      return { kind: 'document', children: blocks };
    }

    // Single element: transform it as the one block
    const block = this.transformToBlock(node);
    const children = block ? [block] : [];
    return { kind: 'document', children };
  }

  private transformFragmentChildren(node: JsxFragment): BlockNode[] {
    const children = node.getJsxChildren();
    const blocks: BlockNode[] = [];

    for (const child of children) {
      const block = this.transformToBlock(child);
      if (block) blocks.push(block);
    }

    return blocks;
  }

  private transformToBlock(node: Node): BlockNode | null {
    if (Node.isJsxText(node)) {
      // Whitespace-only text between block elements - skip
      const text = extractText(node);
      if (!text) return null;
      // Standalone text becomes paragraph
      return { kind: 'paragraph', children: [{ kind: 'text', value: text }] };
    }

    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      return this.transformElement(name, node);
    }

    return null; // JsxExpression etc - handle later
  }

  private transformElement(name: string, node: JsxElement | JsxSelfClosingElement): BlockNode | null {
    // Heading elements
    const headingMatch = name.match(/^h([1-6])$/);
    if (headingMatch) {
      const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
      const children = Node.isJsxElement(node)
        ? this.transformInlineChildren(node)
        : [];
      return { kind: 'heading', level, children };
    }

    // Paragraph
    if (name === 'p') {
      const children = Node.isJsxElement(node)
        ? this.transformInlineChildren(node)
        : [];
      return { kind: 'paragraph', children };
    }

    // Self-closing hr
    if (name === 'hr') {
      return { kind: 'thematicBreak' };
    }

    throw new Error(`Unsupported block element: <${name}>`);
  }

  private transformInlineChildren(node: JsxElement): InlineNode[] {
    const children = node.getJsxChildren();
    const inlines: InlineNode[] = [];

    for (const child of children) {
      const inline = this.transformToInline(child);
      if (inline) inlines.push(inline);
    }

    // Trim leading/trailing whitespace from first and last text nodes
    // (preserves internal spacing between inline elements)
    this.trimBoundaryTextNodes(inlines);

    return inlines;
  }

  private trimBoundaryTextNodes(inlines: InlineNode[]): void {
    if (inlines.length === 0) return;

    // Trim leading whitespace from first text node
    const first = inlines[0];
    if (first.kind === 'text') {
      first.value = first.value.trimStart();
      if (!first.value) {
        inlines.shift();
      }
    }

    if (inlines.length === 0) return;

    // Trim trailing whitespace from last text node
    const last = inlines[inlines.length - 1];
    if (last.kind === 'text') {
      last.value = last.value.trimEnd();
      if (!last.value) {
        inlines.pop();
      }
    }
  }

  private transformToInline(node: Node): InlineNode | null {
    if (Node.isJsxText(node)) {
      // Use extractInlineText to preserve leading/trailing spaces
      const text = extractInlineText(node);
      if (!text) return null;
      return { kind: 'text', value: text };
    }

    if (Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      if (name === 'br') {
        return { kind: 'lineBreak' };
      }
      throw new Error(`Unsupported inline self-closing element: <${name}>`);
    }

    if (Node.isJsxElement(node)) {
      const name = getElementName(node);
      return this.transformInlineElement(name, node);
    }

    // Handle JSX expressions like {' '} for explicit spacing
    if (Node.isJsxExpression(node)) {
      const expr = node.getExpression();
      if (expr && Node.isStringLiteral(expr)) {
        const value = expr.getLiteralValue();
        if (value) {
          return { kind: 'text', value };
        }
      }
      // Non-string expressions are ignored for now
      return null;
    }

    return null;
  }

  private transformInlineElement(name: string, node: JsxElement): InlineNode {
    // Bold
    if (name === 'b' || name === 'strong') {
      return { kind: 'bold', children: this.transformInlineChildren(node) };
    }

    // Italic
    if (name === 'i' || name === 'em') {
      return { kind: 'italic', children: this.transformInlineChildren(node) };
    }

    // Inline code
    if (name === 'code') {
      // Inline code: extract raw text content
      const text = this.extractAllText(node);
      return { kind: 'inlineCode', value: text };
    }

    throw new Error(`Unsupported inline element: <${name}>`);
  }

  private extractAllText(node: JsxElement): string {
    // Recursively extract all text content from children
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (text) parts.push(text);
      }
    }
    return parts.join('');
  }
}

/**
 * Convenience function to transform a JSX element to a DocumentNode
 */
export function transform(node: JsxElement | JsxSelfClosingElement | JsxFragment): DocumentNode {
  const transformer = new Transformer();
  return transformer.transform(node);
}
