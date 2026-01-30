/**
 * JSX traversal and attribute extraction utilities
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  JsxFragment,
  JsxText,
  JsxExpression,
  ArrayLiteralExpression,
  CallExpression,
  SourceFile,
} from 'ts-morph';

/**
 * Forward reference for ExtractedVariable type (defined in variable-extraction.ts)
 */
interface ExtractedVariable {
  localName: string;
  envName: string;
}

/**
 * Get the element tag name from a JSX element or self-closing element
 */
export function getElementName(
  node: JsxElement | JsxSelfClosingElement
): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  return node.getTagNameNode().getText();
}

/**
 * JSX child node types
 */
export type JsxChild = JsxElement | JsxSelfClosingElement | JsxText | JsxExpression;

/**
 * Get the JSX children of an element
 */
export function getJsxChildren(node: JsxElement): JsxChild[] {
  return node.getJsxChildren() as JsxChild[];
}

/**
 * Get the value of a JSX attribute by name
 *
 * Handles both string literals (attr="value") and JSX expressions with
 * string literals (attr={"value"}).
 *
 * Returns undefined if attribute is missing or not a string.
 */
export function getAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: attr="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: attr={value} or attr={"value"}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
  }

  return undefined;
}

/**
 * Known test helper function names from jsx.ts
 */
const TEST_HELPERS = new Set(['fileExists', 'dirExists', 'isEmpty', 'notEmpty', 'equals', 'and', 'or']);

/**
 * Get the value of a test attribute, supporting both string literals
 * and test helper function calls like fileExists(varRef), isEmpty(varRef), etc.
 *
 * @param element - The JSX element to get the attribute from
 * @param name - The attribute name (typically 'test')
 * @param variables - Map of declared useVariable results for resolving identifiers
 * @returns The test expression string, or undefined if not found/invalid
 */
export function getTestAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: attr="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: attr={value}, attr={"value"}, or attr={helperFn(var)}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) {
      return undefined;
    }

    // String literal inside expression: attr={"value"}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Call expression: attr={fileExists(varRef)} or attr={equals(varRef, "value")}
    if (Node.isCallExpression(expr)) {
      return evaluateTestHelperCall(expr, variables);
    }
  }

  return undefined;
}

/**
 * ts-morph Node type alias for use in local function signatures
 */
type TsMorphNode = import('ts-morph').Node;

/**
 * Evaluate a test helper function call at compile time.
 *
 * Supports:
 * - fileExists(varRef) -> [ -f $VAR_NAME ]
 * - dirExists(varRef) -> [ -d $VAR_NAME ]
 * - isEmpty(varRef) -> [ -z "$VAR_NAME" ]
 * - notEmpty(varRef) -> [ -n "$VAR_NAME" ]
 * - equals(varRef, "value") -> [ $VAR_NAME = value ]
 * - and(...tests) -> test1 && test2 && ...
 * - or(...tests) -> test1 || test2 || ...
 */
function evaluateTestHelperCall(
  callExpr: CallExpression,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  const callee = callExpr.getExpression();
  if (!Node.isIdentifier(callee)) {
    return undefined;
  }

  const funcName = callee.getText();
  if (!TEST_HELPERS.has(funcName)) {
    return undefined;
  }

  const args = callExpr.getArguments();

  switch (funcName) {
    case 'fileExists': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -f $${varName} ]` : undefined;
    }
    case 'dirExists': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -d $${varName} ]` : undefined;
    }
    case 'isEmpty': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -z "$${varName}" ]` : undefined;
    }
    case 'notEmpty': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -n "$${varName}" ]` : undefined;
    }
    case 'equals': {
      const varName = resolveVariableArg(args[0], variables);
      const value = args[1] && Node.isStringLiteral(args[1]) ? args[1].getLiteralValue() : undefined;
      return varName && value ? `[ $${varName} = ${value} ]` : undefined;
    }
    case 'and': {
      const tests = args.map((arg: TsMorphNode) => evaluateTestArg(arg, variables)).filter((t: string | undefined): t is string => t !== undefined);
      return tests.length > 0 ? tests.join(' && ') : undefined;
    }
    case 'or': {
      const tests = args.map((arg: TsMorphNode) => evaluateTestArg(arg, variables)).filter((t: string | undefined): t is string => t !== undefined);
      return tests.length > 0 ? tests.join(' || ') : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Resolve a variable reference argument to its shell variable name.
 */
function resolveVariableArg(
  arg: TsMorphNode | undefined,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  if (!arg || !Node.isIdentifier(arg)) {
    return undefined;
  }
  const variable = variables.get(arg.getText());
  return variable?.envName;
}

/**
 * Evaluate a test argument for and/or composition.
 * Handles both string literals and nested helper calls.
 */
function evaluateTestArg(
  arg: TsMorphNode,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  if (Node.isStringLiteral(arg)) {
    return arg.getLiteralValue();
  }
  if (Node.isCallExpression(arg)) {
    return evaluateTestHelperCall(arg, variables);
  }
  return undefined;
}

/**
 * Find the root JSX element returned by the default export function
 *
 * Searches for a ReturnStatement containing JSX within the file.
 * Returns null if no JSX is found.
 */
export function findRootJsxElement(
  sourceFile: SourceFile
): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  let result: JsxElement | JsxSelfClosingElement | JsxFragment | null = null;

  sourceFile.forEachDescendant((node, traversal) => {
    // Look for return statements
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (expr) {
        // Check if the return expression is JSX
        if (Node.isJsxElement(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isJsxSelfClosingElement(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isJsxFragment(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isParenthesizedExpression(expr)) {
          // Handle parenthesized JSX: return (<div>...</div>)
          const inner = expr.getExpression();
          if (Node.isJsxElement(inner)) {
            result = inner;
            traversal.stop();
          } else if (Node.isJsxSelfClosingElement(inner)) {
            result = inner;
            traversal.stop();
          } else if (Node.isJsxFragment(inner)) {
            result = inner;
            traversal.stop();
          }
        }
      }
    }
  });

  return result;
}

/**
 * Get the value of a JSX array attribute by name
 *
 * Handles JSX expressions containing array literals: attr={["a", "b"]}
 * Returns undefined if attribute is missing or not a string array.
 */
export function getArrayAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string[] | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    return undefined;
  }

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) {
    return undefined;
  }

  const elements: string[] = [];
  for (const el of expr.getElements()) {
    if (Node.isStringLiteral(el)) {
      elements.push(el.getLiteralValue());
    }
  }
  return elements.length > 0 ? elements : undefined;
}
