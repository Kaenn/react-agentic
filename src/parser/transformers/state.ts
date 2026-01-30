/**
 * State transformation module
 *
 * Handles transformReadState, transformWriteState, and related helper functions
 * for state management components.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement } from 'ts-morph';
import type { ReadStateNode, WriteStateNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';

/**
 * Transform ReadState JSX element into IR node
 *
 * Extracts:
 * - state: StateRef with key property
 * - into: VariableRef with name property
 * - field: optional nested path string
 */
export function transformReadState(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ReadStateNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract state prop (StateRef object with key property)
  const stateAttr = openingElement.getAttribute('state');
  if (!stateAttr || !Node.isJsxAttribute(stateAttr)) {
    throw ctx.createError('ReadState requires state prop', openingElement);
  }
  const stateInit = stateAttr.getInitializer();
  if (!stateInit || !Node.isJsxExpression(stateInit)) {
    throw ctx.createError('ReadState state prop must be JSX expression', openingElement);
  }
  // Extract key from StateRef: { key: "..." }
  const stateExpr = stateInit.getExpression();
  if (!stateExpr) {
    throw ctx.createError('ReadState state prop expression is empty', openingElement);
  }
  // Get the identifier name, then resolve to find the key
  const stateKey = extractStateKey(stateExpr, openingElement, ctx);

  // Extract into prop (VariableRef)
  const intoAttr = openingElement.getAttribute('into');
  if (!intoAttr || !Node.isJsxAttribute(intoAttr)) {
    throw ctx.createError('ReadState requires into prop', openingElement);
  }
  const intoInit = intoAttr.getInitializer();
  if (!intoInit || !Node.isJsxExpression(intoInit)) {
    throw ctx.createError('ReadState into prop must be JSX expression', openingElement);
  }
  const intoExpr = intoInit.getExpression();
  if (!intoExpr) {
    throw ctx.createError('ReadState into prop expression is empty', openingElement);
  }
  const variableName = extractVariableName(intoExpr, openingElement, ctx);

  // Extract optional field prop (string)
  const fieldAttr = openingElement.getAttribute('field');
  let field: string | undefined;
  if (fieldAttr && Node.isJsxAttribute(fieldAttr)) {
    const fieldInit = fieldAttr.getInitializer();
    if (fieldInit && Node.isStringLiteral(fieldInit)) {
      field = fieldInit.getLiteralText();
    }
  }

  return {
    kind: 'readState',
    stateKey,
    variableName,
    field,
  };
}

/**
 * Transform WriteState JSX element into IR node
 *
 * Two modes:
 * 1. Field mode: field="path" value={val}
 * 2. Merge mode: merge={partial}
 */
export function transformWriteState(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): WriteStateNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract state prop (required)
  const stateAttr = openingElement.getAttribute('state');
  if (!stateAttr || !Node.isJsxAttribute(stateAttr)) {
    throw ctx.createError('WriteState requires state prop', openingElement);
  }
  const stateInit = stateAttr.getInitializer();
  if (!stateInit || !Node.isJsxExpression(stateInit)) {
    throw ctx.createError('WriteState state prop must be JSX expression', openingElement);
  }
  const stateExpr = stateInit.getExpression();
  if (!stateExpr) {
    throw ctx.createError('WriteState state prop expression is empty', openingElement);
  }
  const stateKey = extractStateKey(stateExpr, openingElement, ctx);

  // Check for field prop (field mode)
  const fieldAttr = openingElement.getAttribute('field');
  const mergeAttr = openingElement.getAttribute('merge');

  if (fieldAttr && Node.isJsxAttribute(fieldAttr)) {
    // Field mode: field + value
    const fieldInit = fieldAttr.getInitializer();
    if (!fieldInit || !Node.isStringLiteral(fieldInit)) {
      throw ctx.createError('WriteState field prop must be string literal', openingElement);
    }
    const field = fieldInit.getLiteralText();

    // Extract value prop
    const valueAttr = openingElement.getAttribute('value');
    if (!valueAttr || !Node.isJsxAttribute(valueAttr)) {
      throw ctx.createError('WriteState with field requires value prop', openingElement);
    }
    const valueInit = valueAttr.getInitializer();
    if (!valueInit) {
      throw ctx.createError('WriteState value prop is empty', openingElement);
    }

    let value: { type: 'variable' | 'literal'; content: string };
    if (Node.isStringLiteral(valueInit)) {
      value = { type: 'literal', content: valueInit.getLiteralText() };
    } else if (Node.isJsxExpression(valueInit)) {
      const valueExpr = valueInit.getExpression();
      if (!valueExpr) {
        throw ctx.createError('WriteState value expression is empty', openingElement);
      }
      // Check if it's a variable reference
      if (Node.isIdentifier(valueExpr)) {
        const varName = valueExpr.getText();
        const tracked = ctx.variables.get(varName);
        if (tracked) {
          value = { type: 'variable', content: tracked.envName };
        } else {
          // Not a tracked variable - treat as literal expression text
          value = { type: 'literal', content: valueExpr.getText() };
        }
      } else {
        // Treat as literal expression
        value = { type: 'literal', content: valueExpr.getText() };
      }
    } else {
      throw ctx.createError('WriteState value must be string or expression', openingElement);
    }

    return {
      kind: 'writeState',
      stateKey,
      mode: 'field',
      field,
      value,
    };
  } else if (mergeAttr && Node.isJsxAttribute(mergeAttr)) {
    // Merge mode
    const mergeInit = mergeAttr.getInitializer();
    if (!mergeInit || !Node.isJsxExpression(mergeInit)) {
      throw ctx.createError('WriteState merge prop must be JSX expression', openingElement);
    }
    const mergeExpr = mergeInit.getExpression();
    if (!mergeExpr) {
      throw ctx.createError('WriteState merge expression is empty', openingElement);
    }

    // For merge, we serialize the object literal to JSON
    // This supports simple object literals at compile time
    const content = mergeExpr.getText();

    return {
      kind: 'writeState',
      stateKey,
      mode: 'merge',
      value: { type: 'literal', content },
    };
  } else {
    throw ctx.createError('WriteState requires either field+value or merge prop', openingElement);
  }
}

/**
 * Extract state key from StateRef expression
 * Handles: identifier pointing to useStateRef result
 */
function extractStateKey(
  expr: Node,
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): string {
  // Handle identifier (e.g., projectState from useStateRef)
  if (Node.isIdentifier(expr)) {
    const name = expr.getText();
    // Look up in tracked state refs (similar to variables tracking)
    const tracked = ctx.stateRefs.get(name);
    if (tracked) return tracked;
    // Not found - error
    throw ctx.createError(
      `State reference '${name}' not found. Did you declare it with useStateRef()?`,
      element
    );
  }
  throw ctx.createError(`Cannot extract state key from: ${expr.getText()}`, element);
}

/**
 * Extract variable name from VariableRef expression
 * Handles: identifier pointing to useVariable result
 */
function extractVariableName(
  expr: Node,
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): string {
  // Handle identifier (e.g., nameVar from useVariable)
  if (Node.isIdentifier(expr)) {
    const name = expr.getText();
    // Look up in tracked variables
    const tracked = ctx.variables.get(name);
    if (tracked) return tracked.envName;
    // Not found - error
    throw ctx.createError(
      `Variable '${name}' not found. Did you declare it with useVariable()?`,
      element
    );
  }
  throw ctx.createError(`Cannot extract variable name from: ${expr.getText()}`, element);
}
