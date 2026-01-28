/**
 * V3 Control Flow Transformers
 *
 * Transforms V3 control flow components to IR nodes:
 * - V3If -> V3IfNode (with V3Condition tree)
 * - V3Else -> V3ElseNode
 * - V3Loop -> V3LoopNode
 * - Break -> BreakNode
 * - Return -> ReturnNode
 */

import { Node, JsxElement, JsxSelfClosingElement, SyntaxKind } from 'ts-morph';
import type {
  V3IfNode,
  V3ElseNode,
  V3LoopNode,
  BreakNode,
  ReturnNode,
  V3Condition,
  V3BlockNode,
} from '../../ir/index.js';
import type { V3TransformContext } from './types.js';
import { parseScriptVarRef } from './script-var.js';
import { getAttributeValue, getAttributeExpression } from './utils.js';

// ============================================================================
// Condition Parsing
// ============================================================================

/**
 * Parse a JSX expression to a V3Condition tree
 *
 * Handles:
 * - ctx.error -> { type: 'ref', ref: ScriptVarRefNode }
 * - !ctx.error -> { type: 'not', operand: ... }
 * - ctx.a && ctx.b -> { type: 'and', left: ..., right: ... }
 * - ctx.status === 'DONE' -> { type: 'eq', left: ..., right: 'DONE' }
 */
export function parseConditionExpression(
  node: Node,
  ctx: V3TransformContext
): V3Condition {
  // Handle prefix unary expression (!expr)
  if (Node.isPrefixUnaryExpression(node)) {
    const operatorText = node.getOperatorToken();
    // Check for logical NOT (!)
    if (operatorText === SyntaxKind.ExclamationToken) {
      const operand = node.getOperand();
      return {
        type: 'not',
        operand: parseConditionExpression(operand, ctx),
      };
    }
  }

  // Handle binary expressions (&&, ||, ===, !==)
  if (Node.isBinaryExpression(node)) {
    const left = node.getLeft();
    const right = node.getRight();
    const operatorToken = node.getOperatorToken();
    const operatorText = operatorToken.getText();

    // Logical AND
    if (operatorText === '&&') {
      return {
        type: 'and',
        left: parseConditionExpression(left, ctx),
        right: parseConditionExpression(right, ctx),
      };
    }

    // Logical OR
    if (operatorText === '||') {
      return {
        type: 'or',
        left: parseConditionExpression(left, ctx),
        right: parseConditionExpression(right, ctx),
      };
    }

    // Equality (===, ==)
    if (operatorText === '===' || operatorText === '==') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (rightValue !== undefined) {
        return {
          type: 'eq',
          left: leftCond,
          right: rightValue,
        };
      }
    }

    // Inequality (!==, !=)
    if (operatorText === '!==' || operatorText === '!=') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (rightValue !== undefined) {
        return {
          type: 'neq',
          left: leftCond,
          right: rightValue,
        };
      }
    }

    // Greater than (>)
    if (operatorText === '>') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (typeof rightValue === 'number') {
        return {
          type: 'gt',
          left: leftCond,
          right: rightValue,
        };
      }
    }

    // Greater than or equal (>=)
    if (operatorText === '>=') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (typeof rightValue === 'number') {
        return {
          type: 'gte',
          left: leftCond,
          right: rightValue,
        };
      }
    }

    // Less than (<)
    if (operatorText === '<') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (typeof rightValue === 'number') {
        return {
          type: 'lt',
          left: leftCond,
          right: rightValue,
        };
      }
    }

    // Less than or equal (<=)
    if (operatorText === '<=') {
      const leftCond = parseConditionExpression(left, ctx);
      const rightValue = extractLiteralValue(right);
      if (typeof rightValue === 'number') {
        return {
          type: 'lte',
          left: leftCond,
          right: rightValue,
        };
      }
    }
  }

  // Handle parenthesized expressions
  if (Node.isParenthesizedExpression(node)) {
    return parseConditionExpression(node.getExpression(), ctx);
  }

  // Handle boolean literals
  if (Node.isTrueLiteral(node)) {
    return { type: 'literal', value: true };
  }
  if (Node.isFalseLiteral(node)) {
    return { type: 'literal', value: false };
  }

  // Handle property access (ctx.error) or identifier (ctx)
  const ref = parseScriptVarRef(node, ctx);
  if (ref) {
    return { type: 'ref', ref };
  }

  // Unknown expression - throw error
  throw ctx.createError(
    `Cannot parse condition expression: ${node.getText()}. ` +
    'V3 conditions must use ScriptVar references.',
    node
  );
}

