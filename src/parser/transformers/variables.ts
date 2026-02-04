/**
 * Variable transformation module
 *
 * Handles transformAssign, transformAssignGroup, and related helper functions
 * for shell variable assignment components.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement, TemplateExpression, SourceFile, ObjectLiteralExpression } from 'ts-morph';
import type { AssignNode, AssignGroupNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import type { RuntimeTransformContext } from './runtime-types.js';
import { extractTemplateContent } from './shared.js';
import { extractTemplateContentWithRuntimeVars } from './runtime-utils.js';

/**
 * Transform an Assign element to AssignNode
 * Assign emits a bash code block with variable assignment
 *
 * Uses from prop pattern: <Assign var={v} from={file("path")} />
 * Supports: file(), bash(), value(), env() source helpers
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

  // Check for from prop (required)
  const fromProp = openingElement.getAttribute('from');

  if (!fromProp) {
    throw ctx.createError(
      'Assign requires from prop with a source helper: from={file(...)} or from={bash(...)} or from={value(...)} or from={env(...)}',
      openingElement
    );
  }

  return transformAssignWithFrom(node, ctx, variable);
}

/**
 * Transform an Assign element with from prop
 * Handles: <Assign var={v} from={file("path")} /> or from={bash(`cmd`)} etc.
 */
function transformAssignWithFrom(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  variable: { envName: string }
): AssignNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract optional comment prop
  const commentProp = extractAssignPropValue(openingElement, 'comment');

  // Extract from prop value (JSX expression containing source helper call)
  const fromAttr = openingElement.getAttribute('from');
  if (!fromAttr || !Node.isJsxAttribute(fromAttr)) {
    throw ctx.createError('Assign from prop must be a JSX expression', openingElement);
  }

  const init = fromAttr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    throw ctx.createError('Assign from must be a JSX expression: from={file(...)}', openingElement);
  }

  const expr = init.getExpression();
  if (!expr) {
    throw ctx.createError('Assign from must contain a source helper call', openingElement);
  }

  // Check if from prop is an Identifier (RuntimeFnComponent reference)
  if (Node.isIdentifier(expr)) {
    const identName = expr.getText();
    const sourceFile = openingElement.getSourceFile();
    const fnName = findRuntimeFnName(sourceFile, identName);

    if (fnName) {
      // Extract args prop (required for runtimeFn)
      const argsAttr = openingElement.getAttribute('args');
      let args: Record<string, unknown> = {};

      if (argsAttr && Node.isJsxAttribute(argsAttr)) {
        const argsInit = argsAttr.getInitializer();
        if (argsInit && Node.isJsxExpression(argsInit)) {
          const argsExpr = argsInit.getExpression();
          if (argsExpr && Node.isObjectLiteralExpression(argsExpr)) {
            args = extractArgsObject(argsExpr);
          }
        }
      }

      return {
        kind: 'assign',
        variableName: variable.envName,
        assignment: { type: 'runtimeFn', fnName, args },
        ...(commentProp && { comment: commentProp }),
      };
    }
  }

  // Check if it's a call expression to a source helper (file, bash, value, env)
  if (Node.isCallExpression(expr)) {
    const callExpr = expr;
    const fnExpr = callExpr.getExpression();

    if (!Node.isIdentifier(fnExpr)) {
      throw ctx.createError('Assign from must call a source helper: file(), bash(), value(), env()', openingElement);
    }

    const fnName = fnExpr.getText();
    const args = callExpr.getArguments();

    // Handle each source type
    switch (fnName) {
      case 'file': {
        if (args.length === 0) {
          throw ctx.createError('file() requires a path argument', openingElement);
        }

        const pathArg = args[0];
        let path: string;

        // Extract path from string literal or template
        if (Node.isStringLiteral(pathArg)) {
          path = pathArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(pathArg)) {
          path = pathArg.getLiteralValue();
        } else if (Node.isTemplateExpression(pathArg)) {
          // Check if ctx has runtimeVars (V3 context)
          if ('runtimeVars' in ctx && ctx.runtimeVars) {
            path = extractTemplateContentWithRuntimeVars(pathArg, ctx as unknown as RuntimeTransformContext);
          } else {
            path = extractTemplateContent(pathArg);
          }
        } else {
          throw ctx.createError('file() path must be a string or template literal', openingElement);
        }

        // Check for optional option (second argument)
        const options = args.length > 1 ? args[1] : undefined;
        let optional = false;

        if (options && Node.isObjectLiteralExpression(options)) {
          const optionalProp = options.getProperty('optional');
          if (optionalProp && Node.isPropertyAssignment(optionalProp)) {
            const init = optionalProp.getInitializer();
            if (init && (init.getText() === 'true' || init.getText() === 'false')) {
              optional = init.getText() === 'true';
            }
          }
        }

        return {
          kind: 'assign',
          variableName: variable.envName,
          assignment: { type: 'file', path, ...(optional && { optional }) },
          ...(commentProp && { comment: commentProp }),
        };
      }

      case 'bash': {
        if (args.length === 0) {
          throw ctx.createError('bash() requires a command argument', openingElement);
        }

        const cmdArg = args[0];
        let content: string;

        if (Node.isStringLiteral(cmdArg)) {
          content = cmdArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(cmdArg)) {
          content = cmdArg.getLiteralValue();
        } else if (Node.isTemplateExpression(cmdArg)) {
          // Check if ctx has runtimeVars (V3 context)
          if ('runtimeVars' in ctx && ctx.runtimeVars) {
            content = extractTemplateContentWithRuntimeVars(cmdArg, ctx as unknown as RuntimeTransformContext);
          } else {
            content = extractTemplateContent(cmdArg);
          }
        } else {
          throw ctx.createError('bash() command must be a string or template literal', openingElement);
        }

        return {
          kind: 'assign',
          variableName: variable.envName,
          assignment: { type: 'bash', content },
          ...(commentProp && { comment: commentProp }),
        };
      }

      case 'value': {
        if (args.length === 0) {
          throw ctx.createError('value() requires a value argument', openingElement);
        }

        const valArg = args[0];
        let content: string;

        if (Node.isStringLiteral(valArg)) {
          content = valArg.getLiteralValue();
        } else if (Node.isNoSubstitutionTemplateLiteral(valArg)) {
          content = valArg.getLiteralValue();
        } else if (Node.isTemplateExpression(valArg)) {
          // Check if ctx has runtimeVars (V3 context)
          if ('runtimeVars' in ctx && ctx.runtimeVars) {
            content = extractTemplateContentWithRuntimeVars(valArg, ctx as unknown as RuntimeTransformContext);
          } else {
            content = extractTemplateContent(valArg);
          }
        } else {
          throw ctx.createError('value() must be a string or template literal', openingElement);
        }

        // Check for raw option (second argument)
        const options = args.length > 1 ? args[1] : undefined;
        let raw = false;

        if (options && Node.isObjectLiteralExpression(options)) {
          const rawProp = options.getProperty('raw');
          if (rawProp && Node.isPropertyAssignment(rawProp)) {
            const init = rawProp.getInitializer();
            if (init && (init.getText() === 'true' || init.getText() === 'false')) {
              raw = init.getText() === 'true';
            }
          }
        }

        return {
          kind: 'assign',
          variableName: variable.envName,
          assignment: { type: 'value', content, ...(raw && { raw }) },
          ...(commentProp && { comment: commentProp }),
        };
      }

      case 'env': {
        if (args.length === 0) {
          throw ctx.createError('env() requires an environment variable name', openingElement);
        }

        const envArg = args[0];
        let content: string;

        if (Node.isStringLiteral(envArg)) {
          content = envArg.getLiteralValue();
        } else {
          throw ctx.createError('env() variable name must be a string literal', openingElement);
        }

        return {
          kind: 'assign',
          variableName: variable.envName,
          assignment: { type: 'env', content },
          ...(commentProp && { comment: commentProp }),
        };
      }

      default:
        throw ctx.createError(
          `Unknown source helper: ${fnName}. Use file(), bash(), value(), or env()`,
          openingElement
        );
    }
  }

  throw ctx.createError(
    'Assign from must be a source helper call: file(), bash(), value(), or env()',
    openingElement
  );
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
      return extractTemplateContent(expr);
    }
  }

  return undefined;
}

