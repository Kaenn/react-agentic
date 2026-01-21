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
  JsxOpeningElement,
  JsxSpreadAttribute,
  SourceFile,
} from 'ts-morph';
import type {
  BlockNode,
  InlineNode,
  DocumentNode,
  ListNode,
  ListItemNode,
  BlockquoteNode,
  CodeBlockNode,
  LinkNode,
  FrontmatterNode,
  XmlBlockNode,
} from '../ir/index.js';
import { getElementName, getAttributeValue, extractText, extractInlineText, getArrayAttributeValue, resolveSpreadAttribute, resolveComponentImport } from './parser.js';

// ============================================================================
// Element Classification
// ============================================================================

/**
 * HTML elements supported by the transformer
 */
const HTML_ELEMENTS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'div', 'span', 'ul', 'ol', 'li',
  'a', 'b', 'i', 'strong', 'em', 'code',
  'pre', 'blockquote', 'br', 'hr',
]);

/**
 * Special component names that are NOT custom user components
 */
const SPECIAL_COMPONENTS = new Set(['Command', 'Markdown']);

/**
 * Check if a tag name represents a custom user-defined component
 *
 * Custom components:
 * - Are NOT HTML elements
 * - Are NOT special components (Command, Markdown)
 * - Start with uppercase (React convention)
 */
export function isCustomComponent(tagName: string): boolean {
  if (HTML_ELEMENTS.has(tagName)) return false;
  if (SPECIAL_COMPONENTS.has(tagName)) return false;
  // React convention: custom components start with uppercase
  return /^[A-Z]/.test(tagName);
}

/**
 * Validate that a string is a valid XML tag name
 * Per XML 1.0 spec (simplified): starts with letter or underscore,
 * followed by letters, digits, underscores, hyphens, or periods.
 * Cannot start with 'xml' (case-insensitive).
 */
const XML_NAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9_.\-]*$/;

function isValidXmlName(name: string): boolean {
  if (!name) return false;
  if (!XML_NAME_REGEX.test(name)) return false;
  if (name.toLowerCase().startsWith('xml')) return false;
  return true;
}

export class Transformer {
  /**
   * Transform a root JSX element/fragment into a DocumentNode
   */
  transform(node: JsxElement | JsxSelfClosingElement | JsxFragment): DocumentNode {
    // Check for Command wrapper at root level
    if (Node.isJsxElement(node) || Node.isJsxSelfClosingElement(node)) {
      const name = getElementName(node);
      if (name === 'Command') {
        return this.transformCommand(node);
      }
    }

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

  /**
   * Merge Command props from spread attributes and explicit attributes
   *
   * Processes attributes in order - later props override earlier ones.
   * Supports spread attributes: {...baseProps}
   * Supports explicit attributes: name="value" or name={"value"} or name={["a", "b"]}
   */
  private mergeCommandProps(opening: JsxOpeningElement | JsxSelfClosingElement): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (const attr of opening.getAttributes()) {
      if (Node.isJsxSpreadAttribute(attr)) {
        // Resolve spread and merge
        const spreadProps = resolveSpreadAttribute(attr);
        Object.assign(merged, spreadProps);
      } else if (Node.isJsxAttribute(attr)) {
        // Explicit prop
        const attrName = attr.getNameNode().getText();

        // Try string value first
        const stringValue = getAttributeValue(opening, attrName);
        if (stringValue !== undefined) {
          merged[attrName] = stringValue;
          continue;
        }

        // Try array value
        const arrayValue = getArrayAttributeValue(opening, attrName);
        if (arrayValue !== undefined) {
          merged[attrName] = arrayValue;
        }
      }
    }

    return merged;
  }

  /**
   * Transform a Command element to DocumentNode with frontmatter
   */
  private transformCommand(node: JsxElement | JsxSelfClosingElement): DocumentNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Merge all props (spread + explicit)
    const props = this.mergeCommandProps(openingElement);

    // Extract required props
    const name = props.name as string | undefined;
    const description = props.description as string | undefined;

    if (!name) {
      throw new Error('Command requires name prop');
    }
    if (!description) {
      throw new Error('Command requires description prop');
    }

    // Build frontmatter data
    const data: Record<string, unknown> = {
      name,
      description,
    };

    // Optional array prop (check for allowedTools, map to allowed-tools)
    const allowedTools = props.allowedTools as string[] | undefined;
    if (allowedTools) {
      data['allowed-tools'] = allowedTools;
    }

    const frontmatter: FrontmatterNode = { kind: 'frontmatter', data };

    // Transform children as body blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

    return { kind: 'document', frontmatter, children };
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

    // Unordered list
    if (name === 'ul') {
      return this.transformList(node, false);
    }

    // Ordered list
    if (name === 'ol') {
      return this.transformList(node, true);
    }

    // Blockquote
    if (name === 'blockquote') {
      return this.transformBlockquote(node);
    }

    // Code block (pre containing code)
    if (name === 'pre') {
      return this.transformCodeBlock(node);
    }

    // XML block via div with name attribute
    if (name === 'div') {
      return this.transformDiv(node);
    }

    // Markdown passthrough
    if (name === 'Markdown') {
      return this.transformMarkdown(node);
    }

