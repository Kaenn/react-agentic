/**
 * Runtime SpawnAgent Transformer
 *
 * Transforms SpawnAgent elements with output capture.
 * Supports RuntimeVar output binding.
 */

import { Node, JsxElement, JsxSelfClosingElement, Expression } from 'ts-morph';
import type {
  SpawnAgentNode,
  SpawnAgentInput,
  InputProperty,
  InputValue,
  RuntimeVarRefNode,
} from '../../ir/index.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { parseRuntimeVarRef } from './runtime-var.js';
import { getAttributeValue, getAttributeExpression, extractJsonValue } from './runtime-utils.js';

// ============================================================================
// Input Parsing
// ============================================================================

/**
 * Parse V3 input value from expression
 *
 * Handles:
 * - String literals -> { type: 'string', value: '...' }
 * - RuntimeVar references -> { type: 'runtimeVarRef', ref: ... }
 * - Other literals -> { type: 'json', value: ... }
 */
function parseInputValue(
  expr: Expression,
  ctx: RuntimeTransformContext
): InputValue {
  // Check for RuntimeVar reference first
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    return { type: 'runtimeVarRef', ref };
  }

  // String literal
  if (Node.isStringLiteral(expr)) {
    return { type: 'string', value: expr.getLiteralValue() };
  }

  // Template literal
  if (Node.isNoSubstitutionTemplateLiteral(expr)) {
    return { type: 'string', value: expr.getLiteralValue() };
  }

  // Other JSON-serializable values
  const jsonValue = extractJsonValue(expr);
  return { type: 'json', value: jsonValue };
}

/**
 * Parse SpawnAgent input prop
 *
 * Handles:
 * - Object literal: input={{ key: value, ... }}
 * - Variable reference: input={someVar}
 */
function parseInput(
  expr: Expression,
  ctx: RuntimeTransformContext
): SpawnAgentInput {
  // Check for RuntimeVar reference (variable binding)
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    return {
      type: 'variable',
      varName: ref.varName,
    };
  }

  // Object literal
  if (Node.isObjectLiteralExpression(expr)) {
    const properties: InputProperty[] = [];

    for (const prop of expr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName();
        const init = prop.getInitializer();

        if (init) {
          properties.push({
            name,
            value: parseInputValue(init, ctx),
          });
        }
      } else if (Node.isShorthandPropertyAssignment(prop)) {
        // { foo } shorthand - check if it's a RuntimeVar
        const name = prop.getName();
        const nameNode = prop.getNameNode();
        const ref = parseRuntimeVarRef(nameNode, ctx);

        if (ref) {
          properties.push({
            name,
            value: { type: 'runtimeVarRef', ref },
          });
        } else {
          // Not a RuntimeVar - treat as identifier reference (will be resolved at runtime)
          properties.push({
            name,
            value: { type: 'string', value: `{${name}}` },
          });
        }
      }
    }

    return { type: 'object', properties };
  }

  throw ctx.createError(
    'SpawnAgent input must be an object literal or RuntimeVar reference',
    expr
  );
}

// ============================================================================
// Transformer
// ============================================================================

/**
 * Transform SpawnAgent to SpawnAgentNode
 *
 * Input JSX:
 * <SpawnAgent
 *   agent="researcher"
 *   model="haiku"
 *   description="Research the topic"
 *   input={{ topic: ctx.topic }}
 *   output={result}
 * />
 *
 * Output IR:
 * {
 *   kind: 'spawnAgent',
 *   agent: 'researcher',
 *   model: 'haiku',
 *   description: 'Research the topic',
 *   input: { type: 'object', properties: [...] },
 *   outputVar: 'RESULT'
 * }
 */
export function transformRuntimeSpawnAgent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): SpawnAgentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract agent prop (required)
  const agent = getAttributeValue(openingElement, 'agent');
  if (!agent) {
    throw ctx.createError('SpawnAgent requires agent prop', openingElement);
  }

  // Extract model prop (required)
  const model = getAttributeValue(openingElement, 'model');
  if (!model) {
    throw ctx.createError('SpawnAgent requires model prop', openingElement);
  }

  // Extract description prop (required)
  const description = getAttributeValue(openingElement, 'description');
  if (!description) {
    throw ctx.createError('SpawnAgent requires description prop', openingElement);
  }

  // Extract prompt or input (one or the other)
  const prompt = getAttributeValue(openingElement, 'prompt');
  const inputExpr = getAttributeExpression(openingElement, 'input');

  let input: SpawnAgentInput | undefined;
  if (inputExpr) {
    input = parseInput(inputExpr, ctx);
  }

  if (!prompt && !input) {
    throw ctx.createError(
      'SpawnAgent requires either prompt or input prop',
      openingElement
    );
  }

  // Extract optional output prop
  let outputVar: string | undefined;
  const outputExpr = getAttributeExpression(openingElement, 'output');
  if (outputExpr) {
    const outputRef = parseRuntimeVarRef(outputExpr, ctx);
    if (!outputRef) {
      throw ctx.createError(
        'SpawnAgent output must be a useRuntimeVar reference',
        outputExpr
      );
    }
    if (outputRef.path.length > 0) {
      throw ctx.createError(
        'SpawnAgent output must reference the variable directly',
        outputExpr
      );
    }
    outputVar = outputRef.varName;
  }

  // Extract optional loadFromFile prop
  const loadFromFile = getAttributeValue(openingElement, 'loadFromFile');

  return {
    kind: 'spawnAgent',
    agent,
    model,
    description,
    prompt,
    input,
    outputVar,
    loadFromFile,
  };
}
