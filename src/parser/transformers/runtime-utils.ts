/**
 * Runtime Transformer Utilities
 *
 * Helper functions for runtime transformers.
 */

import { Node, JsxOpeningElement, JsxSelfClosingElement, Expression, SyntaxKind } from 'ts-morph';
import type { RuntimeCallArgValue, RuntimeVarRefNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { parseRuntimeVarRef } from './runtime-var.js';

// ============================================================================
// Component Prop Expression Resolution
// ============================================================================

/**
 * Resolve an expression through componentPropExpressions
 *
 * When a composite component receives RuntimeVar props, the body references
 * them as plain identifiers (function parameters). This resolves those
 * identifiers back to the original usage-site expressions so that
 * parseRuntimeVarRef can recognize them.
 *
 * Already used by runtime-control.ts for <If condition={...}>.
 * This shared helper extends the pattern to SpawnAgent, RuntimeFn.Call, and AskUser.
 */
export function resolveExprThroughProps(
  expr: Expression,
  ctx: TransformContext
): Expression {
  if (Node.isIdentifier(expr) && ctx.componentPropExpressions) {
    const propName = expr.getText();
    const original = ctx.componentPropExpressions.get(propName);
    if (original) return original;
  }
  return expr;
}

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

    // Template literal: prop={`value`} or prop={`value ${var}`}
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

// isCustomComponent and BUILTIN_COMPONENTS are defined in shared.ts (single source of truth)
export { isCustomComponent } from './shared.js';

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
// RuntimeCall Argument Extraction
// ============================================================================

/**
 * Generate a human-readable description of an expression
 *
 * Used for ternary expressions, logical operators, and comparisons
 * that can't be directly resolved to a value.
 *
 * @example
 * ctx.flags.gaps ? 'gap_closure' : 'standard'
 * // Returns: "If ctx.flags.gaps then \"gap_closure\", otherwise \"standard\""
 *
 * @example
 * status === 'PASSED'
 * // Returns: "status equals \"PASSED\""
 */
export function describeExpression(expr: Expression, ctx: TransformContext): string {
  if (Node.isConditionalExpression(expr)) {
    // Ternary expression: cond ? then : else
    const condition = expr.getCondition();
    const whenTrue = expr.getWhenTrue();
    const whenFalse = expr.getWhenFalse();

    const condDesc = describeExpressionPart(condition, ctx);
    const trueVal = describeExpressionValue(whenTrue, ctx);
    const falseVal = describeExpressionValue(whenFalse, ctx);

    return `If ${condDesc} then ${trueVal}, otherwise ${falseVal}`;
  }

  if (Node.isBinaryExpression(expr)) {
    const left = expr.getLeft();
    const right = expr.getRight();
    const op = expr.getOperatorToken().getText();

    const leftDesc = describeExpressionPart(left, ctx);
    const rightDesc = describeExpressionValue(right, ctx);

    switch (op) {
      case '===':
      case '==':
        return `${leftDesc} equals ${rightDesc}`;
      case '!==':
      case '!=':
        return `${leftDesc} does not equal ${rightDesc}`;
      case '&&':
        return `${leftDesc} AND ${describeExpressionPart(right, ctx)}`;
      case '||':
        return `${leftDesc} OR ${describeExpressionPart(right, ctx)}`;
      case '>':
        return `${leftDesc} is greater than ${rightDesc}`;
      case '>=':
        return `${leftDesc} is at least ${rightDesc}`;
      case '<':
        return `${leftDesc} is less than ${rightDesc}`;
      case '<=':
        return `${leftDesc} is at most ${rightDesc}`;
      default:
        return expr.getText();
    }
  }

  if (Node.isPrefixUnaryExpression(expr)) {
    const opToken = expr.getOperatorToken();
    const operand = expr.getOperand();
    if (opToken === SyntaxKind.ExclamationToken) {
      return `NOT ${describeExpressionPart(operand, ctx)}`;
    }
  }

  return expr.getText();
}

/**
 * Describe a part of an expression (for conditions in ternaries)
 */
function describeExpressionPart(expr: Expression, ctx: TransformContext): string {
  // Check for RuntimeVar reference first
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    const path = ref.path.length === 0
      ? ref.varName
      : `${ref.varName}.${ref.path.join('.')}`;
    return path;
  }

  // Recursively describe binary expressions
  if (Node.isBinaryExpression(expr)) {
    return describeExpression(expr, ctx);
  }

  return expr.getText();
}