/**
 * Extract a literal value from a node
 */
function extractLiteralValue(node: Node): string | number | boolean | undefined {
  if (Node.isStringLiteral(node)) {
    return node.getLiteralValue();
  }
  if (Node.isNumericLiteral(node)) {
    return Number(node.getLiteralText());
  }
  if (Node.isTrueLiteral(node)) {
    return true;
  }
  if (Node.isFalseLiteral(node)) {
    return false;
  }
  return undefined;
}

// ============================================================================
// V3If Transformer
// ============================================================================

/**
 * Transform V3If component to V3IfNode
 */
export function transformV3If(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext,
  transformChildren: (node: JsxElement, ctx: V3TransformContext) => V3BlockNode[]
): V3IfNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract condition prop (required)
  const conditionExpr = getAttributeExpression(openingElement, 'condition');
  if (!conditionExpr) {
    throw ctx.createError('V3If requires condition prop', openingElement);
  }

  // Parse condition to V3Condition tree
  const condition = parseConditionExpression(conditionExpr, ctx);

  // Transform children
  const children = Node.isJsxElement(node)
    ? transformChildren(node, ctx)
    : [];

  return {
    kind: 'v3If',
    condition,
    children,
  };
}

// ============================================================================
// V3Else Transformer
// ============================================================================

/**
 * Transform V3Else component to V3ElseNode
 */
export function transformV3Else(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext,
  transformChildren: (node: JsxElement, ctx: V3TransformContext) => V3BlockNode[]
): V3ElseNode {
  const children = Node.isJsxElement(node)
    ? transformChildren(node, ctx)
    : [];

  return {
    kind: 'v3Else',
    children,
  };
}

// ============================================================================
// V3Loop Transformer
// ============================================================================

/**
 * Transform V3Loop component to V3LoopNode
 */
export function transformV3Loop(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext,
  transformChildren: (node: JsxElement, ctx: V3TransformContext) => V3BlockNode[]
): V3LoopNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract max prop (required)
  const maxStr = getAttributeValue(openingElement, 'max');
  if (!maxStr) {
    throw ctx.createError('V3Loop requires max prop', openingElement);
  }

  const max = parseInt(maxStr, 10);
  if (isNaN(max) || max < 1) {
    throw ctx.createError('V3Loop max must be a positive integer', openingElement);
  }

  // Extract optional counter prop
  let counterVar: string | undefined;
  const counterExpr = getAttributeExpression(openingElement, 'counter');
  if (counterExpr) {
    const ref = parseScriptVarRef(counterExpr, ctx);
    if (!ref) {
      throw ctx.createError(
        'V3Loop counter must be a useRuntimeVar reference',
        counterExpr
      );
    }
    counterVar = ref.varName;
  }

  // Transform children
  const children = Node.isJsxElement(node)
    ? transformChildren(node, ctx)
    : [];

  return {
    kind: 'v3Loop',
    max,
    counterVar,
    children,
  };
}

// ============================================================================
// Break Transformer
// ============================================================================

/**
 * Transform Break component to BreakNode
 */
export function transformBreak(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): BreakNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const message = getAttributeValue(openingElement, 'message');

  return {
    kind: 'break',
    message,
  };
}

// ============================================================================
// Return Transformer
// ============================================================================

/**
 * Transform Return component to ReturnNode
 */
export function transformReturn(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): ReturnNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const status = getAttributeValue(openingElement, 'status') as ReturnNode['status'];
  const message = getAttributeValue(openingElement, 'message');

  // Validate status if provided
  if (status) {
    const validStatuses = ['SUCCESS', 'BLOCKED', 'NOT_FOUND', 'ERROR', 'CHECKPOINT'];
    if (!validStatuses.includes(status)) {
      throw ctx.createError(
        `Invalid return status: ${status}. Must be one of: ${validStatuses.join(', ')}`,
        openingElement
      );
    }
  }

  return {
    kind: 'return',
    status,
    message,
  };
}
