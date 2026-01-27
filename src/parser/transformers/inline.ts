/**
 * Inline content transformer functions
 *
 * Transforms inline JSX content to InlineNode types:
 * - Text nodes → TextNode
 * - b/strong → BoldNode
 * - i/em → ItalicNode
 * - code → InlineCodeNode
 * - a → LinkNode
 * - br → LineBreakNode
 *
 * Extracted from Transformer class for maintainability and modularity.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
} from 'ts-morph';
import type {
  InlineNode,
  LinkNode,
} from '../../ir/index.js';
import {
  getElementName,
  getAttributeValue,
  extractInlineText,
} from '../utils/index.js';
import type { TransformContext } from './types.js';
import { extractAllText } from './html.js';

// ============================================================================
// Inline Content Transformation
// ============================================================================

/**
 * Transform JSX children to array of InlineNodes
 * Used for elements that contain inline content (p, h1-h6, b, i, a, etc.)
 */
export function transformInlineChildren(
  node: JsxElement,
  ctx: TransformContext
): InlineNode[] {
  const children = node.getJsxChildren();
  const inlines: InlineNode[] = [];

  for (const child of children) {
    const inline = transformToInline(child, ctx);
    if (inline) inlines.push(inline);
  }

  // Trim leading/trailing whitespace from first and last text nodes
  // (preserves internal spacing between inline elements)
  trimBoundaryTextNodes(inlines);

  return inlines;
}

/**
 * Trim leading/trailing whitespace from boundary text nodes
 * Preserves internal spacing between inline elements
 */
export function trimBoundaryTextNodes(inlines: InlineNode[]): void {
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
// Node to Inline Transformation
// ============================================================================

/**
 * Transform a single node to InlineNode
 * Handles text, inline elements, expressions
 */
export function transformToInline(
  node: Node,
  ctx: TransformContext
): InlineNode | null {
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
    throw ctx.createError(`Unsupported inline self-closing element: <${name}>`, node);
  }

  if (Node.isJsxElement(node)) {
    const name = getElementName(node);
    return transformInlineElement(name, node, ctx);
  }

  // Handle JSX expressions
  if (Node.isJsxExpression(node)) {
    const expr = node.getExpression();
    if (!expr) return null;

    // String literals: {' '} or {'text'}
    if (Node.isStringLiteral(expr)) {
      const value = expr.getLiteralValue();
      if (value) {
        return { kind: 'text', value };
      }
      return null;
    }

    // Call expressions: output.field('key') -> '{output.key}'
    if (Node.isCallExpression(expr)) {
      const propAccess = expr.getExpression();
      // Check if it's a method call like output.field('key')
      if (Node.isPropertyAccessExpression(propAccess)) {
        const methodName = propAccess.getName();
        const objExpr = propAccess.getExpression();

        // Check if it's calling .field() on a useOutput result
        if (methodName === 'field' && Node.isIdentifier(objExpr)) {
          const outputName = objExpr.getText();
          // Verify this is a tracked output
          if (ctx.outputs.has(outputName)) {
            // Get the field key from the argument
            const args = expr.getArguments();
            if (args.length >= 1) {
              const keyArg = args[0];
              if (Node.isStringLiteral(keyArg)) {
                const fieldKey = keyArg.getLiteralValue();
                return { kind: 'text', value: `{output.${fieldKey}}` };
              }
            }
          }
        }
      }
    }

    // Property access expressions: ctx.name, ctx.outputPath, etc.
    if (Node.isPropertyAccessExpression(expr)) {
      const objExpr = expr.getExpression();
      const propName = expr.getName();

      // Check if accessing render props context (e.g., ctx.name)
      if (Node.isIdentifier(objExpr) && ctx.renderPropsContext) {
        const objName = objExpr.getText();
        if (objName === ctx.renderPropsContext.paramName) {
          const value = ctx.renderPropsContext.values[propName];
          if (value !== undefined) {
            return { kind: 'text', value };
          }
        }
      }
    }

    // Other expressions are ignored
    return null;
  }

  return null;
}

// ============================================================================
// Inline Element Transformation
// ============================================================================

/**
 * Transform inline JSX element to InlineNode
 * Handles b, i, strong, em, code, a
 */
export function transformInlineElement(
  name: string,
  node: JsxElement,
  ctx: TransformContext
): InlineNode {
  // Bold
  if (name === 'b' || name === 'strong') {
    return { kind: 'bold', children: transformInlineChildren(node, ctx) };
  }

  // Italic
  if (name === 'i' || name === 'em') {
    return { kind: 'italic', children: transformInlineChildren(node, ctx) };
  }

  // Inline code
  if (name === 'code') {
    // Inline code: extract raw text content
    const text = extractAllText(node);
    return { kind: 'inlineCode', value: text };
  }

  // Link
  if (name === 'a') {
    return transformLink(node, ctx);
  }

  throw ctx.createError(`Unsupported inline element: <${name}>`, node);
}

// ============================================================================
// Link Transformer
// ============================================================================

/**
 * Transform a link element to LinkNode
 */
export function transformLink(
  node: JsxElement,
  ctx: TransformContext
): LinkNode {
  const href = getAttributeValue(node.getOpeningElement(), 'href');
  if (!href) {
    throw ctx.createError('<a> element requires href attribute', node);
  }

  const children = transformInlineChildren(node, ctx);
  return { kind: 'link', url: href, children };
}