/**
 * Describe a value expression (for results of ternaries)
 */
function describeExpressionValue(expr: Expression, ctx: TransformContext): string {
  if (Node.isStringLiteral(expr)) {
    return `"${expr.getLiteralValue()}"`;
  }
  if (Node.isNumericLiteral(expr)) {
    return expr.getLiteralText();
  }
  if (Node.isTrueLiteral(expr)) {
    return 'true';
  }
  if (Node.isFalseLiteral(expr)) {
    return 'false';
  }
  if (Node.isNullLiteral(expr)) {
    return 'null';
  }

  // Check for RuntimeVar reference
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    const path = ref.path.length === 0
      ? ref.varName
      : `${ref.varName}.${ref.path.join('.')}`;
    return path;
  }

  return expr.getText();
}

/**
 * Extract a single RuntimeCall argument value
 *
 * Checks for RuntimeVar reference FIRST before falling back to literals.
 *
 * @returns RuntimeCallArgValue with proper type discrimination
 */
export function extractRuntimeCallArg(
  expr: Expression,
  ctx: TransformContext
): RuntimeCallArgValue {
  // Resolve identifier through component props before checking RuntimeVar
  expr = resolveExprThroughProps(expr, ctx);

  // Check for RuntimeVar reference FIRST (this is the key fix)
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    return { type: 'runtimeVarRef', ref };
  }

  // Literal values
  if (Node.isStringLiteral(expr)) {
    return { type: 'literal', value: expr.getLiteralValue() };
  }

  if (Node.isNumericLiteral(expr)) {
    return { type: 'literal', value: Number(expr.getLiteralText()) };
  }

  if (Node.isTrueLiteral(expr)) {
    return { type: 'literal', value: true };
  }

  if (Node.isFalseLiteral(expr)) {
    return { type: 'literal', value: false };
  }

  if (Node.isNullLiteral(expr)) {
    return { type: 'literal', value: null };
  }

  // Template literal (no substitution)
  if (Node.isNoSubstitutionTemplateLiteral(expr)) {
    return { type: 'literal', value: expr.getLiteralValue() };
  }

  // Template literal with substitution - convert RuntimeVars to shell format
  if (Node.isTemplateExpression(expr)) {
    return { type: 'literal', value: extractTemplateContentWithRuntimeVars(expr, ctx) };
  }

  // Nested object
  if (Node.isObjectLiteralExpression(expr)) {
    const nested: Record<string, RuntimeCallArgValue> = {};
    for (const prop of expr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName();
        const value = prop.getInitializer();
        if (value) {
          nested[name] = extractRuntimeCallArg(value, ctx);
        }
      }
    }
    return { type: 'json', value: nested };
  }

  // Array
  if (Node.isArrayLiteralExpression(expr)) {
    const items = expr.getElements().map(el => extractRuntimeCallArg(el, ctx));
    return { type: 'json', value: items };
  }

  // Unwrap parenthesized expressions for proper handling
  if (Node.isParenthesizedExpression(expr)) {
    return extractRuntimeCallArg(expr.getExpression(), ctx);
  }

  // Ternary with RuntimeVar condition - create structured conditional
  if (Node.isConditionalExpression(expr)) {
    const condition = expr.getCondition();
    const conditionRef = parseRuntimeVarRef(condition, ctx);

    if (conditionRef) {
      return {
        type: 'conditional',
        condition: conditionRef,
        whenTrue: extractRuntimeCallArg(expr.getWhenTrue(), ctx),
        whenFalse: extractRuntimeCallArg(expr.getWhenFalse(), ctx),
      };
    }
    // Fall through to expression type if condition is not a simple RuntimeVar
  }

  // Binary expressions, prefix unary, or complex conditionals - generate description
  if (Node.isConditionalExpression(expr) || Node.isBinaryExpression(expr) || Node.isPrefixUnaryExpression(expr)) {
    return {
      type: 'expression',
      source: expr.getText(),
      description: describeExpression(expr, ctx),
    };
  }

  // Unknown - treat as expression
  return {
    type: 'expression',
    source: expr.getText(),
    description: expr.getText(),
  };
}