    throw new Error(`Unsupported block element: <${name}>`);
  }

  private transformList(node: JsxElement | JsxSelfClosingElement, ordered: boolean): ListNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'list', ordered, items: [] };
    }

    const items: ListItemNode[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxElement(child)) {
        const childName = getElementName(child);
        if (childName === 'li') {
          items.push(this.transformListItem(child));
        } else {
          throw new Error(`Expected <li> inside list, got <${childName}>`);
        }
      } else if (Node.isJsxText(child) && !child.containsOnlyTriviaWhiteSpaces()) {
        throw new Error('Lists can only contain <li> elements');
      }
      // Skip whitespace-only text nodes
    }

    return { kind: 'list', ordered, items };
  }

  private transformListItem(node: JsxElement): ListItemNode {
    // List items can contain blocks (paragraphs, nested lists)
    const children: BlockNode[] = [];

    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (text) {
          // Plain text in li becomes paragraph
          children.push({ kind: 'paragraph', children: [{ kind: 'text', value: text }] });
        }
      } else if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = getElementName(child);

        // Check if it's a nested list
        if (childName === 'ul' || childName === 'ol') {
          const nestedList = this.transformElement(childName, child);
          if (nestedList) children.push(nestedList);
        } else if (childName === 'p') {
          // Explicit paragraph
          const para = this.transformElement(childName, child);
          if (para) children.push(para);
        } else {
          // Inline elements get wrapped in implicit paragraph
          const inline = Node.isJsxSelfClosingElement(child)
            ? this.transformToInline(child)
            : this.transformInlineElement(childName, child);
          if (inline) {
            // Merge into last paragraph if possible
            const lastChild = children[children.length - 1];
            if (lastChild?.kind === 'paragraph') {
              lastChild.children.push(inline);
            } else {
              children.push({ kind: 'paragraph', children: [inline] });
            }
          }
        }
      }
    }

    return { kind: 'listItem', children };
  }

  private transformBlockquote(node: JsxElement | JsxSelfClosingElement): BlockquoteNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'blockquote', children: [] };
    }

    const children: BlockNode[] = [];
    for (const child of node.getJsxChildren()) {
      const block = this.transformToBlock(child);
      if (block) children.push(block);
    }

    return { kind: 'blockquote', children };
  }

  private transformCodeBlock(node: JsxElement | JsxSelfClosingElement): CodeBlockNode {
    if (Node.isJsxSelfClosingElement(node)) {
      return { kind: 'codeBlock', content: '' };
    }

    // Look for <code> child with optional language
    const children = node.getJsxChildren();
    for (const child of children) {
      if (Node.isJsxElement(child) && getElementName(child) === 'code') {
        const language = getAttributeValue(
          child.getOpeningElement(),
          'className'
        )?.replace(/^language-/, '');

        // Extract raw text content preserving whitespace
        const content = this.extractCodeContent(child);
        return { kind: 'codeBlock', language, content };
      }
    }

    // Pre without code child - extract text directly
    const content = this.extractCodeContent(node);
    return { kind: 'codeBlock', content };
  }

  private extractCodeContent(node: JsxElement): string {
    // Preserve whitespace in code blocks - don't normalize
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        parts.push(child.getText());
      }
    }
    // Trim only the outermost whitespace (leading/trailing)
    return parts.join('').trim();
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

    // Link
    if (name === 'a') {
      return this.transformLink(node);
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

  private transformLink(node: JsxElement): LinkNode {
    const href = getAttributeValue(node.getOpeningElement(), 'href');
    if (!href) {
      throw new Error('<a> element requires href attribute');
    }

    const children = this.transformInlineChildren(node);
    return { kind: 'link', url: href, children };
  }

  private transformDiv(node: JsxElement | JsxSelfClosingElement): XmlBlockNode {
    const openingElement = Node.isJsxElement(node)
      ? node.getOpeningElement()
      : node;

    // Get name attribute (optional - if missing, output as <div>)
    const nameAttr = getAttributeValue(openingElement, 'name');
    const tagName = nameAttr || 'div';

    // Validate XML name if custom name provided
    if (nameAttr && !isValidXmlName(nameAttr)) {
      throw new Error(
        `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`
      );
    }

    // Extract other attributes (excluding 'name' which becomes the tag)
    const attributes: Record<string, string> = {};
    for (const attr of openingElement.getAttributes()) {
      if (Node.isJsxAttribute(attr)) {
        const attrName = attr.getNameNode().getText();
        if (attrName !== 'name') {
          const value = getAttributeValue(openingElement, attrName);
          if (value !== undefined) {
            attributes[attrName] = value;
          }
        }
      }
    }

    // Transform children as blocks
    const children: BlockNode[] = [];
    if (Node.isJsxElement(node)) {
      for (const child of node.getJsxChildren()) {
        const block = this.transformToBlock(child);
        if (block) children.push(block);
      }
    }

    return {
      kind: 'xmlBlock',
      name: tagName,
      attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
      children,
    };
  }

  private transformMarkdown(node: JsxElement | JsxSelfClosingElement): BlockNode {
    if (Node.isJsxSelfClosingElement(node)) {
      // Self-closing <Markdown /> - empty content
      return { kind: 'raw', content: '' };
    }

    // Extract raw content from children
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        // Get raw text preserving whitespace
        parts.push(child.getText());
      } else if (Node.isJsxExpression(child)) {
        // Handle {variable} or {"literal"} expressions
        const expr = child.getExpression();
        if (expr && Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        }
        // Non-string expressions ignored (can't evaluate at transpile time)
      }
    }

    // Trim outer boundaries, preserve internal whitespace
    const content = parts.join('').trim();

    return { kind: 'raw', content };
  }
}

/**
 * Convenience function to transform a JSX element to a DocumentNode
 */
export function transform(node: JsxElement | JsxSelfClosingElement | JsxFragment): DocumentNode {
  const transformer = new Transformer();
  return transformer.transform(node);
}
