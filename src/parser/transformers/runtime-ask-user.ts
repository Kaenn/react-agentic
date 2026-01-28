/**
 * AskUser Transformer
 *
 * Transforms <AskUser ... /> elements to AskUserNode IR nodes.
 */

import { Node, JsxElement, JsxSelfClosingElement, Expression } from 'ts-morph';
import type { AskUserNode, AskUserOptionNode } from '../../ir/index.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { parseRuntimeVarRef } from './runtime-var.js';
import { getAttributeValue, getAttributeExpression, getAttributeArray } from './runtime-utils.js';

// ============================================================================
// Option Parsing
// ============================================================================

/**
 * Parse an option object literal to AskUserOptionNode
 *
 * Expected format: { value: 'val', label: 'Label', description?: 'Desc' }
 */
function parseOption(
  expr: Expression,
  ctx: RuntimeTransformContext
): AskUserOptionNode {
  if (!Node.isObjectLiteralExpression(expr)) {
    throw ctx.createError(
      'AskUser option must be an object literal',
      expr
    );
  }

  let value: string | undefined;
  let label: string | undefined;
  let description: string | undefined;

  for (const prop of expr.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;

    const name = prop.getName();
    const init = prop.getInitializer();

    if (!init) continue;

    if (name === 'value' && Node.isStringLiteral(init)) {
      value = init.getLiteralValue();
    } else if (name === 'label' && Node.isStringLiteral(init)) {
      label = init.getLiteralValue();
    } else if (name === 'description' && Node.isStringLiteral(init)) {
      description = init.getLiteralValue();
    }
  }

  if (!value) {
    throw ctx.createError('AskUser option requires value property', expr);
  }
  if (!label) {
    throw ctx.createError('AskUser option requires label property', expr);
  }

  return { value, label, description };
}

// ============================================================================
// Transformer
// ============================================================================

/**
 * Transform AskUser component to AskUserNode
 *
 * Input JSX:
 * <AskUser
 *   question="Which database?"
 *   header="Database"
 *   options={[
 *     { value: 'postgres', label: 'PostgreSQL' },
 *     { value: 'sqlite', label: 'SQLite' }
 *   ]}
 *   output={dbChoice}
 * />
 *
 * Output IR:
 * {
 *   kind: 'askUser',
 *   question: 'Which database?',
 *   header: 'Database',
 *   options: [...],
 *   outputVar: 'DB_CHOICE',
 *   multiSelect: false
 * }
 */
export function transformAskUser(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): AskUserNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract question prop (required)
  const question = getAttributeValue(openingElement, 'question');
  if (!question) {
    throw ctx.createError('AskUser requires question prop', openingElement);
  }

  // Extract options prop (required)
  const optionsExprs = getAttributeArray(openingElement, 'options');
  if (!optionsExprs || optionsExprs.length === 0) {
    throw ctx.createError(
      'AskUser requires options prop with at least one option',
      openingElement
    );
  }

  if (optionsExprs.length < 2) {
    throw ctx.createError(
      'AskUser options must have at least 2 options',
      openingElement
    );
  }

  if (optionsExprs.length > 4) {
    throw ctx.createError(
      'AskUser options must have at most 4 options',
      openingElement
    );
  }

  const options: AskUserOptionNode[] = optionsExprs.map(expr =>
    parseOption(expr, ctx)
  );

  // Extract output prop (required)
  const outputExpr = getAttributeExpression(openingElement, 'output');
  if (!outputExpr) {
    throw ctx.createError(
      'AskUser requires output prop (RuntimeVar reference)',
      openingElement
    );
  }

  const outputRef = parseRuntimeVarRef(outputExpr, ctx);
  if (!outputRef) {
    throw ctx.createError(
      'AskUser output must be a useRuntimeVar reference',
      outputExpr
    );
  }

  // Output should be root variable
  if (outputRef.path.length > 0) {
    throw ctx.createError(
      'AskUser output must reference the variable directly, not a property',
      outputExpr
    );
  }

  // Extract optional props
  const header = getAttributeValue(openingElement, 'header');
  const multiSelectStr = getAttributeValue(openingElement, 'multiSelect');
  const multiSelect = multiSelectStr === 'true';

  return {
    kind: 'askUser',
    question,
    options,
    outputVar: outputRef.varName,
    header,
    multiSelect,
  };
}
