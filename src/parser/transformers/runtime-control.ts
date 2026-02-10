/**
 * Runtime Control Flow Transformers
 *
 * Transforms runtime control flow components to IR nodes:
 * - If -> IfNode (with Condition tree)
 * - Else -> ElseNode
 * - Loop -> LoopNode
 * - Break -> BreakNode
 * - Return -> ReturnNode
 */

import { Node, JsxElement, JsxSelfClosingElement, SyntaxKind } from 'ts-morph';
import type {
  IfNode,
  ElseNode,
  LoopNode,
  BreakNode,
  ReturnNode,
  Condition,
  BlockNode,
} from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { parseRuntimeVarRef } from './runtime-var.js';
import { getAttributeValue, getAttributeExpression } from './runtime-utils.js';

// ============================================================================
// Condition Parsing
// ============================================================================

/**
 * Parse a JSX expression to a Condition tree
 *
 * Handles:
 * - ctx.error -> { type: 'ref', ref: RuntimeVarRefNode }
 * - !ctx.error -> { type: 'not', operand: ... }
 * - ctx.a && ctx.b -> { type: 'and', left: ..., right: ... }
 * - ctx.status === 'DONE' -> { type: 'eq', left: ..., right: 'DONE' }
 */
export function parseConditionExpression(
  node: Node,
  ctx: TransformContext
): Condition {
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
  const ref = parseRuntimeVarRef(node, ctx);
  if (ref) {
    return { type: 'ref', ref };
  }

  // Check if this is a prop identifier that can be resolved via componentPropExpressions
  // This handles composites like: <If condition={condition}/> where condition is a prop
  if (Node.isIdentifier(node) && ctx.componentPropExpressions) {
    const propName = node.getText();
    const originalExpr = ctx.componentPropExpressions.get(propName);
    if (originalExpr) {
      // Recursively parse the original expression
      return parseConditionExpression(originalExpr, ctx);
    }
  }

  // Unknown expression - throw error
  throw ctx.createError(
    `Cannot parse condition expression: ${node.getText()}. ` +
    'Conditions must use RuntimeVar references.',
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
// RuntimeIf Transformer
// ============================================================================

/**
 * Transform RuntimeIf component to IfNode
 */
export function transformRuntimeIf(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  transformChildren: (node: JsxElement, ctx: TransformContext) => BlockNode[]
): IfNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract condition prop (required)
  const conditionExpr = getAttributeExpression(openingElement, 'condition');
  if (!conditionExpr) {
    throw ctx.createError('If requires condition prop', openingElement);
  }

  // Parse condition to Condition tree
  const condition = parseConditionExpression(conditionExpr, ctx);

  // Transform children
  const children = Node.isJsxElement(node)
    ? transformChildren(node, ctx)
    : [];

  return {
    kind: 'if',
    condition,
    children,
  };
}

// ============================================================================
// RuntimeElse Transformer
// ============================================================================

/**
 * Transform RuntimeElse component to ElseNode
 */
export function transformRuntimeElse(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  transformChildren: (node: JsxElement, ctx: TransformContext) => BlockNode[]
): ElseNode {
  const children = Node.isJsxElement(node)
    ? transformChildren(node, ctx)
    : [];

  return {
    kind: 'else',
    children,
  };
}

// ============================================================================
// RuntimeLoop Transformer
// ============================================================================

/**
 * Transform RuntimeLoop component to LoopNode
 */
export function transformRuntimeLoop(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  transformChildren: (node: JsxElement, ctx: TransformContext) => BlockNode[]
): LoopNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract max prop (required)
  const maxStr = getAttributeValue(openingElement, 'max');
  if (!maxStr) {
    throw ctx.createError('Loop requires max prop', openingElement);
  }

  const max = parseInt(maxStr, 10);
  if (isNaN(max) || max < 1) {
    throw ctx.createError('Loop max must be a positive integer', openingElement);
  }

  // Extract optional counter prop
  let counterVar: string | undefined;
  const counterExpr = getAttributeExpression(openingElement, 'counter');
  if (counterExpr) {
    const ref = parseRuntimeVarRef(counterExpr, ctx);
    if (!ref) {
      throw ctx.createError(
        'Loop counter must be a useRuntimeVar reference',
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
    kind: 'loop',
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
  ctx: TransformContext
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
  ctx: TransformContext
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
