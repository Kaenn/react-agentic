/**
 * Runtime Transformer Utilities
 *
 * Helper functions for runtime transformers.
 */

import { Node, JsxOpeningElement, JsxSelfClosingElement, Expression } from 'ts-morph';

// ============================================================================
// Attribute Extraction
// ============================================================================

/**
 * Get the string value of a JSX attribute
 *
 * Handles:
 * - prop="value" -> "value"
 * - prop={'value'} -> "value"
 * - prop={123} -> "123"
 *
 * @returns String value or undefined if not found/not string
 */
export function getAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): string | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init) return undefined;

  // String literal: prop="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: prop={value}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) return undefined;

    // String literal in expression: prop={'value'}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Numeric literal: prop={123}
    if (Node.isNumericLiteral(expr)) {
      return expr.getLiteralText();
    }

    // Template literal: prop={`value`}
    if (Node.isTemplateExpression(expr) || Node.isNoSubstitutionTemplateLiteral(expr)) {
      return expr.getText().slice(1, -1); // Remove backticks
    }
  }

  return undefined;
}

/**
 * Get the raw expression from a JSX attribute
 *
 * Returns the expression node for complex values like:
 * - prop={ctx.error}
 * - prop={!ctx.done}
 * - prop={{ key: value }}
 *
 * @returns Expression node or undefined if not found
 */
export function getAttributeExpression(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): Expression | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;

  return init.getExpression();
}

/**
 * Get object literal from a JSX attribute
 *
 * For props like: prop={{ key: 'value', other: 123 }}
 *
 * @returns Record of property name -> value node
 */
export function getAttributeObject(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): Map<string, Expression> | undefined {
  const expr = getAttributeExpression(element, attrName);
  if (!expr || !Node.isObjectLiteralExpression(expr)) return undefined;

  const result = new Map<string, Expression>();

  for (const prop of expr.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const value = prop.getInitializer();
      if (value) {
        result.set(name, value);
      }
    } else if (Node.isShorthandPropertyAssignment(prop)) {
      // { foo } is equivalent to { foo: foo }
      const name = prop.getName();
      const nameNode = prop.getNameNode();
      result.set(name, nameNode as unknown as Expression);
    }
  }

  return result;
}

/**
 * Get array literal from a JSX attribute
 *
 * For props like: prop={[item1, item2]}
 *
 * @returns Array of expression nodes
 */
export function getAttributeArray(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): Expression[] | undefined {
  const expr = getAttributeExpression(element, attrName);
  if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

  return expr.getElements();
}

/**
 * Get string array from a JSX attribute
 *
 * For props like: prop={["item1", "item2"]}
 *
 * @returns Array of strings
 */
export function getStringArrayAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): string[] | undefined {
  const elements = getAttributeArray(element, attrName);
  if (!elements) return undefined;

  const strings: string[] = [];
  for (const el of elements) {
    if (Node.isStringLiteral(el)) {
      strings.push(el.getLiteralValue());
    }
  }

  return strings.length > 0 ? strings : undefined;
}

// ============================================================================
// Element Helpers
// ============================================================================

/**
 * Get the tag name of a JSX element
 */
export function getElementName(
  node: Node
): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  if (Node.isJsxSelfClosingElement(node)) {
    return node.getTagNameNode().getText();
  }
  return '';
}

/**
 * Check if a name looks like a custom component (PascalCase)
 */
export function isCustomComponent(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/**
 * Extract text content from a JSX text node
 *
 * Normalizes whitespace:
 * - Collapses multiple whitespace to single space
 * - Trims leading/trailing whitespace
 */
export function extractText(node: Node): string {
  if (!Node.isJsxText(node)) return '';

  const text = node.getText();

  // Collapse whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Extract markdown text from a JSX text node, preserving line breaks
 *
 * For markdown content where line breaks are meaningful:
 * - Dedents by removing common leading whitespace (preserves relative indentation)
 * - Collapses 3+ consecutive blank lines to 2 (one blank line)
 * - Preserves leading/trailing newlines for block separation
 */
export function extractMarkdownText(node: Node): string {
  if (!Node.isJsxText(node)) return '';

  // Use getFullText to include leading trivia (preserves leading whitespace/newlines)
  const text = node.getFullText();

  // For single-line content, preserve as-is (inline text)
  // This ensures word-spacing is preserved (both leading " plan(s)" and trailing "word ")
  if (!text.includes('\n')) {
    return text;
  }

  // Split into lines for multi-line content
  const lines = text.split('\n');

  // Find minimum indentation (ignoring empty lines)
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim().length > 0) {
      const leadingSpaces = line.match(/^[ \t]*/)?.[0].length ?? 0;
      minIndent = Math.min(minIndent, leadingSpaces);
    }
  }
  if (minIndent === Infinity) minIndent = 0;

  // Dedent all lines by the minimum indentation
  const dedented = lines.map(line => {
    if (line.trim().length === 0) return ''; // Preserve empty lines as empty
    return line.slice(minIndent);
  });

  // Join and collapse excessive blank lines (3+ newlines → 2 newlines)
  const result = dedented.join('\n').replace(/\n{3,}/g, '\n\n');

  // If content is only whitespace, return empty string
  // Note: Newline handling between JSX expressions is done in transformRuntimeMixedChildren
  if (!result.trim()) return '';

  return result;
}

// ============================================================================
// String Utilities
// ============================================================================

/**
 * Convert camelCase to kebab-case
 *
 * @example
 * camelToKebab('allowedTools') // 'allowed-tools'
 * camelToKebab('argumentHint') // 'argument-hint'
 * camelToKebab('name') // 'name'
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ============================================================================
// Value Extraction
// ============================================================================

/**
 * Extract a JSON-serializable value from an expression
 *
 * Handles:
 * - String literals
 * - Numeric literals
 * - Boolean literals
 * - Object literals (shallow)
 * - Array literals (shallow)
 */
export function extractJsonValue(expr: Expression): unknown {
  if (Node.isStringLiteral(expr)) {
    return expr.getLiteralValue();
  }

  if (Node.isNumericLiteral(expr)) {
    return Number(expr.getLiteralText());
  }

  if (Node.isTrueLiteral(expr)) {
    return true;
  }

  if (Node.isFalseLiteral(expr)) {
    return false;
  }

  if (Node.isNullLiteral(expr)) {
    return null;
  }

  if (Node.isObjectLiteralExpression(expr)) {
    const result: Record<string, unknown> = {};
    for (const prop of expr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName();
        const value = prop.getInitializer();
        if (value) {
          result[name] = extractJsonValue(value);
        }
      }
    }
    return result;
  }

  if (Node.isArrayLiteralExpression(expr)) {
    return expr.getElements().map(el => extractJsonValue(el));
  }

  // Template literal
  if (Node.isNoSubstitutionTemplateLiteral(expr)) {
    return expr.getLiteralValue();
  }

  // Unknown - return as string representation
  return expr.getText();
}
