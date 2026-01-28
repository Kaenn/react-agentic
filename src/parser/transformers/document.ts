/**
 * Document-level transformer functions
 *
 * Transforms top-level document components:
 * - Command → DocumentNode
 * - Agent → AgentDocumentNode
 * - Skill → SkillDocumentNode
 * - MCPConfig → MCPConfigDocumentNode
 * - State → StateDocumentNode
 *
 * Extracted from Transformer class for maintainability and modularity.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  ArrowFunction,
} from 'ts-morph';
import type {
  DocumentNode,
  AgentDocumentNode,
  SkillDocumentNode,
  MCPConfigDocumentNode,
  StateDocumentNode,
  FrontmatterNode,
  AgentFrontmatterNode,
  SkillFrontmatterNode,
  SkillFileNode,
  SkillStaticNode,
  MCPServerNode,
  StateNode,
  OperationNode,
  StateSchema,
  BlockNode,
  BaseBlockNode,
  TypeReference,
} from '../../ir/index.js';
import {
  getElementName,
  getAttributeValue,
  getArrayAttributeValue,
  extractText,
  resolveSpreadAttribute,
  extractTypeArguments,
  analyzeRenderPropsChildren,
  extractStateSchema,
  extractSqlArguments,
} from '../utils/index.js';
import type { TransformContext } from './types.js';
import { transformBlockChildren } from './dispatch.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Merge Command/Agent props from spread attributes and explicit attributes
 */
function mergeCommandProps(
  opening: JsxOpeningElement | JsxSelfClosingElement
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const attr of opening.getAttributes()) {
    if (Node.isJsxSpreadAttribute(attr)) {
      // Resolve spread and merge
      const spreadProps = resolveSpreadAttribute(attr);
      Object.assign(merged, spreadProps);
    } else if (Node.isJsxAttribute(attr)) {
      // Explicit prop
      const attrName = attr.getNameNode().getText();

      // Try string value first
      const stringValue = getAttributeValue(opening, attrName);
      if (stringValue !== undefined) {
        merged[attrName] = stringValue;
        continue;
      }

      // Try array value
      const arrayValue = getArrayAttributeValue(opening, attrName);
      if (arrayValue !== undefined) {
        merged[attrName] = arrayValue;
      }
    }
  }

  return merged;
}

/**
 * Get boolean attribute value from JSX element
 * Handles both boolean shorthand (disableModelInvocation) and explicit value (disableModelInvocation={true})
 */
function getBooleanAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): boolean | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const init = attr.getInitializer();
  // Boolean attribute without value: disableModelInvocation (means true)
  if (!init) return true;

  // JSX expression: disableModelInvocation={true}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && (expr.getText() === 'true' || expr.getText() === 'false')) {
      return expr.getText() === 'true';
    }
  }

  return undefined;
}

/**
 * Check if an attribute exists on an element (regardless of value)
 */
function hasAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): boolean {
  const attr = element.getAttribute(name);
  return attr !== undefined;
}

/**
 * Extract array attribute value (e.g., args={["a", "b"]})
 */
