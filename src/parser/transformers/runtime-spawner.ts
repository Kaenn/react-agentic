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
// String or RuntimeVar Extraction
// ============================================================================

/**
 * Extract a string value or RuntimeVar reference from a JSX attribute
 *
 * Tries static string extraction first, then checks for RuntimeVar reference.
 * This enables props like `model={ctx.models.researcher}` to work.
 *
 * @param openingElement - The JSX opening or self-closing element
 * @param attrName - The attribute name to extract
 * @param ctx - Transform context
 * @returns String value, RuntimeVarRefNode, or undefined if not found
 */
function extractStringOrRuntimeVar(
  openingElement: import('ts-morph').JsxOpeningElement | import('ts-morph').JsxSelfClosingElement,
  attrName: string,
  ctx: RuntimeTransformContext
): string | RuntimeVarRefNode | undefined {
  // First, check for template expressions with RuntimeVar interpolation
  // We need to do this BEFORE calling getAttributeValue to avoid getting
  // the raw template string with ${...} placeholders unresolved
  const expr = getAttributeExpression(openingElement, attrName);
  if (expr) {
    // Handle template expressions with RuntimeVar interpolation
    if (Node.isTemplateExpression(expr)) {
      const parts: string[] = [];
      parts.push(expr.getHead().getLiteralText());
      for (const span of expr.getTemplateSpans()) {
        const spanExpr = span.getExpression();
        const spanRef = parseRuntimeVarRef(spanExpr, ctx);
        if (spanRef) {
          const pathStr = spanRef.path.length === 0
            ? ''
            : spanRef.path.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
          parts.push(`$${spanRef.varName}${pathStr}`);
        } else {
          // Non-RuntimeVar interpolation - preserve as-is
          parts.push(`\${${spanExpr.getText()}}`);
        }
        parts.push(span.getLiteral().getLiteralText());
      }
      return parts.join('');
    }

    // Try direct RuntimeVar reference
    const ref = parseRuntimeVarRef(expr, ctx);
    if (ref) {
      return ref;
    }
  }

  // Try static string (includes NoSubstitutionTemplateLiteral via getAttributeValue)
  const staticValue = getAttributeValue(openingElement, attrName);
  if (staticValue !== undefined) {
    return staticValue;
  }

  return undefined;
}

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

  // Extract agent prop (required) - supports static string or RuntimeVar
  const agent = extractStringOrRuntimeVar(openingElement, 'agent', ctx);
  if (!agent) {
    throw ctx.createError('SpawnAgent requires agent prop', openingElement);
  }

  // Extract model prop (required) - supports static string or RuntimeVar
  const model = extractStringOrRuntimeVar(openingElement, 'model', ctx);
  if (!model) {
    throw ctx.createError('SpawnAgent requires model prop', openingElement);
  }

  // Extract description prop (required) - supports static string or RuntimeVar
  const description = extractStringOrRuntimeVar(openingElement, 'description', ctx);
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

  // Extract optional readAgentFile prop
  const readAgentFileProp = openingElement.getAttribute('readAgentFile');
  let readAgentFile = false;
  if (readAgentFileProp && Node.isJsxAttribute(readAgentFileProp)) {
    const init = readAgentFileProp.getInitializer();
    if (!init) {
      // Shorthand: readAgentFile (no value = true)
      readAgentFile = true;
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && expr.getText() === 'true') {
        readAgentFile = true;
      } else if (expr && expr.getText() === 'false') {
        readAgentFile = false;
      }
    }

    // Validate: readAgentFile requires agent prop to be a string
    if (readAgentFile && typeof agent !== 'string') {
      throw ctx.createError(
        'readAgentFile requires agent prop to be a static string (RuntimeVar not supported)',
        openingElement
      );
    }
  }

  return {
    kind: 'spawnAgent',
    agent,
    model,
    description,
    prompt,
    input,
    outputVar,
    loadFromFile,
    ...(readAgentFile && { readAgentFile }),
  };
}
