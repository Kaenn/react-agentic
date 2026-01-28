/**
 * Runtime Call Transformer
 *
 * Transforms <RuntimeFn.Call args={...} output={...} /> elements
 * to RuntimeCallNode IR nodes.
 */

import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';
import type { RuntimeCallNode } from '../../ir/index.js';
import type { V3TransformContext } from './types.js';
import { resolveRuntimeFn, markRuntimeFnUsed } from './runtime-fn.js';
import { parseScriptVarRef } from './script-var.js';
import { getAttributeExpression, extractJsonValue } from './utils.js';

// ============================================================================
// RuntimeFn.Call Detection
// ============================================================================

/**
 * Check if a JSX element is a RuntimeFn.Call invocation
 *
 * Looks for patterns like:
 * - <Init.Call ... />
 * - <GetContext.Call ... />
 *
 * Where Init/GetContext are registered RuntimeFn wrappers.
 */
export function isRuntimeFnCall(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): boolean {
  const tagName = getTagName(node);
  if (!tagName) return false;

  // Check for .Call suffix
  if (!tagName.endsWith('.Call')) return false;

  // Extract wrapper name
  const wrapperName = tagName.slice(0, -5); // Remove '.Call'

  // Check if wrapper is a registered RuntimeFn
  return ctx.runtimeFunctions.has(wrapperName);
}

/**
 * Get the tag name from a JSX element
 */
function getTagName(node: JsxElement | JsxSelfClosingElement): string | null {
  if (Node.isJsxElement(node)) {
    const tagNode = node.getOpeningElement().getTagNameNode();
    return tagNode.getText();
  }
  if (Node.isJsxSelfClosingElement(node)) {
    const tagNode = node.getTagNameNode();
    return tagNode.getText();
  }
  return null;
}

// ============================================================================
// Transformer
// ============================================================================

/**
 * Transform RuntimeFn.Call to RuntimeCallNode
 *
 * Input JSX:
 * <Init.Call args={{ projectPath: "." }} output={ctx} />
 *
 * Output IR:
 * {
 *   kind: 'runtimeCall',
 *   fnName: 'initProject',
 *   args: { projectPath: '.' },
 *   outputVar: 'CTX'
 * }
 */
export function transformRuntimeCall(
  node: JsxElement | JsxSelfClosingElement,
  ctx: V3TransformContext
): RuntimeCallNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract wrapper name from tag
  const tagName = getTagName(node);
  if (!tagName || !tagName.endsWith('.Call')) {
    throw ctx.createError('Expected RuntimeFn.Call element', openingElement);
  }

  const wrapperName = tagName.slice(0, -5);
  const fnInfo = resolveRuntimeFn(wrapperName, ctx);

  if (!fnInfo) {
    throw ctx.createError(
      `Unknown RuntimeFn wrapper: ${wrapperName}. Did you declare it with runtimeFn()?`,
      openingElement
    );
  }

  // Mark function as used (for extraction)
  markRuntimeFnUsed(wrapperName, ctx);

  // Extract args prop (required)
  const argsExpr = getAttributeExpression(openingElement, 'args');
  if (!argsExpr) {
    throw ctx.createError(
      `${wrapperName}.Call requires args prop`,
      openingElement
    );
  }

  // Parse args to JSON-serializable object
  let args: Record<string, unknown>;
  if (Node.isObjectLiteralExpression(argsExpr)) {
    args = extractJsonValue(argsExpr) as Record<string, unknown>;
  } else {
    throw ctx.createError(
      `${wrapperName}.Call args must be an object literal`,
      argsExpr
    );
  }

  // Extract output prop (required)
  const outputExpr = getAttributeExpression(openingElement, 'output');
  if (!outputExpr) {
    throw ctx.createError(
      `${wrapperName}.Call requires output prop (ScriptVar reference)`,
      openingElement
    );
  }

  // Parse output to ScriptVar reference
  const outputRef = parseScriptVarRef(outputExpr, ctx);
  if (!outputRef) {
    throw ctx.createError(
      `${wrapperName}.Call output must be a useRuntimeVar reference`,
      outputExpr
    );
  }

  // Output should be the root variable (no path)
  if (outputRef.path.length > 0) {
    throw ctx.createError(
      `${wrapperName}.Call output must reference the variable directly, not a property`,
      outputExpr
    );
  }

  // Apply namespace prefix to function name
  const namespacedFnName = ctx.namespace
    ? `${ctx.namespace}_${fnInfo.fnName}`
    : fnInfo.fnName;

  return {
    kind: 'runtimeCall',
    fnName: namespacedFnName,
    args,
    outputVar: outputRef.varName,
  };
}
