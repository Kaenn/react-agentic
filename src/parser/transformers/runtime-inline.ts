/**
 * Runtime Inline Transformer
 *
 * Inline content transformation with RuntimeVar interpolation.
 * When encountering property access expressions on RuntimeVar proxies,
 * emits shell variable syntax for runtime resolution.
 *
 * @example
 * // In TSX:
 * <p>Phase {ctx.phaseId}: {ctx.phaseName}</p>
 *
 * // Outputs:
 * Phase $CTX.phaseId: $CTX.phaseName
 */

import { Node, JsxElement } from 'ts-morph';
import type { InlineNode } from '../../ir/nodes.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { extractInlineText, getElementName, getAttributeValue } from '../utils/index.js';
import { extractAllText } from './html.js';

// ============================================================================
// Runtime Inline Children Transformation
// ============================================================================

/**
 * Transform JSX children to array of InlineNodes with RuntimeVar support
 *
 * Recognizes RuntimeVar property access and emits shell variable syntax for interpolation.
 */
export function transformRuntimeInlineChildren(
  node: JsxElement,
  ctx: RuntimeTransformContext
): InlineNode[] {
  const children = node.getJsxChildren();
  const inlines: InlineNode[] = [];

  for (const child of children) {
    const inline = transformRuntimeToInline(child, ctx);
    if (inline) {
      // Handle arrays (from template literals)
      if (Array.isArray(inline)) {
        inlines.push(...inline);
      } else {
        inlines.push(inline);
      }
    }
  }

  // Trim leading/trailing whitespace from first and last text nodes
  trimBoundaryTextNodes(inlines);

  return inlines;
}

/**
 * Trim structural whitespace from boundary text nodes
 *
 * Only trims:
 * - Whitespace-only text nodes (structural)
 * - Leading newlines and their indentation (structural)
 *
 * Preserves:
 * - Single leading spaces that separate from previous inline elements
 *   e.g., "<b>Bold:</b> text" should keep the space before "text"
 */
function trimBoundaryTextNodes(inlines: InlineNode[]): void {
  if (inlines.length === 0) return;

  // Trim leading structural whitespace from first text node
  const first = inlines[0];
  if (first.kind === 'text') {
    // Only trim if whitespace-only or starts with newline (structural)
    if (/^\s*$/.test(first.value)) {
      inlines.shift();
    } else if (/^\n/.test(first.value)) {
      // Remove leading newlines but preserve inline spaces
      first.value = first.value.replace(/^\n\s*/, '');
      if (!first.value) inlines.shift();
    }
    // PRESERVE single leading spaces - they separate from previous inline
  }

  if (inlines.length === 0) return;

  // Trim trailing structural whitespace from last text node
  const last = inlines[inlines.length - 1];
  if (last.kind === 'text') {
    if (/^\s*$/.test(last.value)) {
      inlines.pop();
    } else if (/\n\s*$/.test(last.value)) {
      // Remove trailing newlines but preserve inline spaces
      last.value = last.value.replace(/\n\s*$/, '');
      if (!last.value) inlines.pop();
    }
    // PRESERVE trailing spaces within content
  }
}

// ============================================================================
// Node to Inline Transformation
// ============================================================================

/**
 * Transform a single node to InlineNode with RuntimeVar support
 */
function transformRuntimeToInline(
  node: Node,
  ctx: RuntimeTransformContext
): InlineNode | InlineNode[] | null {
  if (Node.isJsxText(node)) {
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
    return transformRuntimeInlineElement(name, node, ctx);
  }

  // Handle JSX expressions - this is where RuntimeVar magic happens
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

    // Template literals: {`Phase ${ctx.phaseId}`}
    if (Node.isTemplateExpression(expr)) {
      return transformTemplateLiteral(expr, ctx);
    }

    // No-substitution template literals: {`plain text`}
    if (Node.isNoSubstitutionTemplateLiteral(expr)) {
      const value = expr.getLiteralValue();
      if (value) {
        return { kind: 'text', value };
      }
      return null;
    }

    // Property access: ctx.phaseId, ctx.flags.gaps
    if (Node.isPropertyAccessExpression(expr)) {
      const result = transformPropertyAccess(expr, ctx);
      if (result) return result;
    }

    // Direct identifier reference: {iteration}, {userChoice}, or component props like {name}
    if (Node.isIdentifier(expr)) {
      const varName = expr.getText();

      // Check for component prop first
      if (ctx.componentProps && ctx.componentProps.has(varName)) {
        const propValue = ctx.componentProps.get(varName);
        if (propValue !== undefined && propValue !== null) {
          return { kind: 'text', value: String(propValue) };
        }
      }

      const runtimeVar = ctx.runtimeVars.get(varName);
      if (runtimeVar) {
        // This is a RuntimeVar reference - emit shell variable syntax
        const value = `$${runtimeVar.varName}`;
        return { kind: 'text', value };
      }
      // Not a RuntimeVar or component prop - return raw text
      return { kind: 'text', value: varName };
    }

    // Binary expressions with === or !==: ctx.status === 'PASSED'
    if (Node.isBinaryExpression(expr)) {
      // Just render the expression as text - V3 handles conditions differently
      return { kind: 'text', value: expr.getText() };
    }

    // Unknown expression - render raw text
    return { kind: 'text', value: expr.getText() };
  }

  return null;
}

// ============================================================================
// Property Access Transformation
// ============================================================================

/**
 * Collect property access path from a property access expression
 *
 * @example
 * ctx.user.name -> ['ctx', 'user', 'name']
 * ctx.flags.gaps -> ['ctx', 'flags', 'gaps']
 */