function extractArrayAttribute(
  openingElement: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string[] | undefined {
  const attr = openingElement.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const initializer = attr.getInitializer();
  if (!initializer || !Node.isJsxExpression(initializer)) return undefined;

  const expr = initializer.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return undefined;

  return expr.getElements().map(el => {
    if (Node.isStringLiteral(el)) {
      return el.getLiteralText();
    }
    // Handle template literals or other expressions - preserve as-is
    return el.getText();
  });
}

/**
 * Extract object attribute value (e.g., env={{ KEY: "value" }})
 * Resolves process.env.X references at build time
 */
function extractObjectAttribute(
  openingElement: JsxOpeningElement | JsxSelfClosingElement,
  name: string,
  ctx: TransformContext
): Record<string, string> | undefined {
  const attr = openingElement.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) return undefined;

  const initializer = attr.getInitializer();
  if (!initializer || !Node.isJsxExpression(initializer)) return undefined;

  const expr = initializer.getExpression();
  if (!expr || !Node.isObjectLiteralExpression(expr)) return undefined;

  const result: Record<string, string> = {};

  for (const prop of expr.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;

    const key = prop.getName();
    const valueExpr = prop.getInitializer();
    if (!valueExpr) continue;

    // Handle process.env.X
    if (Node.isPropertyAccessExpression(valueExpr)) {
      const text = valueExpr.getText();
      if (text.startsWith('process.env.')) {
        const envVar = text.replace('process.env.', '');
        const envValue = process.env[envVar];
        if (envValue === undefined) {
          throw ctx.createError(
            `Environment variable '${envVar}' is not defined`,
            openingElement
          );
        }
        result[key] = envValue;
        continue;
      }
    }

    if (Node.isStringLiteral(valueExpr)) {
      result[key] = valueExpr.getLiteralText();
    } else {
      // Preserve expressions as-is (e.g., template literals)
      // Strip surrounding quotes if present
      result[key] = valueExpr.getText().replace(/^["']|["']$/g, '');
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Transform arrow function body to IR blocks
 * Handles both block body { return ... } and expression body
 * Used for render props pattern in Command/Agent
 */
export function transformArrowFunctionBody(
  arrowFn: ArrowFunction,
  ctx: TransformContext
): BlockNode[] {
  const body = arrowFn.getBody();

  // Handle block body: { return <div>...</div>; }
  if (Node.isBlock(body)) {
    const returnStmt = body.getStatements()
      .find(stmt => Node.isReturnStatement(stmt));

    if (returnStmt && Node.isReturnStatement(returnStmt)) {
      const returnExpr = returnStmt.getExpression();
      if (returnExpr) {
        // Check if it's JSX
        if (Node.isJsxElement(returnExpr) || Node.isJsxSelfClosingElement(returnExpr)) {
          // We'll need dispatchBlockTransform for this
          throw new Error('transformArrowFunctionBody: JSX element transformation requires dispatch (Plan 26-04)');
        }
        if (Node.isJsxFragment(returnExpr)) {
          return transformBlockChildren(returnExpr.getJsxChildren(), ctx);
        }
        // Handle parenthesized JSX: return (<div>...</div>)
        if (Node.isParenthesizedExpression(returnExpr)) {
          const inner = returnExpr.getExpression();
          if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
            throw new Error('transformArrowFunctionBody: JSX element transformation requires dispatch (Plan 26-04)');
          }
          if (Node.isJsxFragment(inner)) {
            return transformBlockChildren(inner.getJsxChildren(), ctx);
          }
        }
      }
    }
    return [];
  }

  // Handle expression body: (ctx) => <div>...</div>
  if (Node.isJsxElement(body) || Node.isJsxSelfClosingElement(body)) {
    throw new Error('transformArrowFunctionBody: JSX element transformation requires dispatch (Plan 26-04)');
  }
  if (Node.isJsxFragment(body)) {
    return transformBlockChildren(body.getJsxChildren(), ctx);
  }
  // Handle parenthesized expression body: (ctx) => (<div>...</div>)
  if (Node.isParenthesizedExpression(body)) {
    const inner = body.getExpression();
    if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner)) {
      throw new Error('transformArrowFunctionBody: JSX element transformation requires dispatch (Plan 26-04)');
    }
    if (Node.isJsxFragment(inner)) {
      return transformBlockChildren(inner.getJsxChildren(), ctx);
    }
  }

  return [];
}

// ============================================================================
// Command Transformer
// ============================================================================

/**
 * Transform a Command element to DocumentNode with frontmatter
 */
export function transformCommand(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): DocumentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Merge all props (spread + explicit)
  const props = mergeCommandProps(openingElement);

  // Extract required props
  const name = props.name as string | undefined;
  const description = props.description as string | undefined;

  if (!name) {
    throw ctx.createError('Command requires name prop', openingElement);
  }
  if (!description) {
    throw ctx.createError('Command requires description prop', openingElement);
  }

  // Build frontmatter data
  const data: Record<string, unknown> = {
    name,
    description,
  };

  // Optional string props
  const argumentHint = props.argumentHint as string | undefined;
  if (argumentHint) {
    data['argument-hint'] = argumentHint;
  }

  const agent = props.agent as string | undefined;
  if (agent) {
    data['agent'] = agent;
  }

  // Optional array prop (check for allowedTools, map to allowed-tools)
  const allowedTools = props.allowedTools as string[] | undefined;
  if (allowedTools) {
    data['allowed-tools'] = allowedTools;
  }

  const frontmatter: FrontmatterNode = { kind: 'frontmatter', data };

  // Transform children - check for render props pattern
  let children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    const renderPropsInfo = analyzeRenderPropsChildren(node);

    if (renderPropsInfo.isRenderProps && renderPropsInfo.arrowFunction && renderPropsInfo.paramName) {
      // Build context values for interpolation
      // outputPath and sourcePath use placeholders - they're computed at build time
      const sourcePath = ctx.sourceFile?.getFilePath() ?? '';
      // Output path follows convention: .claude/commands/{name}.md
      const outputPath = `.claude/commands/${name}.md`;

      ctx.renderPropsContext = {
        paramName: renderPropsInfo.paramName,
        values: {
          name,
          description,
          outputPath,
          sourcePath,
        },
      };

      // Render props pattern: transform arrow function body
      children = transformArrowFunctionBody(renderPropsInfo.arrowFunction, ctx);

      // Clear context after transformation
      ctx.renderPropsContext = undefined;
    } else {
      // Regular children pattern
      children = transformBlockChildren(node.getJsxChildren(), ctx);
    }
  }

  return {
    kind: 'document',
    frontmatter,
    runtimeVars: [],      // V1 doesn't use runtime vars
    runtimeFunctions: [], // V1 doesn't use runtime functions
    children
  };
}

