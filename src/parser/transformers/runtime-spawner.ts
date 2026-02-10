/**
 * Runtime SpawnAgent Transformer
 *
 * Transforms SpawnAgent elements with output capture.
 * Supports RuntimeVar output binding.
 */

import { Node, JsxElement, JsxSelfClosingElement, Expression, ObjectLiteralExpression } from 'ts-morph';
import type {
  SpawnAgentNode,
  SpawnAgentInput,
  InputProperty,
  InputValue,
  RuntimeVarRefNode,
} from '../../ir/index.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { parseRuntimeVarRef } from './runtime-var.js';
import { getAttributeValue, getAttributeExpression, extractJsonValue, resolveExprThroughProps } from './runtime-utils.js';

// ============================================================================
// AgentRef Resolution
// ============================================================================

/**
 * Resolved AgentRef properties
 */
interface ResolvedAgentRef {
  name: string;
  path?: string;
}

/**
 * Try to resolve an identifier as a defineAgent() call
 *
 * Looks for local variable declarations like:
 *   const Researcher = defineAgent({ name: '...', path: '...' });
 */
function resolveAgentRef(
  identName: string,
  ctx: RuntimeTransformContext
): ResolvedAgentRef | undefined {
  if (!ctx.sourceFile) return undefined;

  const symbol = ctx.sourceFile.getLocal(identName);
  if (!symbol) return undefined;

  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return undefined;

  for (const decl of declarations) {
    // Check for import specifier — trace to source file
    if (Node.isImportSpecifier(decl)) {
      let current: import('ts-morph').Node | undefined = decl;
      while (current && !Node.isImportDeclaration(current)) {
        current = current.getParent();
      }
      if (current && Node.isImportDeclaration(current)) {
        const resolvedSource = current.getModuleSpecifierSourceFile();
        if (resolvedSource) {
          const exportedVar = resolvedSource.getVariableDeclaration(identName);
          if (exportedVar) {
            const init = exportedVar.getInitializer();
            if (init && Node.isCallExpression(init)) {
              const callExpr = init.getExpression();
              if (callExpr && callExpr.getText() === 'defineAgent') {
                const args = init.getArguments();
                if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                  return extractAgentRefFromObject(args[0] as ObjectLiteralExpression);
                }
              }
            }
          }
        }
      }
      continue;
    }

    // Check for local variable declaration with defineAgent call
    if (Node.isVariableDeclaration(decl)) {
      const init = decl.getInitializer();
      if (init && Node.isCallExpression(init)) {
        const callExpr = init.getExpression();
        if (callExpr && callExpr.getText() === 'defineAgent') {
          const args = init.getArguments();
          if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
            return extractAgentRefFromObject(args[0] as ObjectLiteralExpression);
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract name and path from a defineAgent config object literal
 */
function extractAgentRefFromObject(
  obj: ObjectLiteralExpression
): ResolvedAgentRef | undefined {
  let name: string | undefined;
  let path: string | undefined;

  for (const prop of obj.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const propName = prop.getName();
      const init = prop.getInitializer();

      if (propName === 'name' && init && Node.isStringLiteral(init)) {
        name = init.getLiteralValue();
      }
      if (propName === 'path' && init && Node.isStringLiteral(init)) {
        path = init.getLiteralValue();
      }
    }
  }

  if (name) {
    return { name, path };
  }
  return undefined;
}

/**
 * Extract agent prop — handles string literal, RuntimeVar, or AgentRef identifier
 *
 * Returns:
 * - agentName: string | RuntimeVarRefNode (for the agent name)
 * - agentPath: string | undefined (if AgentRef with path)
 */
function extractAgentProp(
  openingElement: import('ts-morph').JsxOpeningElement | import('ts-morph').JsxSelfClosingElement,
  ctx: RuntimeTransformContext
): { agentName: string | RuntimeVarRefNode | undefined; agentPath: string | undefined } {
  // First try string or RuntimeVar
  const result = extractStringOrRuntimeVar(openingElement, 'agent', ctx);
  if (result) {
    return { agentName: result, agentPath: undefined };
  }

  // Try resolving as AgentRef identifier (resolve through component props first)
  const rawExpr = getAttributeExpression(openingElement, 'agent');
  const expr = rawExpr ? resolveExprThroughProps(rawExpr, ctx) : rawExpr;
  if (expr && Node.isIdentifier(expr)) {
    const ref = resolveAgentRef(expr.getText(), ctx);
    if (ref) {
      return { agentName: ref.name, agentPath: ref.path };
    }
  }

  return { agentName: undefined, agentPath: undefined };
}

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
  const rawExpr = getAttributeExpression(openingElement, attrName);
  const expr = rawExpr ? resolveExprThroughProps(rawExpr, ctx) : rawExpr;
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
  // Resolve identifier through component props before checking RuntimeVar
  expr = resolveExprThroughProps(expr, ctx);

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
  // Resolve identifier through component props before checking RuntimeVar
  const resolvedExpr = resolveExprThroughProps(expr, ctx);

  // Check for RuntimeVar reference (variable binding)
  const ref = parseRuntimeVarRef(resolvedExpr, ctx);
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
        // { foo } shorthand - check if it's a RuntimeVar (resolve through props first)
        const name = prop.getName();
        const nameNode = prop.getNameNode();
        const resolvedNameExpr = resolveExprThroughProps(nameNode as unknown as Expression, ctx);
        const ref = parseRuntimeVarRef(resolvedNameExpr, ctx);

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

  // Extract agent prop (required) - supports static string, RuntimeVar, or AgentRef
  const { agentName: agent, agentPath } = extractAgentProp(openingElement, ctx);
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
  const rawOutputExpr = getAttributeExpression(openingElement, 'output');
  const outputExpr = rawOutputExpr ? resolveExprThroughProps(rawOutputExpr, ctx) : rawOutputExpr;
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
  // Try explicit prop first, then fall back to AgentRef path for loadFromFile shorthand
  let loadFromFile = getAttributeValue(openingElement, 'loadFromFile');
  if (!loadFromFile) {
    // Check for RuntimeVar reference in loadFromFile
    const rawLoadFromFileExpr = getAttributeExpression(openingElement, 'loadFromFile');
    const loadFromFileExpr = rawLoadFromFileExpr ? resolveExprThroughProps(rawLoadFromFileExpr, ctx) : rawLoadFromFileExpr;
    if (loadFromFileExpr) {
      const loadRef = parseRuntimeVarRef(loadFromFileExpr, ctx);
      if (loadRef) {
        // RuntimeVar reference — emit as $VAR.path notation
        const pathStr = loadRef.path.length === 0
          ? ''
          : loadRef.path.reduce((acc, p) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
        loadFromFile = `$${loadRef.varName}${pathStr}`;
      }
    }
    // Check for boolean shorthand: loadFromFile or loadFromFile={true}
    const loadAttr = openingElement.getAttribute('loadFromFile');
    if (loadAttr && Node.isJsxAttribute(loadAttr)) {
      const init = loadAttr.getInitializer();
      if (!init) {
        // Boolean shorthand — use agentPath from AgentRef
        if (agentPath) {
          loadFromFile = agentPath;
        }
      } else if (Node.isJsxExpression(init)) {
        const expr = init.getExpression();
        if (expr && expr.getText() === 'true' && agentPath) {
          loadFromFile = agentPath;
        }
      }
    }
  }

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