function collectPropertyPath(expr: Node): string[] {
  const path: string[] = [];
  let current = expr;

  while (Node.isPropertyAccessExpression(current)) {
    path.unshift(current.getName());
    current = current.getExpression();
  }

  if (Node.isIdentifier(current)) {
    path.unshift(current.getText());
  }

  return path;
}

/**
 * Transform property access expression to inline node
 *
 * If the root identifier is a RuntimeVar, emit shell variable syntax.
 * If it's a component prop access (props.xxx), substitute the value.
 * Otherwise, return the raw text.
 */
function transformPropertyAccess(
  expr: Node,
  ctx: RuntimeTransformContext
): InlineNode | null {
  if (!Node.isPropertyAccessExpression(expr)) return null;

  const path = collectPropertyPath(expr);
  if (path.length === 0) return null;

  const rootName = path[0];

  // Check for component prop access: props.xxx
  if (rootName === 'props' && path.length >= 2 && ctx.componentProps) {
    const propName = path[1];
    if (ctx.componentProps.has(propName)) {
      const propValue = ctx.componentProps.get(propName);
      if (propValue !== undefined && propValue !== null) {
        return { kind: 'text', value: String(propValue) };
      }
      return null;
    }
  }

  const runtimeVar = ctx.runtimeVars.get(rootName);

  if (runtimeVar) {
    // This is a RuntimeVar reference - emit shell variable syntax
    const varPath = path.slice(1);
    // Format path with dot notation, using bracket notation for numeric indices
    const pathStr = varPath.length === 0
      ? ''
      : varPath.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
    const value = `$${runtimeVar.varName}${pathStr}`;
    return { kind: 'text', value };
  }

  // Not a RuntimeVar - return raw text
  return { kind: 'text', value: expr.getText() };
}

// ============================================================================
// Template Literal Transformation
// ============================================================================

/**
 * Transform template literal with embedded expressions
 *
 * @example
 * `Phase ${ctx.phaseId}: ${ctx.phaseName}`
 * -> ["Phase ", $CTX.phaseId, ": ", $CTX.phaseName]
 */
function transformTemplateLiteral(
  expr: Node,
  ctx: RuntimeTransformContext
): InlineNode[] {
  if (!Node.isTemplateExpression(expr)) return [];

  const result: InlineNode[] = [];

  // Head text
  const head = expr.getHead();
  const headText = head.getLiteralText();
  if (headText) {
    result.push({ kind: 'text', value: headText });
  }

  // Template spans
  for (const span of expr.getTemplateSpans()) {
    // Expression in ${...}
    const spanExpr = span.getExpression();
    if (spanExpr) {
      if (Node.isPropertyAccessExpression(spanExpr)) {
        const inline = transformPropertyAccess(spanExpr, ctx);
        if (inline) result.push(inline);
      } else if (Node.isIdentifier(spanExpr)) {
        const varName = spanExpr.getText();

        // Check for component prop first
        if (ctx.componentProps && ctx.componentProps.has(varName)) {
          const propValue = ctx.componentProps.get(varName);
          if (propValue !== undefined && propValue !== null) {
            result.push({ kind: 'text', value: String(propValue) });
          }
        } else {
          // Check if it's a RuntimeVar
          const runtimeVar = ctx.runtimeVars.get(varName);
          if (runtimeVar) {
            // Emit shell variable syntax
            const value = `$${runtimeVar.varName}`;
            result.push({ kind: 'text', value });
          } else {
            result.push({ kind: 'text', value: varName });
          }
        }
      } else {
        // Other expression - render raw
        result.push({ kind: 'text', value: spanExpr.getText() });
      }
    }

    // Trailing text in this span
    const literal = span.getLiteral();
    const literalText = literal.getLiteralText();
    if (literalText) {
      result.push({ kind: 'text', value: literalText });
    }
  }

  return result;
}

// ============================================================================
// Inline Element Transformation
// ============================================================================

/**
 * Transform inline JSX element to InlineNode
 * Handles b, i, strong, em, code, a
 */
function transformRuntimeInlineElement(
  name: string,
  node: JsxElement,
  ctx: RuntimeTransformContext
): InlineNode {
  // Bold
  if (name === 'b' || name === 'strong') {
    return { kind: 'bold', children: transformRuntimeInlineChildren(node, ctx) };
  }

  // Italic
  if (name === 'i' || name === 'em') {
    return { kind: 'italic', children: transformRuntimeInlineChildren(node, ctx) };
  }

  // Inline code
  if (name === 'code') {
    // For code elements, we need to handle RuntimeVar interpolation too
    const children = node.getJsxChildren();
    const parts: string[] = [];

    for (const child of children) {
      if (Node.isJsxText(child)) {
        const text = child.getText();
        if (text) parts.push(text);
      } else if (Node.isJsxExpression(child)) {
        const expr = child.getExpression();
        if (expr) {
          if (Node.isStringLiteral(expr)) {
            parts.push(expr.getLiteralValue());
          } else if (Node.isPropertyAccessExpression(expr)) {
            const inline = transformPropertyAccess(expr, ctx);
            if (inline && inline.kind === 'text') {
              parts.push(inline.value);
            }
          } else {
            parts.push(expr.getText());
          }
        }
      }
    }

    return { kind: 'inlineCode', value: parts.join('') };
  }

  // Link
  if (name === 'a') {
    const href = getAttributeValue(node.getOpeningElement(), 'href');
    if (!href) {
      throw ctx.createError('<a> element requires href attribute', node);
    }
    const children = transformRuntimeInlineChildren(node, ctx);
    return { kind: 'link', url: href, children };
  }

  throw ctx.createError(`Unsupported inline element: <${name}>`, node);
}
