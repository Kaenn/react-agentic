/**
 * Variable transformation module
 *
 * Handles transformAssign, transformAssignGroup, and related helper functions
 * for shell variable assignment components.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement, TemplateExpression } from 'ts-morph';
import type { AssignNode, AssignGroupNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';

/**
 * Transform an Assign element to AssignNode
 * Assign emits a bash code block with variable assignment
 *
 * Supports three assignment types (exactly one required):
 * - bash: VAR=$(command)
 * - value: VAR=value (quoted if spaces)
 * - env: VAR=$ENV_VAR
 */
export function transformAssign(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): AssignNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Get the var prop - must be a JSX expression referencing an identifier
  const varAttr = openingElement.getAttribute('var');
  if (!varAttr || !Node.isJsxAttribute(varAttr)) {
    throw ctx.createError('Assign requires var prop', openingElement);
  }

  const init = varAttr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    throw ctx.createError('Assign var must be a JSX expression: var={variableName}', openingElement);
  }

  const expr = init.getExpression();
  if (!expr) {
    throw ctx.createError('Assign var must reference a useVariable or defineVars result', openingElement);
  }

  // Support both patterns:
  // - Identifier: var={phaseDir} (from useVariable)
  // - PropertyAccessExpression: var={vars.PHASE_DIR} (from defineVars)
  let localName: string;
  if (Node.isIdentifier(expr)) {
    localName = expr.getText();
  } else if (Node.isPropertyAccessExpression(expr)) {
    // e.g., vars.MODEL_PROFILE -> "vars.MODEL_PROFILE"
    localName = expr.getText();
  } else {
    throw ctx.createError('Assign var must reference a useVariable or defineVars result', openingElement);
  }

  // Look up in extracted variables to get the env name
  const variable = ctx.variables.get(localName);
  if (!variable) {
    throw ctx.createError(
      `Variable '${localName}' not found. Did you declare it with useVariable() or defineVars()?`,
      openingElement
    );
  }

  // Extract assignment from props (exactly one of bash, value, env)
  const bashProp = extractAssignPropValue(openingElement, 'bash');
  const valueProp = extractAssignPropValue(openingElement, 'value');
  const envProp = extractAssignPropValue(openingElement, 'env');

  const propCount = [bashProp, valueProp, envProp].filter(p => p !== undefined).length;
  if (propCount === 0) {
    throw ctx.createError(
      'Assign requires one of: bash, value, or env prop',
      openingElement
    );
  }
  if (propCount > 1) {
    throw ctx.createError(
      'Assign accepts only one of: bash, value, or env prop',
      openingElement
    );
  }

  let assignment: { type: 'bash' | 'value' | 'env'; content: string };
  if (bashProp !== undefined) {
    assignment = { type: 'bash', content: bashProp };
  } else if (valueProp !== undefined) {
    assignment = { type: 'value', content: valueProp };
  } else {
    assignment = { type: 'env', content: envProp! };
  }

  // Extract optional comment prop
  const commentProp = extractAssignPropValue(openingElement, 'comment');

  return {
    kind: 'assign',
    variableName: variable.envName,
    assignment,
    ...(commentProp && { comment: commentProp }),
  };
}

/**
 * Transform an AssignGroup element to AssignGroupNode
 * AssignGroup collects Assign children into a single bash code block
 */
export function transformAssignGroup(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): AssignGroupNode {
  // AssignGroup must have children
  if (Node.isJsxSelfClosingElement(node)) {
    throw ctx.createError('AssignGroup must have Assign children', node);
  }

  const children = node.getJsxChildren();
  const assignments: AssignNode[] = [];
  let pendingBlankBefore = false;  // Track <br/> for next assignment

  for (const child of children) {
    // Skip whitespace text nodes
    if (Node.isJsxText(child)) {
      const text = child.getText().trim();
      if (text === '') continue;
      throw ctx.createError('AssignGroup can only contain Assign or br elements, not text', child);
    }

    // Must be JSX element
    if (!Node.isJsxElement(child) && !Node.isJsxSelfClosingElement(child)) {
      throw ctx.createError('AssignGroup can only contain Assign or br elements', child);
    }

    // Get element name
    const opening = Node.isJsxElement(child) ? child.getOpeningElement() : child;
    const tagNameNode = opening.getTagNameNode();
    const name = tagNameNode.getText();

    // Handle <br/> - mark that next assignment should have extra blank line
    if (name === 'br') {
      pendingBlankBefore = true;
      continue;
    }

    // Must be Assign
    if (name !== 'Assign') {
      throw ctx.createError(`AssignGroup can only contain Assign or br elements, found: ${name}`, child);
    }

    // Transform the Assign element
    const assignNode = transformAssign(child, ctx);

    // Apply pending blank before flag
    if (pendingBlankBefore) {
      assignNode.blankBefore = true;
      pendingBlankBefore = false;
    }

    assignments.push(assignNode);
  }

  if (assignments.length === 0) {
    throw ctx.createError('AssignGroup must contain at least one Assign element', node);
  }

  return {
    kind: 'assignGroup',
    assignments,
  };
}

/**
 * Extract assignment prop value from Assign element
 * Handles string literals, JSX expressions with strings, and template literals
 */
function extractAssignPropValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  propName: string
): string | undefined {
  const attr = element.getAttribute(propName);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init) return undefined;

  // String literal: prop="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: prop={...}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) return undefined;

    // String literal: prop={"value"}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Template literal without substitution: prop={`value`}
    if (Node.isNoSubstitutionTemplateLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Template expression with substitution: prop={`ls ${VAR}`}
    if (Node.isTemplateExpression(expr)) {
      return extractBashTemplate(expr);
    }
  }

  return undefined;
}

/**
 * Extract template literal content preserving ${VAR} syntax for bash
 */
function extractBashTemplate(expr: TemplateExpression): string {
  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Preserve ${...} syntax for bash
    parts.push(`\${${spanExpr.getText()}}`);
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}