// ============================================================================
// Agent Transformer
// ============================================================================

/**
 * Transform an Agent element to AgentDocumentNode with frontmatter
 */
export function transformAgent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): AgentDocumentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract required props
  const name = getAttributeValue(openingElement, 'name');
  const description = getAttributeValue(openingElement, 'description');

  if (!name) {
    throw ctx.createError('Agent requires name prop', openingElement);
  }
  if (!description) {
    throw ctx.createError('Agent requires description prop', openingElement);
  }

  // Extract optional props
  const tools = getAttributeValue(openingElement, 'tools');
  const color = getAttributeValue(openingElement, 'color');

  // Extract generic type arguments if present (TInput, TOutput)
  const typeArgs = extractTypeArguments(node);
  let inputType: TypeReference | undefined;
  let outputType: TypeReference | undefined;

  if (typeArgs && typeArgs.length > 0) {
    inputType = {
      kind: 'typeReference',
      name: typeArgs[0],
      resolved: false,  // Will be resolved in validation phase
    };
  }
  if (typeArgs && typeArgs.length > 1) {
    outputType = {
      kind: 'typeReference',
      name: typeArgs[1],
      resolved: false,  // Will be resolved in validation phase
    };
  }

  // Build frontmatter (using spread for optional fields)
  const frontmatter: AgentFrontmatterNode = {
    kind: 'agentFrontmatter',
    name,
    description,
    ...(tools && { tools }),
    ...(color && { color }),
    ...(inputType && { inputType }),
    ...(outputType && { outputType }),
  };

  // Transform children - check for render props pattern
  let children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    const renderPropsInfo = analyzeRenderPropsChildren(node);

    if (renderPropsInfo.isRenderProps && renderPropsInfo.arrowFunction && renderPropsInfo.paramName) {
      // Build context values for interpolation
      const sourcePath = ctx.sourceFile?.getFilePath() ?? '';
      // Output path follows convention: .claude/agents/{name}.md
      const outputPath = `.claude/agents/${name}.md`;

      ctx.renderPropsContext = {
        paramName: renderPropsInfo.paramName,
        values: {
          name,
          description,
          outputPath,
          sourcePath,
        },
      };

      // Render props pattern: transform arrow function body
      children = transformArrowFunctionBody(renderPropsInfo.arrowFunction, ctx);

      // Clear context after transformation
      ctx.renderPropsContext = undefined;
    } else {
      // Regular children pattern
      children = transformBlockChildren(node.getJsxChildren(), ctx);
    }
  }

  return { kind: 'agentDocument', frontmatter, children: children as BaseBlockNode[] };
}

