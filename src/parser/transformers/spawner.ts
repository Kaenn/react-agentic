/**
 * SpawnAgent transformation module
 *
 * Handles transformSpawnAgent and related helper functions for agent spawning.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement, PropertyAccessExpression, ObjectLiteralExpression, TemplateExpression } from 'ts-morph';
import type { SpawnAgentNode, SpawnAgentInput, TypeReference } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getAttributeValue, extractTypeArguments, extractInputObjectLiteral, resolveTypeImport, extractInterfaceProperties } from '../utils/index.js';

/**
 * Transform a SpawnAgent element to SpawnAgentNode
 * SpawnAgent is a block-level element that emits Task() syntax
 *
 * Supports two modes:
 * 1. prompt prop (deprecated): Manual prompt string
 * 2. input prop (preferred): Typed input - VariableRef or object literal
 *
 * Also supports:
 * - agent={AgentRef} for type-safe agent references
 * - loadFromFile prop for "load from file" pattern
 */
export function transformSpawnAgent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): SpawnAgentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract agent prop - can be string OR AgentRef identifier
  const { agentName, agentPath } = extractAgentProp(openingElement, ctx);
  const model = getAttributeValue(openingElement, 'model');
  const description = getAttributeValue(openingElement, 'description');

  // Extract loadFromFile prop
  const loadFromFile = extractLoadFromFileProp(openingElement, agentPath, ctx);

  // Extract readAgentFile prop
  const readAgentFile = extractReadAgentFileProp(openingElement, agentName, ctx);

  // Extract prompt, promptVariable, and input props
  const prompt = extractPromptProp(openingElement, ctx);
  const promptVariable = getAttributeValue(openingElement, 'promptVariable');
  const input = extractInputProp(openingElement, ctx);

  // Extract extra instructions from children (when using input prop)
  const extraInstructions = Node.isJsxElement(node)
    ? extractExtraInstructions(node, ctx)
    : undefined;

  // Validate required props
  if (!agentName) {
    throw ctx.createError('SpawnAgent requires agent prop', openingElement);
  }
  if (!model) {
    throw ctx.createError('SpawnAgent requires model prop', openingElement);
  }
  if (!description) {
    throw ctx.createError('SpawnAgent requires description prop', openingElement);
  }

  // Validate mutual exclusivity of prompt, promptVariable, and input
  const promptProps = [prompt, promptVariable, input].filter(Boolean).length;
  if (promptProps > 1) {
    throw ctx.createError(
      'Cannot use multiple prompt props on SpawnAgent. Use one of: prompt, promptVariable, or input.',
      openingElement
    );
  }

  // Require one of prompt, promptVariable, or input
  if (promptProps === 0) {
    throw ctx.createError(
      'SpawnAgent requires either prompt, promptVariable, or input prop',
      openingElement
    );
  }

  // Extract generic type argument if present
  const typeArgs = extractTypeArguments(node);
  let inputType: TypeReference | undefined;
  const typeParam = typeArgs && typeArgs.length > 0 ? typeArgs[0] : undefined;
  if (typeParam) {
    inputType = {
      kind: 'typeReference',
      name: typeParam,
      resolved: false,  // Will be resolved in validation phase
    };
  }

  // Validate input object against interface if both present
  if (input) {
    validateInputAgainstInterface(input, typeParam, openingElement, ctx);
  }

  return {
    kind: 'spawnAgent',
    agent: agentName,
    model,
    description,
    ...(prompt && { prompt }),
    ...(promptVariable && { promptVariable }),
    ...(input && { input }),
    ...(extraInstructions && { extraInstructions }),
    ...(inputType && { inputType }),
    ...(loadFromFile && { loadFromFile }),
    ...(readAgentFile && { readAgentFile }),
  };
}

/**
 * Extract agent prop - handles string OR AgentRef identifier
 *
 * Returns:
 * - agentName: The agent name string (required)
 * - agentPath: The agent's file path (if AgentRef with path)
 */
