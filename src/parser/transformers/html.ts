/**
 * HTML element transformer functions
 *
 * Transforms HTML-like JSX elements to IR nodes:
 * - ul/ol → ListNode
 * - li → ListItemNode
 * - blockquote → BlockquoteNode
 * - pre → CodeBlockNode
 * - div → XmlBlockNode or GroupNode
 *
 * Extracted from Transformer class for maintainability and modularity.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  TemplateExpression,
} from 'ts-morph';
import type {
  ListNode,
  ListItemNode,
  BlockquoteNode,
  CodeBlockNode,
  XmlBlockNode,
  GroupNode,
  BaseBlockNode,
  BlockNode,
  InlineNode,
} from '../../ir/index.js';
import {
  getElementName,
  getAttributeValue,
  extractText,
} from '../utils/index.js';
import type { TransformContext } from './types.js';
import { transformBlockChildren, transformToBlock } from './dispatch.js';
import { transformToInline } from './inline.js';

// ============================================================================
// Inline Element Classification
// ============================================================================

/**
 * Inline HTML elements that should be wrapped in paragraphs when at block level
 */
const INLINE_ELEMENTS = new Set([
  'a', 'b', 'i', 'strong', 'em', 'code', 'span', 'br',
]);

/**
 * Check if a tag name represents an inline element
 */
function isInlineElement(tagName: string): boolean {
  return INLINE_ELEMENTS.has(tagName);
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

// ============================================================================
// List Transformers
// ============================================================================

/**
 * Transform ul/ol element to ListNode
 */
export function transformList(
  node: JsxElement | JsxSelfClosingElement,
  ordered: boolean,
  ctx: TransformContext
): ListNode {
  if (Node.isJsxSelfClosingElement(node)) {
    return { kind: 'list', ordered, items: [] };
  }

  const items: ListItemNode[] = [];
  for (const child of node.getJsxChildren()) {
    if (Node.isJsxElement(child)) {
      const childName = getElementName(child);
      if (childName === 'li') {
        items.push(transformListItem(child, ctx));
      } else {
        throw ctx.createError(`Expected <li> inside list, got <${childName}>`, child);
      }
    } else if (Node.isJsxText(child) && !child.containsOnlyTriviaWhiteSpaces()) {
      throw ctx.createError('Lists can only contain <li> elements', child);
    }
    // Skip whitespace-only text nodes
  }

  return { kind: 'list', ordered, items };
}

/**
 * Transform li element to ListItemNode
 * Handles both block-level and inline content within list items
 */
export function transformListItem(
  node: JsxElement,
  ctx: TransformContext
): ListItemNode {
  // List items can contain blocks (paragraphs, nested lists) or inline content
  // We need to collect inline content together to preserve spacing between elements
  const children: BlockNode[] = [];
  const jsxChildren = node.getJsxChildren();

  // Helper to check if a child is block-level content
  const isBlockContent = (child: Node): boolean => {
    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);
      return name === 'ul' || name === 'ol' || name === 'p';
    }
    return false;
  };

  // Collect inline content sequences and process them together
  let inlineSequence: Node[] = [];

  const flushInlineSequence = () => {
    if (inlineSequence.length === 0) return;

    // Transform accumulated inline content to a paragraph
    const inlineNodes: InlineNode[] = [];
    for (const inlineChild of inlineSequence) {
      const inline = transformToInline(inlineChild, ctx);
      if (inline) inlineNodes.push(inline);
    }

    if (inlineNodes.length > 0) {
      // Trim boundary whitespace while preserving internal spacing
      trimBoundaryInlines(inlineNodes);
      if (inlineNodes.length > 0) {
        children.push({ kind: 'paragraph', children: inlineNodes });
      }
    }

    inlineSequence = [];
  };

  for (const child of jsxChildren) {
    if (isBlockContent(child)) {
      // Flush any pending inline content before block
      flushInlineSequence();

      // Transform block content via dispatch
      const block = transformToBlock(child, ctx);
      if (block) children.push(block);
    } else {
      // Accumulate inline content (text, expressions, inline elements)
      inlineSequence.push(child);
    }
  }

  // Flush any remaining inline content
  flushInlineSequence();

  return { kind: 'listItem', children: children as BaseBlockNode[] };
}

/**
 * Trim boundary whitespace from inline nodes while preserving internal spacing
 */