// ============================================================================
// Skill Transformer
// ============================================================================

/**
 * Transform a Skill element to SkillDocumentNode with frontmatter, body, files, and statics
 */
export function transformSkill(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): SkillDocumentNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract required props
  const name = getAttributeValue(openingElement, 'name');
  const description = getAttributeValue(openingElement, 'description');

  if (!name) {
    throw ctx.createError('Skill requires name prop', openingElement);
  }
  if (!description) {
    throw ctx.createError('Skill requires description prop', openingElement);
  }

  // Validate skill name (lowercase, numbers, hyphens only)
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw ctx.createError(
      `Skill name must be lowercase letters, numbers, and hyphens only: '${name}'`,
      openingElement
    );
  }

  // Extract optional props
  const disableModelInvocation = getBooleanAttribute(openingElement, 'disableModelInvocation');
  const userInvocable = getBooleanAttribute(openingElement, 'userInvocable');
  const allowedTools = getArrayAttributeValue(openingElement, 'allowedTools');
  const argumentHint = getAttributeValue(openingElement, 'argumentHint');
  const model = getAttributeValue(openingElement, 'model');
  const context = getAttributeValue(openingElement, 'context') as 'fork' | undefined;
  const agent = getAttributeValue(openingElement, 'agent');

  // Build frontmatter
  const frontmatter: SkillFrontmatterNode = {
    kind: 'skillFrontmatter',
    name,
    description,
    ...(disableModelInvocation !== undefined && { disableModelInvocation }),
    ...(userInvocable !== undefined && { userInvocable }),
    ...(allowedTools && allowedTools.length > 0 && { allowedTools }),
    ...(argumentHint && { argumentHint }),
    ...(model && { model }),
    ...(context && { context }),
    ...(agent && { agent }),
  };

  // Process children: separate body content, SkillFile, and SkillStatic
  const { children, files, statics } = processSkillChildren(node, ctx);

  return {
    kind: 'skillDocument',
    frontmatter,
    children: children as BaseBlockNode[],
    files,
    statics,
  };
}

/**
 * Process Skill children into body content, SkillFile nodes, and SkillStatic nodes
 */
export function processSkillChildren(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): {
  children: BlockNode[];
  files: SkillFileNode[];
  statics: SkillStaticNode[];
} {
  if (Node.isJsxSelfClosingElement(node)) {
    return { children: [], files: [], statics: [] };
  }

  const children: BlockNode[] = [];
  const files: SkillFileNode[] = [];
  const statics: SkillStaticNode[] = [];
  const jsxChildren = node.getJsxChildren();

  for (const child of jsxChildren) {
    // Skip whitespace-only text
    if (Node.isJsxText(child)) {
      const text = extractText(child);
      if (!text) continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);

      if (childName === 'SkillFile') {
        files.push(transformSkillFile(child, ctx));
        continue;
      }

      if (childName === 'SkillStatic') {
        statics.push(transformSkillStatic(child, ctx));
        continue;
      }
    }

    // Regular body content - requires dispatch (Plan 26-04)
    throw new Error('processSkillChildren: transformToBlock requires dispatch (Plan 26-04)');
  }

  return { children, files, statics };
}

