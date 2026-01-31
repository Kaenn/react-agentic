/**
 * Markdown transformation module
 *
 * Handles transformMarkdown, transformXmlBlock, transformCustomComponent
 * and related helper functions for markdown content and XML blocks.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxFragment, TemplateExpression, BinaryExpression, PropertyAccessExpression, ArrowFunction, FunctionExpression, FunctionDeclaration } from 'ts-morph';
import type { BlockNode, XmlBlockNode, GroupNode } from '../../ir/index.js';
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
 * transpile time. Supports props (string, number, boolean), children, and fragments.
 */
export function transformCustomComponent(
  name: string,
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): BlockNode | null {
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

  // Import functions from dispatch/html to avoid circular dependency
  const { transformToBlock, transformBlockChildren } = require('./dispatch.js');
  const { transformFragmentChildren } = require('./html.js');

  // Extract props from usage site
  const props = extractPropsFromUsage(node);

  // Extract children from usage site (if JsxElement with children)
  let childrenBlocks: BlockNode[] | null = null;
  if (Node.isJsxElement(node)) {
    const jsxChildren = node.getJsxChildren();
    // Check if there's any meaningful content
    const hasContent = jsxChildren.some(child => {
      if (Node.isJsxText(child)) {
        return child.getText().trim().length > 0;
      }
      return true;
    });
    if (hasContent) {
      childrenBlocks = transformBlockChildren(jsxChildren, ctx);
    }
  }

  // Save and set context for prop/children substitution
  const previousProps = ctx.componentProps;
  const previousChildren = ctx.componentChildren;
  ctx.componentProps = props;
  ctx.componentChildren = childrenBlocks;

  let result: BlockNode | null = null;

  // Transform the resolved JSX
  if (Node.isJsxFragment(resolved.jsx)) {
    // Fragment: transform children and wrap in GroupNode if multiple blocks
    const blocks = transformFragmentChildren(resolved.jsx, ctx);
    if (blocks.length === 0) {
      result = null;
    } else if (blocks.length === 1) {
      result = blocks[0];
    } else {
      // Return all blocks wrapped in GroupNode (tight spacing in emitter)
      result = { kind: 'group', children: blocks } as GroupNode;
    }
  } else {
    // Single element or self-closing
    result = transformToBlock(resolved.jsx, ctx);
  }

  // Restore context
  ctx.componentProps = previousProps;
  ctx.componentChildren = previousChildren;
  ctx.sourceFile = previousSourceFile;

  return result;
}

/**
 * Extract props from component usage site
 *
 * Handles:
 * - prop="value" -> { prop: "value" }
 * - prop={123} -> { prop: 123 }
 * - prop={true} -> { prop: true }
 * - prop (no value) -> { prop: true }
 */
function extractPropsFromUsage(
  node: JsxElement | JsxSelfClosingElement
): Map<string, unknown> {
  const props = new Map<string, unknown>();
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  for (const attr of opening.getAttributes()) {
    if (!Node.isJsxAttribute(attr)) continue;

    const name = attr.getNameNode().getText();
    const init = attr.getInitializer();

    if (!init) {
      // Boolean shorthand: <Component enabled />
      props.set(name, true);
    } else if (Node.isStringLiteral(init)) {
      props.set(name, init.getLiteralValue());
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr) {
        if (Node.isNumericLiteral(expr)) {
          props.set(name, Number(expr.getLiteralValue()));
        } else if (expr.getText() === 'true') {
          props.set(name, true);
        } else if (expr.getText() === 'false') {
          props.set(name, false);
        } else if (Node.isStringLiteral(expr)) {
          props.set(name, expr.getLiteralValue());
        }
      }
    }
  }

  return props;
}

/**
 * Extract prop names from arrow function or function expression parameters
 */
function extractPropNames(fn: ArrowFunction | FunctionExpression): string[] {
  const params = fn.getParameters();
  if (params.length === 0) return [];

  const firstParam = params[0];
  const bindingName = firstParam.getNameNode();

  // Destructured: ({ title, count, children }) => ...
  if (Node.isObjectBindingPattern(bindingName)) {
    return bindingName.getElements().map(el => el.getName());
  }

  // Simple: (props) => ...
  return [firstParam.getName()];
}

/**
 * Extract prop names from function declaration parameters
 */
function extractFunctionPropNames(fn: FunctionDeclaration): string[] {
  const params = fn.getParameters();
  if (params.length === 0) return [];

  const firstParam = params[0];
  const bindingName = firstParam.getNameNode();

  // Destructured: function Foo({ title }) { ... }
  if (Node.isObjectBindingPattern(bindingName)) {
    return bindingName.getElements().map(el => el.getName());
  }

  // Simple: function Foo(props) { ... }
  return [firstParam.getName()];
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
