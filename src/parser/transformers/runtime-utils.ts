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
 * - Uses raw source text extraction to bypass JSX whitespace normalization
 * - Dedents by removing common leading whitespace (preserves relative indentation)
 * - Collapses 3+ consecutive blank lines to 2 (one blank line)
 * - Preserves leading/trailing newlines for block separation
 */
export function extractMarkdownText(node: Node): string {
  if (!Node.isJsxText(node)) return '';

  // CRITICAL: Use raw source text extraction to bypass JSX whitespace normalization
  // JSX normalizes whitespace (collapses newlines to spaces) but we need to preserve them
  // for markdown content. Extract directly from source file using positions.
  const sourceFile = node.getSourceFile();
  const text = sourceFile.getFullText().slice(node.getStart(), node.getEnd());

  // For single-line content, preserve as-is (inline text)
  // This ensures word-spacing is preserved (both leading " plan(s)" and trailing "word ")
  if (!text.includes('\n')) {
    return text;
  }

  // Split into lines for multi-line content
  const lines = text.split('\n');

  // Find minimum indentation (ignoring empty lines and the first line which may have no indent)
  let minIndent = Infinity;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length > 0) {
      // Skip first line for indent calculation - it follows the opening tag
      if (i === 0) continue;
      const leadingSpaces = line.match(/^[ \t]*/)?.[0].length ?? 0;
      minIndent = Math.min(minIndent, leadingSpaces);
    }
  }
  if (minIndent === Infinity) minIndent = 0;

  // Dedent all lines by the minimum indentation (except first line)
  const dedented = lines.map((line, i) => {
    if (line.trim().length === 0) return ''; // Preserve empty lines as empty
    if (i === 0) return line; // First line has no indent to strip
    return line.slice(minIndent);
  });

  // Join and collapse excessive blank lines (3+ newlines → 2 newlines)
  let result = dedented.join('\n').replace(/\n{3,}/g, '\n\n');

  // Remove ONLY the first newline after opening tag (not intentional blank lines)
  // Use [ \t]* instead of \s* to avoid matching multiple newlines
  result = result.replace(/^[ \t]*\n/, '');

  // Preserve trailing newline as content separator
  // (emitter will handle stripping final newline before closing tag)
  result = result.trimEnd();
  // Add back ONE trailing newline if there was content
  if (result) {
    result += '\n';
  }

  // If content is only whitespace, return empty string
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

// ============================================================================
// If/Else Sibling Lookahead
// ============================================================================

/**
 * Get the element name from a JSX element
 * Local helper for sibling processing
 */
function getJsxElementName(node: Node): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  if (Node.isJsxSelfClosingElement(node)) {
    return node.getTagNameNode().getText();
  }
  return '';
}

/**
 * Result of processing If/Else siblings
 */
export interface IfElseSiblingResult {
  /** Whether an Else sibling was found and processed */
  hasElse: boolean;
  /** The index to continue from (points past the Else if found, or at original position if not) */
  nextIndex: number;
}

/**
 * Process potential Else sibling after an If element
 *
 * This is a helper to DRY up the If/Else sibling lookahead pattern that appears
 * multiple times in runtime-dispatch.ts.
 *
 * @param jsxChildren - Array of JSX children being processed
 * @param ifIndex - Current index of the If element
 * @param onElseFound - Callback when Else sibling is found, receives the Else node
 * @returns Result with hasElse flag and nextIndex to continue from
 */
export function processIfElseSiblings(
  jsxChildren: Node[],
  ifIndex: number,
  onElseFound: (elseNode: Node) => void
): IfElseSiblingResult {
  let nextIndex = ifIndex + 1;

  while (nextIndex < jsxChildren.length) {
    const sibling = jsxChildren[nextIndex];

    // Skip whitespace-only text
    if (Node.isJsxText(sibling)) {
      const text = extractText(sibling);
      if (!text) {
        nextIndex++;
        continue;
      }
    }

    // Check if next non-whitespace is Else
    if (Node.isJsxElement(sibling) || Node.isJsxSelfClosingElement(sibling)) {
      const siblingName = getJsxElementName(sibling);
      if (siblingName === 'Else' || siblingName === 'V3Else') {
        onElseFound(sibling);
        return { hasElse: true, nextIndex };
      }
    }

    // Not an Else, break out
    break;
  }

  return { hasElse: false, nextIndex: ifIndex };
}