function extractAgentProp(
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): { agentName: string | undefined; agentPath: string | undefined } {
  const attr = element.getAttribute('agent');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return { agentName: undefined, agentPath: undefined };
  }

  const init = attr.getInitializer();

  // Case 1: String literal - agent="my-agent"
  if (init && Node.isStringLiteral(init)) {
    return { agentName: init.getLiteralValue(), agentPath: undefined };
  }

  // Case 2: JSX expression - agent={AgentRef}
  if (init && Node.isJsxExpression(init)) {
    const expr = init.getExpression();

    // Case 2a: Identifier referencing an AgentRef (e.g., agent={PhaseResearcher})
    if (expr && Node.isIdentifier(expr)) {
      const identName = expr.getText();

      // Try to resolve the identifier to find AgentRef properties
      const agentRef = resolveAgentRef(identName, ctx);
      if (agentRef) {
        return { agentName: agentRef.name, agentPath: agentRef.path };
      }

      // If not resolvable as AgentRef, treat identifier text as agent name
      // This allows for dynamic agent names from variables
      return { agentName: identName, agentPath: undefined };
    }

    // Case 2b: String literal in expression - agent={"my-agent"}
    if (expr && Node.isStringLiteral(expr)) {
      return { agentName: expr.getLiteralValue(), agentPath: undefined };
    }
  }

  return { agentName: undefined, agentPath: undefined };
}

/**
 * Try to resolve an identifier to an AgentRef definition
 *
 * Looks for:
 * 1. Imported AgentRef (from defineAgent call in source file)
 * 2. Local AgentRef constant
 */