/**
 * Extract RuntimeCall args from an object literal expression
 *
 * @param objExpr - Object literal expression from args prop
 * @param ctx - Transform context
 * @returns Record of argument name to RuntimeCallArgValue
 */
export function extractRuntimeCallArgs(
  objExpr: Expression,
  ctx: TransformContext
): Record<string, RuntimeCallArgValue> {
  if (!Node.isObjectLiteralExpression(objExpr)) {
    throw new Error('args must be an object literal');
  }

  const result: Record<string, RuntimeCallArgValue> = {};

  for (const prop of objExpr.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const value = prop.getInitializer();
      if (value) {
        result[name] = extractRuntimeCallArg(value, ctx);
      }
    } else if (Node.isShorthandPropertyAssignment(prop)) {
      // { foo } is equivalent to { foo: foo }
      const name = prop.getName();
      const nameNode = prop.getNameNode();
      result[name] = extractRuntimeCallArg(nameNode as unknown as Expression, ctx);
    }
  }

  return result;
}

// ============================================================================
// Array Extraction with RuntimeVar Support
// ============================================================================

/**
 * Get array items from a JSX attribute with RuntimeVar template support
 *
 * Handles:
 * - String literals: "item"
 * - Template literals with RuntimeVar interpolation: `cat ${ctx.phaseDir}/*`
 *
 * @param element - The JSX element
 * @param attrName - The attribute name
 * @param ctx - Transform context
 * @returns Array of strings with RuntimeVar references resolved to $VAR.path syntax
 */
export function getArrayWithRuntimeVars(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
  ctx: TransformContext
): string[] | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

  const results: string[] = [];
  for (const el of expr.getElements()) {
    if (Node.isStringLiteral(el)) {
      results.push(el.getLiteralValue());
    } else if (Node.isNoSubstitutionTemplateLiteral(el)) {
      results.push(el.getLiteralValue());
    } else if (Node.isTemplateExpression(el)) {
      const parts: string[] = [];
      parts.push(el.getHead().getLiteralText());
      for (const span of el.getTemplateSpans()) {
        const spanExpr = span.getExpression();
        const ref = parseRuntimeVarRef(spanExpr, ctx);
        if (ref) {
          const pathStr = ref.path.length === 0
            ? ''
            : ref.path.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
          parts.push(`$${ref.varName}${pathStr}`);
        } else {
          parts.push(`\${${spanExpr.getText()}}`);
        }
        parts.push(span.getLiteral().getLiteralText());
      }
      results.push(parts.join(''));
    }
  }
  return results.length > 0 ? results : undefined;
}

/**
 * Extract template literal content with RuntimeVar interpolation
 * Converts RuntimeVar references to {$VARNAME.path} format for readability
 */
export function extractTemplateContentWithRuntimeVars(
  expr: import('ts-morph').TemplateExpression,
  ctx: TransformContext
): string {
  const parts: string[] = [];
  parts.push(expr.getHead().getLiteralText());

  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    const ref = parseRuntimeVarRef(spanExpr, ctx);
    if (ref) {
      const pathStr = ref.path.length === 0
        ? ''
        : ref.path.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
      parts.push(`{$${ref.varName}${pathStr}}`);
    } else {
      // Preserve as shell variable syntax for non-RuntimeVar expressions
      parts.push(`\${${spanExpr.getText()}}`);
    }
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
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