/**
 * Transform SkillFile element to SkillFileNode
 */
export function transformSkillFile(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): SkillFileNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const name = getAttributeValue(openingElement, 'name');
  if (!name) {
    throw ctx.createError('SkillFile requires name prop', openingElement);
  }

  // Transform children as file content
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'skillFile',
    name,
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform SkillStatic element to SkillStaticNode
 */
export function transformSkillStatic(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): SkillStaticNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const src = getAttributeValue(openingElement, 'src');
  if (!src) {
    throw ctx.createError('SkillStatic requires src prop', openingElement);
  }

  const dest = getAttributeValue(openingElement, 'dest');

  return {
    kind: 'skillStatic',
    src,
    ...(dest && { dest }),
  };
}

// ============================================================================
// MCPConfig Transformer
// ============================================================================

/**
 * Transform an MCPConfig element to MCPConfigDocumentNode
 */
export function transformMCPConfig(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): MCPConfigDocumentNode {
  const servers: MCPServerNode[] = [];

  // Process children - expect MCPServer elements
  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      // Skip whitespace-only text
      if (Node.isJsxText(child)) {
        const text = extractText(child);
        if (!text) continue;
      }

      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const tagName = getElementName(child);

        if (tagName === 'MCPServer' || tagName === 'MCPStdioServer' || tagName === 'MCPHTTPServer') {
          servers.push(transformMCPServer(child, ctx));
        } else {
          throw ctx.createError(
            `MCPConfig can only contain MCPServer, MCPStdioServer, or MCPHTTPServer elements. Got: <${tagName}>`,
            child
          );
        }
      }
    }
  }

  if (servers.length === 0) {
    throw ctx.createError('MCPConfig must contain at least one MCP server', node);
  }

  return {
    kind: 'mcpConfigDocument',
    servers,
  };
}

/**
 * Transform an MCPServer, MCPStdioServer, or MCPHTTPServer element to MCPServerNode
 * Validates prop combinations at compile time based on transport type
 */
export function transformMCPServer(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): MCPServerNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const tagName = getElementName(node);

  // Get name (required for all)
  const name = getAttributeValue(openingElement, 'name');
  if (!name) {
    throw ctx.createError(`${tagName} requires name prop`, openingElement);
  }

  // Determine type based on tag name or explicit prop
  let type: 'stdio' | 'http' | 'sse';
  if (tagName === 'MCPStdioServer') {
    type = 'stdio';
  } else if (tagName === 'MCPHTTPServer') {
    type = 'http';
  } else {
    const typeProp = getAttributeValue(openingElement, 'type') as 'stdio' | 'http' | 'sse' | undefined;
    if (!typeProp) {
      throw ctx.createError('MCPServer requires type prop', openingElement);
    }
    if (!['stdio', 'http', 'sse'].includes(typeProp)) {
      throw ctx.createError(
        `MCPServer type must be 'stdio', 'http', or 'sse'. Got: '${typeProp}'`,
        openingElement
      );
    }
    type = typeProp;
  }

  // Type-specific validation and extraction
  if (type === 'stdio') {
    const command = getAttributeValue(openingElement, 'command');
    if (!command) {
      throw ctx.createError(
        `${tagName} type="stdio" requires command prop`,
        openingElement
      );
    }
    if (getAttributeValue(openingElement, 'url')) {
      throw ctx.createError(
        `${tagName} type="stdio" cannot have url prop`,
        openingElement
      );
    }
    if (hasAttribute(openingElement, 'headers')) {
      throw ctx.createError(
        `${tagName} type="stdio" cannot have headers prop`,
        openingElement
      );
    }

    // Extract stdio-specific props
    const args = extractArrayAttribute(openingElement, 'args');
    const env = extractObjectAttribute(openingElement, 'env', ctx);

    const result: MCPServerNode = {
      kind: 'mcpServer',
      name,
      type,
      command,
    };
    if (args) result.args = args;
    if (env) result.env = env;
    return result;
  } else {
    // http or sse
    const url = getAttributeValue(openingElement, 'url');
    if (!url) {
      throw ctx.createError(
        `${tagName} type="${type}" requires url prop`,
        openingElement
      );
    }
    if (getAttributeValue(openingElement, 'command')) {
      throw ctx.createError(
        `${tagName} type="${type}" cannot have command prop`,
        openingElement
      );
    }
    if (hasAttribute(openingElement, 'args')) {
      throw ctx.createError(
        `${tagName} type="${type}" cannot have args prop`,
        openingElement
      );
    }

    // Extract http/sse-specific props
    const headers = extractObjectAttribute(openingElement, 'headers', ctx);

    const result: MCPServerNode = {
      kind: 'mcpServer',
      name,
      type,
      url,
    };
    if (headers) result.headers = headers;
    return result;
  }
}