function resolveAgentRef(
  identName: string,
  ctx: TransformContext
): { name: string; path?: string } | undefined {
  if (!ctx.sourceFile) return undefined;

  // Find the symbol for this identifier
  const symbol = ctx.sourceFile.getLocal(identName);
  if (!symbol) return undefined;

  // Get the declaration
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return undefined;

  for (const decl of declarations) {
    // Check for import declaration
    if (Node.isImportSpecifier(decl)) {
      // Trace through import to find the defineAgent call in source file
      const resolved = resolveImportedAgentRef(decl, identName);
      if (resolved) return resolved;
      continue;
    }

    // Check for variable declaration with defineAgent call
    if (Node.isVariableDeclaration(decl)) {
      const init = decl.getInitializer();
      if (init && Node.isCallExpression(init)) {
        const callExpr = init.getExpression();
        if (callExpr && callExpr.getText() === 'defineAgent') {
          // Extract the config object from defineAgent({...})
          const args = init.getArguments();
          if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
            return extractAgentRefFromObject(args[0]);
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Resolve an imported AgentRef by tracing to its source file
 */
function resolveImportedAgentRef(
  importSpec: Node,
  identName: string
): { name: string; path?: string } | undefined {
  // Navigate up the tree to find ImportDeclaration
  // ImportSpecifier -> NamedImports -> ImportClause -> ImportDeclaration
  let current: Node | undefined = importSpec;
  while (current && !Node.isImportDeclaration(current)) {
    current = current.getParent();
  }

  if (!current || !Node.isImportDeclaration(current)) {
    return undefined;
  }

  const importDecl = current;

  // Resolve the source file
  const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
  if (!resolvedSourceFile) {
    return undefined;
  }

  // Find the exported variable with the same name
  const exportedVar = resolvedSourceFile.getVariableDeclaration(identName);
  if (!exportedVar) {
    return undefined;
  }

  // Check if it's a defineAgent call
  const init = exportedVar.getInitializer();
  if (init && Node.isCallExpression(init)) {
    const callExpr = init.getExpression();
    if (callExpr && callExpr.getText() === 'defineAgent') {
      const args = init.getArguments();
      if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
        return extractAgentRefFromObject(args[0]);
      }
    }
  }

  return undefined;
}

/**
 * Extract AgentRef properties from defineAgent config object
 */
function extractAgentRefFromObject(
  obj: ObjectLiteralExpression
): { name: string; path?: string } | undefined {
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
 * Extract loadFromFile prop
 *
 * Supports:
 * - loadFromFile (boolean true shorthand)
 * - loadFromFile={true}
 * - loadFromFile="explicit/path.md"
 *
 * When true, uses agentPath from AgentRef.
 * Returns resolved path string or undefined.
 */
function extractLoadFromFileProp(
  element: JsxOpeningElement | JsxSelfClosingElement,
  agentPath: string | undefined,
  ctx: TransformContext
): string | undefined {
  const attr = element.getAttribute('loadFromFile');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();

  // Case 1: Boolean shorthand - loadFromFile (no value = true)
  if (!init) {
    if (!agentPath) {
      throw ctx.createError(
        'loadFromFile={true} requires an AgentRef with a path property. ' +
        'Either use agent={AgentRef} where AgentRef has a path, or provide an explicit path: loadFromFile="path/to/agent.md"',
        element
      );
    }
    return agentPath;
  }

  // Case 2: String literal - loadFromFile="path/to/agent.md"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // Case 3: JSX expression
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();

    // Case 3a: Boolean true - loadFromFile={true}
    if (expr && expr.getText() === 'true') {
      if (!agentPath) {
        throw ctx.createError(
          'loadFromFile={true} requires an AgentRef with a path property. ' +
          'Either use agent={AgentRef} where AgentRef has a path, or provide an explicit path: loadFromFile="path/to/agent.md"',
          element
        );
      }
      return agentPath;
    }

    // Case 3b: Boolean false - loadFromFile={false}
    if (expr && expr.getText() === 'false') {
      return undefined;
    }

    // Case 3c: String literal - loadFromFile={"path/to/agent.md"}
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Case 3d: Property access - loadFromFile={AGENT_PATHS.researcher}
    if (expr && Node.isPropertyAccessExpression(expr)) {
      const resolvedPath = resolvePropertyAccess(expr);
      if (resolvedPath) {
        return resolvedPath;
      }
      throw ctx.createError(
        `Cannot resolve property access ${expr.getText()} for loadFromFile. ` +
        'Make sure the object is a const with string literal values.',
        element
      );
    }
  }

  throw ctx.createError(
    'loadFromFile must be a boolean or string path',
    element
  );
}

/**
 * Extract readAgentFile prop
 *
 * Supports:
 * - readAgentFile (boolean true shorthand)
 * - readAgentFile={true}
 * - readAgentFile={false}
 *
 * When true, validates that agent prop exists (can't self-read without agent name).
 */
function extractReadAgentFileProp(
  element: JsxOpeningElement | JsxSelfClosingElement,
  agentName: string | undefined,
  ctx: TransformContext
): boolean {
  const attr = element.getAttribute('readAgentFile');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return false;
  }

  const init = attr.getInitializer();

  // Case 1: Boolean shorthand - readAgentFile (no value = true)
  if (!init) {
    validateCanSelfRead(agentName, element, ctx);
    return true;
  }

  // Case 2: JSX expression - readAgentFile={true|false}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && expr.getText() === 'true') {
      validateCanSelfRead(agentName, element, ctx);
      return true;
    }
    if (expr && expr.getText() === 'false') {
      return false;
    }
  }

  throw ctx.createError(
    'readAgentFile must be a boolean (true or false)',
    element
  );
}

/**
 * Validate that agent name exists for self-reading pattern
 */
function validateCanSelfRead(
  agentName: string | undefined,
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): void {
  if (!agentName) {
    throw ctx.createError(
      'readAgentFile requires agent prop to be specified. ' +
      'Cannot self-read without an agent name.',
      element
    );
  }
}

/**
 * Resolve a property access expression (e.g., AGENT_PATHS.researcher) to its value.
 * Only works for const declarations with object literals.
 */
function resolvePropertyAccess(expr: PropertyAccessExpression): string | null {
  const objectExpr = expr.getExpression();
  const propertyName = expr.getName();

  if (!Node.isIdentifier(objectExpr)) {
    return null;
  }

  const objectName = objectExpr.getText();

  // Find the variable declaration in the source file
  const sourceFile = expr.getSourceFile();
  const varDecls = sourceFile.getVariableDeclarations();

  for (const varDecl of varDecls) {
    if (varDecl.getName() === objectName) {
      let initializer = varDecl.getInitializer();
      // Unwrap AsExpression (from "as const" syntax)
      if (initializer && Node.isAsExpression(initializer)) {
        initializer = initializer.getExpression();
      }
      if (initializer && Node.isObjectLiteralExpression(initializer)) {
        // Look for the property in the object literal
        for (const prop of initializer.getProperties()) {
          if (Node.isPropertyAssignment(prop) && prop.getName() === propertyName) {
            const propInit = prop.getInitializer();
            if (propInit && Node.isStringLiteral(propInit)) {
              return propInit.getLiteralValue();
            }
            if (propInit && Node.isNoSubstitutionTemplateLiteral(propInit)) {
              return propInit.getLiteralValue();
            }
          }
        }
      }
      break;
    }
  }

  return null;
}

/**
 * Extract input prop - handles VariableRef identifier or object literal
 *
 * Supports:
 * - input={varRef} - Reference to useVariable result
 * - input={{ key: "value" }} - Object literal with properties
 */
function extractInputProp(
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): SpawnAgentInput | undefined {
  const attr = element.getAttribute('input');
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return undefined;

  const expr = init.getExpression();
  if (!expr) return undefined;

  // Case 1: Identifier referencing useVariable result
  if (Node.isIdentifier(expr)) {
    const variable = ctx.variables.get(expr.getText());
    if (variable) {
      return { type: 'variable', varName: variable.envName };
    }
    // Not a known variable - error
    throw ctx.createError(
      `Input '${expr.getText()}' not found. Use useVariable() or object literal.`,
      element
    );
  }

  // Case 2: Object literal
  if (Node.isObjectLiteralExpression(expr)) {
    const properties = extractInputObjectLiteral(expr, ctx.variables);
    return { type: 'object', properties };
  }

  throw ctx.createError('Input must be a VariableRef or object literal', element);
}

/**
 * Extract extra instructions from SpawnAgent children
 *
 * Treats children as raw text content (like Markdown component).
 * Returns undefined if no children or only whitespace.
 */
function extractExtraInstructions(node: JsxElement, ctx: TransformContext): string | undefined {
  const parts: string[] = [];

  for (const child of node.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      const text = child.getText();
      if (text.trim()) {
        parts.push(text);
      }
    } else if (Node.isJsxExpression(child)) {
      // Handle {`template`} and {"string"} expressions
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          parts.push(extractTemplateText(expr));
        }
      }
    }
  }

  const content = parts.join('').trim();
  return content || undefined;
}