function trimBoundaryInlines(inlines: InlineNode[]): void {
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

// ============================================================================
// Blockquote Transformer
// ============================================================================

/**
 * Transform blockquote element to BlockquoteNode
 */
export function transformBlockquote(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): BlockquoteNode {
  if (Node.isJsxSelfClosingElement(node)) {
    return { kind: 'blockquote', children: [] };
  }

  // Transform children as blocks (with If/Else sibling detection)
  const children = transformBlockChildren(node.getJsxChildren(), ctx);

  return { kind: 'blockquote', children: children as BaseBlockNode[] };
}

// ============================================================================
// Code Block Transformer
// ============================================================================

/**
 * Transform pre element to CodeBlockNode
 */
export function transformCodeBlock(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): CodeBlockNode {
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
      const content = extractCodeContent(child, ctx);
      return { kind: 'codeBlock', language, content };
    }
  }

  // Pre without code child - extract text directly
  const content = extractCodeContent(node, ctx);
  return { kind: 'codeBlock', content };
}

/**
 * Extract code content from pre/code element, preserving whitespace
 */
export function extractCodeContent(
  node: JsxElement,
  ctx: TransformContext
): string {
  // Preserve whitespace in code blocks - don't normalize
  const parts: string[] = [];
  for (const child of node.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      parts.push(child.getText());
    } else if (Node.isJsxExpression(child)) {
      // Handle {`template`} and {"string"} expressions
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          // Template with substitutions: {`text ${var} more`}
          parts.push(extractTemplateText(expr));
        }
      }
    }
  }
  // Trim only the outermost whitespace (leading/trailing)
  return parts.join('').trim();
}

/**
 * Extract template text with variable substitution
 * Converts ${variable} to {variable} for GSD format
 */
function extractTemplateText(expr: TemplateExpression): string {
  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Convert ${variable} to {variable} for GSD format
    parts.push(`{${spanExpr.getText()}}`);
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}

// ============================================================================
// Div Transformer
// ============================================================================

/**
 * Transform div element to XmlBlockNode (if has name attribute) or GroupNode (invisible container)
 */
export function transformDiv(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): XmlBlockNode | GroupNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get name attribute (optional - if missing, create invisible group)
  const nameAttr = getAttributeValue(openingElement, 'name');

  // Transform children as mixed content (inline elements get wrapped in paragraphs)
  const children = Node.isJsxElement(node)
    ? transformMixedChildren(node.getJsxChildren(), ctx)
    : [];

  // No name attribute: invisible grouping container with tight spacing
  if (!nameAttr) {
    return {
      kind: 'group',
      children: children as BaseBlockNode[],
    };
  }

  // Has name attribute: XML block with wrapper tags
  // Validate XML name
  if (!isValidXmlName(nameAttr)) {
    throw ctx.createError(
      `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`,
      node
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

  return {
    kind: 'xmlBlock',
    name: nameAttr,
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    children: children as BaseBlockNode[],
  };
}

// ============================================================================
// Mixed Content Handling
// ============================================================================

/**
 * Transform mixed children (inline + block elements)
 * Consecutive inline elements and text are wrapped in a single paragraph
 * Block elements are transformed normally
 */
export function transformMixedChildren(
  jsxChildren: Node[],
  ctx: TransformContext
): BlockNode[] {
  const blocks: BlockNode[] = [];
  let inlineAccumulator: Node[] = [];

  const flushInline = () => {
    if (inlineAccumulator.length === 0) return;

    // Transform accumulated inline content as a paragraph
    const inlineNodes: InlineNode[] = [];
    for (const inlineChild of inlineAccumulator) {
      const inline = transformToInline(inlineChild, ctx);
      if (inline) inlineNodes.push(inline);
    }

    if (inlineNodes.length > 0) {
      // Trim boundary whitespace while preserving internal spacing
      trimBoundaryInlines(inlineNodes);
      if (inlineNodes.length > 0) {
        blocks.push({ kind: 'paragraph', children: inlineNodes });
      }
    }

    inlineAccumulator = [];
  };

  for (const child of jsxChildren) {
    // Check if this is an inline element or text
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (text) {
        inlineAccumulator.push(child);
      }
      // Skip whitespace-only text if accumulator is empty
      continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const name = getElementName(child);

      if (isInlineElement(name)) {
        // Accumulate inline elements
        inlineAccumulator.push(child);
      } else {
        // Flush any accumulated inline content before block element
        flushInline();
        // Transform block element via dispatch
        const block = transformToBlock(child, ctx);
        if (block) blocks.push(block);
      }
    } else if (Node.isJsxExpression(child)) {
      // JSX expressions treated as inline
      inlineAccumulator.push(child);
    }
  }

  // Flush remaining inline content
  flushInline();

  return blocks;
}

/**
 * Recursively extract all text content from children
 * Handles both JsxText and JsxExpression (string literals, template literals)
 */
export function extractAllText(node: JsxElement): string {
  const parts: string[] = [];
  for (const child of node.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (text) parts.push(text);
    } else if (Node.isJsxExpression(child)) {
      // Handle {`template`}, {"string"}, and {'string'} expressions
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          // Template with substitutions: {`text ${var} more`}
          parts.push(extractTemplateText(expr));
        }
      }
    }
  }
  return parts.join('');
}