// ============================================================================
// State Transformer
// ============================================================================

/**
 * Transform a State element to StateDocumentNode
 */
export function transformState(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): StateDocumentNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Extract required props
  const name = getAttributeValue(opening, 'name');
  if (!name) {
    throw ctx.createError('State component requires name prop', node);
  }

  const provider = getAttributeValue(opening, 'provider');
  if (provider !== 'sqlite') {
    throw ctx.createError('State component only supports provider="sqlite"', node);
  }

  // Extract config prop (object literal)
  const configAttr = opening.getAttribute('config');
  let database = '.state/state.db';  // default
  if (configAttr && Node.isJsxAttribute(configAttr)) {
    const init = configAttr.getInitializer();
    if (init && Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && Node.isObjectLiteralExpression(expr)) {
        for (const prop of expr.getProperties()) {
          if (Node.isPropertyAssignment(prop)) {
            const propName = prop.getName();
            if (propName === 'database') {
              const propInit = prop.getInitializer();
              if (propInit && Node.isStringLiteral(propInit)) {
                database = propInit.getLiteralValue();
              }
            }
          }
        }
      }
    }
  }

  // Extract schema from generic type parameter
  let schema: StateSchema = { interfaceName: 'unknown', fields: [] };
  if (ctx.sourceFile) {
    const typeArgs = extractTypeArguments(node);
    if (typeArgs && typeArgs.length > 0) {
      const schemaTypeName = typeArgs[0];
      const extracted = extractStateSchema(ctx.sourceFile, schemaTypeName);
      if (extracted) {
        schema = extracted;
      } else {
        console.warn(`Warning: Could not find interface ${schemaTypeName} in source file`);
      }
    }
  }

  // Extract Operation children
  const operations: OperationNode[] = [];
  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = getElementName(child);
        if (childName === 'Operation') {
          operations.push(transformOperation(child, ctx));
        }
      }
    }
  }

  const stateNode: StateNode = {
    kind: 'state',
    name,
    provider: 'sqlite',
    config: { database },
    schema,
    operations
  };

  return {
    kind: 'stateDocument',
    state: stateNode
  };
}

/**
 * Transform an Operation component into OperationNode
 */
export function transformOperation(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): OperationNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Extract required name prop
  const name = getAttributeValue(opening, 'name');
  if (!name) {
    throw ctx.createError('Operation component requires name prop', node);
  }

  // Extract SQL template from children (text content)
  let sqlTemplate = '';
  if (Node.isJsxElement(node)) {
    const parts: string[] = [];
    for (const child of node.getJsxChildren()) {
      if (Node.isJsxText(child)) {
        parts.push(child.getText());
      } else if (Node.isJsxExpression(child)) {
        // Handle template literals in expressions
        const expr = child.getExpression();
        if (expr && Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (expr && Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        }
      }
    }
    sqlTemplate = parts.join('').trim();
  }

  // Infer arguments from $variable patterns in SQL
  const args = extractSqlArguments(sqlTemplate);

  return {
    kind: 'operation',
    name,
    sqlTemplate,
    args
  };
}