/**
 * Find the function name from a runtimeFn wrapper declaration
 * Scans source file for: const WrapperName = runtimeFn(fnName)
 */
function findRuntimeFnName(sourceFile: SourceFile, wrapperName: string): string | null {
  for (const statement of sourceFile.getStatements()) {
    if (!Node.isVariableStatement(statement)) continue;

    for (const decl of statement.getDeclarationList().getDeclarations()) {
      if (decl.getName() !== wrapperName) continue;

      const init = decl.getInitializer();
      if (!init || !Node.isCallExpression(init)) continue;

      const callExpr = init.getExpression();
      if (!Node.isIdentifier(callExpr) || callExpr.getText() !== 'runtimeFn') continue;

      const args = init.getArguments();
      if (args.length > 0 && Node.isIdentifier(args[0])) {
        return args[0].getText();
      }
    }
  }
  return null;
}

/**
 * Extract object literal to Record<string, unknown>
 */
function extractArgsObject(objExpr: ObjectLiteralExpression): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const prop of objExpr.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const init = prop.getInitializer();
      if (init) {
        if (Node.isStringLiteral(init)) args[name] = init.getLiteralValue();
        else if (Node.isNumericLiteral(init)) args[name] = Number(init.getLiteralValue());
        else if (init.getText() === 'true') args[name] = true;
        else if (init.getText() === 'false') args[name] = false;
        else args[name] = init.getText(); // Fallback to source text
      }
    }
  }
  return args;
}
