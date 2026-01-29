/**
 * Markdown transformation module
 *
 * Handles transformMarkdown, transformXmlBlock, transformCustomComponent
 * and related helper functions for markdown content and XML blocks.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxFragment, TemplateExpression, BinaryExpression, PropertyAccessExpression } from 'ts-morph';
import type { BlockNode, XmlBlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getAttributeValue, resolveComponentImport } from '../utils/index.js';
import { isValidXmlName } from './shared.js';

/**
 * Transform XmlBlock component to XmlBlockNode IR
 */
export function transformXmlBlock(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): XmlBlockNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get required name attribute
  const nameAttr = getAttributeValue(openingElement, 'name');
  if (!nameAttr) {
    throw ctx.createError('XmlBlock requires name prop', node);
  }

  // Validate XML name
  if (!isValidXmlName(nameAttr)) {
    throw ctx.createError(
      `Invalid XML tag name '${nameAttr}' - must start with letter/underscore, contain only letters, digits, underscores, hyphens, or periods, and not start with 'xml'`,
      node
    );
  }

  // Import transformBlockChildren from dispatch to avoid circular dependency
  const { transformBlockChildren } = require('./dispatch.js');

  // Transform children as blocks (with If/Else sibling detection)
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'xmlBlock',
    name: nameAttr,
    children,
  };
}

/**
 * Transform Markdown component to raw content
 */