/**
 * Extract text from a template expression, converting ${var} to {var}
 * This preserves GSD's {variable} placeholder syntax
 */
function extractTemplateText(expr: TemplateExpression): string {
  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Convert ${variable} to {variable} for GSD format
    parts.push(`{${spanExpr.getText()}}`);
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}

/**
 * Extract prompt prop value, preserving multi-line content and {variable} placeholders
 * Supports: prompt="string", prompt={"string"}, prompt={`template`}
 */
function extractPromptProp(element: JsxOpeningElement | JsxSelfClosingElement, ctx: TransformContext): string | undefined {
  const attr = element.getAttribute('prompt');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: prompt="simple string"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: prompt={...}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) {
      return undefined;
    }

    // String literal in JSX expression: prompt={"string"}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // No-substitution template literal: prompt={`simple template`}
    if (Node.isNoSubstitutionTemplateLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Template expression with substitutions: prompt={`text ${var}`}
    // Note: ${var} in TSX templates become {var} in output (GSD format)
    if (Node.isTemplateExpression(expr)) {
      return extractTemplateText(expr);
    }
  }

  return undefined;
}

/**
 * Validate input object properties against SpawnAgent<T> type parameter.
 *
 * Throws compile error if required interface properties are missing.
 * Only validates object literal inputs (VariableRef is runtime-checked).
 *
 * @param input - The parsed SpawnAgentInput (may be variable or object)
 * @param typeParam - The type parameter name (e.g., "ResearcherInput")
 * @param element - The JSX element for error reporting
 */
function validateInputAgainstInterface(
  input: SpawnAgentInput,
  typeParam: string | undefined,
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): void {
  // Only validate object literal inputs (VariableRef is runtime-checked)
  if (input.type !== 'object') return;

  // No type param = no validation (backward compat)
  if (!typeParam) return;

  // Require source file for type resolution
  if (!ctx.sourceFile) {
    // Can't resolve types without source file context - skip validation
    return;
  }

  // Resolve the interface (local or imported)
  const resolved = resolveTypeImport(typeParam, ctx.sourceFile);
  if (!resolved?.interface) {
    // Interface not found - skip validation (warning logged elsewhere)
    return;
  }

  // Extract required properties from interface
  const interfaceProps = extractInterfaceProperties(resolved.interface);
  const requiredProps = interfaceProps.filter(p => p.required);

  // Get property names from input object
  const inputPropNames = input.properties.map(p => p.name);

  // Find missing required properties
  const missing = requiredProps.filter(p => !inputPropNames.includes(p.name));

  if (missing.length > 0) {
    const missingNames = missing.map(p => p.name).join(', ');
    const requiredNames = requiredProps.map(p => p.name).join(', ');
    throw ctx.createError(
      `SpawnAgent input missing required properties: ${missingNames}. ` +
      `Interface '${typeParam}' requires: ${requiredNames}`,
      element
    );
  }
}