export function transformMarkdown(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): BlockNode {
  if (Node.isJsxSelfClosingElement(node)) {
    // Self-closing <Markdown /> - empty content
    return { kind: 'raw', content: '' };
  }

  // Extract raw content from children
  // JSX strips whitespace after expressions, so we need to detect and restore it
  //
  // In markdown, we need to preserve:
  // - Newlines before section headers (## )
  // - Newlines between paragraphs/blocks
  // - Spaces between inline elements
  const parts: string[] = [];
  const jsxChildren = node.getJsxChildren();

  for (let i = 0; i < jsxChildren.length; i++) {
    const child = jsxChildren[i];
    const prev = parts[parts.length - 1];

    if (Node.isJsxText(child)) {
      let text = child.getText();

      // Empty text between two expressions likely had a newline that JSX stripped
      // We restore it as a newline (inside code blocks, between list items, etc.)
      if (text === '' && i > 0 && i < jsxChildren.length - 1) {
        const prevChild = jsxChildren[i - 1];
        const nextChild = jsxChildren[i + 1];
        if (Node.isJsxExpression(prevChild) && Node.isJsxExpression(nextChild)) {
          // Two adjacent expressions had whitespace between them that was stripped
          parts.push('\n');
          continue;
        }
      }

      // Check if we need to restore stripped whitespace before this text
      // JSX eats leading whitespace from text following an expression
      if (prev && !/\s$/.test(prev) && !/^\s/.test(text) && text !== '') {
        // Detect what kind of whitespace was likely stripped:
        // - If text starts with ## (heading), add double newline
        // - If text starts with ``` (code fence), add double newline
        // - If text starts with ** (bold), add newline (often a new paragraph)
        // - If text starts with - or * or digit. (list item), add newline
        // - For | (table), only add newline if prev ends with | (new row)
        //   Otherwise it's a cell separator, just needs space
        // - Otherwise add space
        if (/^#{1,6}\s/.test(text) || /^```/.test(text)) {
          parts.push('\n\n');
        } else if (/^\*\*/.test(text)) {
          // Bold at start of line usually means new paragraph or list item
          parts.push('\n');
        } else if (/^[-*]\s/.test(text) || /^\d+\.\s/.test(text)) {
          parts.push('\n');
        } else if (/^[|]/.test(text)) {
          // Table pipe: if previous content ended with | it's a new row
          // Otherwise it's a cell separator (just needs space)
          if (/[|]\s*$/.test(prev)) {
            parts.push('\n');
          } else {
            parts.push(' ');
          }
        } else if (!/^[.,;:!?)}\]>`"'/]/.test(text)) {
          parts.push(' ');
        }
      }

      parts.push(text);
    } else if (Node.isJsxExpression(child)) {
      // Handle {variable} or {"literal"} or {`template`} expressions
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          // String literal: {"text"} -> text
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          // Template literal without substitutions: {`text`} -> text
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          // Template expression with substitutions: {`text ${var} more`}
          // Reconstruct the template by joining head, spans, and tail
          let result = expr.getHead().getLiteralText();
          for (const span of expr.getTemplateSpans()) {
            // Get the expression between ${...}
            const spanExpr = span.getExpression();
            // Try to get static value, otherwise use ${expr}
            if (Node.isIdentifier(spanExpr)) {
              result += `\${${spanExpr.getText()}}`;
            } else if (Node.isStringLiteral(spanExpr)) {
              result += spanExpr.getLiteralValue();
            } else {
              // For complex expressions, preserve the ${...} syntax
              result += `\${${spanExpr.getText()}}`;
            }
            // Add the literal text after the expression
            const literal = span.getLiteral();
            if (Node.isTemplateMiddle(literal)) {
              result += literal.getLiteralText();
            } else if (Node.isTemplateTail(literal)) {
              result += literal.getLiteralText();
            }
          }
          parts.push(result);
        } else if (Node.isIdentifier(expr)) {
          // Identifier expression: {var} was likely ${var} in bash
          // JSX splits ${var} into "$" + {var}, so reconstruct as {var}
          // which preserves the intent for code blocks
          parts.push(`{${expr.getText()}}`);
        } else if (Node.isBinaryExpression(expr)) {
          // Binary expression: string concatenation like `text ` + var + ` more`
          const concat = evaluateStringConcatenation(expr, ctx);
          if (concat !== null) {
            parts.push(concat);
          }
        } else if (Node.isPropertyAccessExpression(expr)) {
          // Property access: obj.prop (like AGENT_PATHS.researcher)
          // Try to resolve the value from a const declaration
          const value = resolvePropertyAccess(expr);
          if (value !== null) {
            parts.push(value);
          }
        }
        // Other expressions (function calls, etc.) cannot be evaluated at transpile time
      }
    }
  }

  // Trim outer boundaries, preserve internal whitespace
  const content = parts.join('').trim();

  return { kind: 'raw', content };
}

/**
 * Transform a custom component by resolving its import and inlining its JSX
 *
 * Custom components are user-defined TSX fragments that get inlined at
 * transpile time. Component props are NOT supported in v1 - only parameterless
 * composition.
 */
export function transformCustomComponent(
  name: string,
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): BlockNode | null {
  // Validate no props on the component (v1 limitation)
  const openingElement = Node.isJsxElement(node) ? node.getOpeningElement() : node;
  const attributes = openingElement.getAttributes();
  if (attributes.length > 0) {
    throw ctx.createError(`Component props not supported: <${name}> has ${attributes.length} prop(s)`, node);
  }

  // Require source file for component resolution
  if (!ctx.sourceFile) {
    throw ctx.createError(
      `Cannot resolve component '${name}': no source file context. ` +
      `Pass sourceFile to transformer.transform() for component composition.`,
      node
    );
  }

  // Resolve the component import
  const resolved = resolveComponentImport(name, ctx.sourceFile, ctx.visitedPaths);

  // Update visited paths for nested resolution
  ctx.visitedPaths = resolved.visitedPaths;

  // Save current sourceFile and set to component's sourceFile for nested resolution
  const previousSourceFile = ctx.sourceFile;
  ctx.sourceFile = resolved.sourceFile;

  // Import transformToBlock from dispatch to avoid circular dependency
  const { transformToBlock } = require('./dispatch.js');
  const { transformFragmentChildren } = require('./html.js');

  let result: BlockNode | null = null;

  // Transform the resolved JSX
  if (Node.isJsxFragment(resolved.jsx)) {
    // Fragment: transform children and return first block
    // (multiple root blocks from a component isn't fully supported - take first)
    const blocks = transformFragmentChildren(resolved.jsx, ctx);
    result = blocks[0] ?? null;
  } else {
    // Single element or self-closing
    result = transformToBlock(resolved.jsx, ctx);
  }

  // Restore sourceFile
  ctx.sourceFile = previousSourceFile;

  return result;
}

/**
 * Evaluate a binary expression that represents string concatenation.
 * Handles chains like: `text ` + AGENT_PATHS.researcher + ` more`
 * Returns the concatenated string or null if not evaluable.
 */
function evaluateStringConcatenation(expr: BinaryExpression, ctx: TransformContext): string | null {
  const operator = expr.getOperatorToken().getText();
  if (operator !== '+') {
    return null;
  }

  const left = expr.getLeft();
  const right = expr.getRight();

  const leftValue = evaluateStringExpression(left, ctx);
  const rightValue = evaluateStringExpression(right, ctx);

  if (leftValue === null || rightValue === null) {
    return null;
  }

  return leftValue + rightValue;
}

/**
 * Evaluate an expression that should resolve to a string value.
 * Handles: string literals, template literals, property access, binary expressions.
 */
function evaluateStringExpression(expr: Node, ctx: TransformContext): string | null {
  if (Node.isStringLiteral(expr)) {
    return expr.getLiteralValue();
  }
  if (Node.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.getLiteralValue();
  }
  if (Node.isTemplateExpression(expr)) {
    // Template expression with substitutions - get the literal text
    let result = expr.getHead().getLiteralText();
    for (const span of expr.getTemplateSpans()) {
      const spanExpr = span.getExpression();
      // Try to evaluate the span expression
      const spanValue = evaluateStringExpression(spanExpr, ctx);
      if (spanValue !== null) {
        result += spanValue;
      } else if (Node.isIdentifier(spanExpr)) {
        result += `\${${spanExpr.getText()}}`;
      } else {
        result += `\${${spanExpr.getText()}}`;
      }
      const literal = span.getLiteral();
      if (Node.isTemplateMiddle(literal)) {
        result += literal.getLiteralText();
      } else if (Node.isTemplateTail(literal)) {
        result += literal.getLiteralText();
      }
    }
    return result;
  }
  if (Node.isPropertyAccessExpression(expr)) {
    return resolvePropertyAccess(expr);
  }
  if (Node.isBinaryExpression(expr)) {
    return evaluateStringConcatenation(expr, ctx);
  }
  if (Node.isParenthesizedExpression(expr)) {
    return evaluateStringExpression(expr.getExpression(), ctx);
  }

  return null;
}

/**
 * Resolve a property access expression (e.g., AGENT_PATHS.researcher) to its value.
 * Only works for const declarations with object literals.
 */
function resolvePropertyAccess(expr: PropertyAccessExpression): string | null {
  const objectExpr = expr.getExpression();
  const propertyName = expr.getName();

  if (!Node.isIdentifier(objectExpr)) {
    return null;
  }

  const objectName = objectExpr.getText();

  // Find the variable declaration in the source file
  const sourceFile = expr.getSourceFile();
  const varDecls = sourceFile.getVariableDeclarations();

  for (const varDecl of varDecls) {
    if (varDecl.getName() === objectName) {
      let initializer = varDecl.getInitializer();
      // Unwrap AsExpression (from "as const" syntax)
      if (initializer && Node.isAsExpression(initializer)) {
        initializer = initializer.getExpression();
      }
      if (initializer && Node.isObjectLiteralExpression(initializer)) {
        // Look for the property in the object literal
        for (const prop of initializer.getProperties()) {
          if (Node.isPropertyAssignment(prop) && prop.getName() === propertyName) {
            const propInit = prop.getInitializer();
            if (propInit && Node.isStringLiteral(propInit)) {
              return propInit.getLiteralValue();
            }
            if (propInit && Node.isNoSubstitutionTemplateLiteral(propInit)) {
              return propInit.getLiteralValue();
            }
          }
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Extract text from a template expression, converting ${var} to {var}
 * This preserves GSD's {variable} placeholder syntax
 */
export function extractTemplateText(expr: TemplateExpression): string {
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
