/**
 * Control flow transformer functions
 *
 * Transforms control flow components to IR nodes:
 * - If → IfNode
 * - Else → ElseNode
 * - Loop → LoopNode
 * - OnStatus → OnStatusNode
 *
 * Extracted from Transformer class for maintainability and modularity.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  SourceFile,
} from 'ts-morph';
import type {
  IfNode,
  ElseNode,
  LoopNode,
  OnStatusNode,
  BlockNode,
} from '../../ir/index.js';
import {
  getElementName,
  getAttributeValue,
  getTestAttributeValue,
  extractTypeArguments,
} from '../utils/index.js';
import type { TransformContext } from './types.js';
import { transformBlockChildren } from './dispatch.js';

// ============================================================================
// If/Else Transformers
// ============================================================================

/**
 * Transform If component to IfNode
 */
export function transformIf(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): IfNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract test prop (required)
  // Use getTestAttributeValue to support both string literals and test helper function calls
  const test = getTestAttributeValue(openingElement, 'test', ctx.variables);
  if (!test) {
    throw ctx.createError('If requires test prop', openingElement);
  }

  // Transform children as "then" block using helper
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'if',
    test,
    children,
  };
}

/**
 * Transform an Else element to ElseNode
 * Else is a block-level element that provides "otherwise" content
 */
export function transformElse(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ElseNode {
  // Transform children as "else" block
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'else',
    children,
  };
}

// ============================================================================
// Loop Transformer
// ============================================================================

/**
 * Transform Loop component to LoopNode IR
 */
export function transformLoop(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): LoopNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const as = getAttributeValue(openingElement, 'as');

  // Get items attribute as string representation
  const itemsAttr = openingElement.getAttribute('items');
  let items: string | undefined;
  if (itemsAttr && Node.isJsxAttribute(itemsAttr)) {
    const init = itemsAttr.getInitializer();
    if (init && Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr) {
        items = expr.getText();
      }
    }
  }

  // Extract type argument if present
  const typeArgs = extractTypeArguments(node);
  const typeParam = typeArgs && typeArgs.length > 0 ? typeArgs[0] : undefined;

  // Transform children
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'loop',
    as,
    items,
    typeParam,
    children,
  };
}

// ============================================================================
// OnStatus Transformer
// ============================================================================

/**
 * Transform OnStatus component to OnStatusNode
 * Handles agent output status checking
 */
export function transformOnStatus(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): OnStatusNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract output prop (required) - must be a JSX expression referencing an identifier
  const outputAttr = openingElement.getAttribute('output');
  if (!outputAttr || !Node.isJsxAttribute(outputAttr)) {
    throw ctx.createError('OnStatus requires output prop', openingElement);
  }

  const outputInit = outputAttr.getInitializer();
  if (!outputInit || !Node.isJsxExpression(outputInit)) {
    throw ctx.createError('OnStatus output must be a JSX expression: output={outputRef}', openingElement);
  }

  const outputExpr = outputInit.getExpression();
  if (!outputExpr || !Node.isIdentifier(outputExpr)) {
    throw ctx.createError('OnStatus output must reference a useOutput result', openingElement);
  }

  // Get the identifier text
  const outputIdentifier = outputExpr.getText();

  // Look up agent name from outputs map
  const agentName = ctx.outputs.get(outputIdentifier);
  if (!agentName) {
    throw ctx.createError(
      `Output '${outputIdentifier}' not found. Did you declare it with useOutput()?`,
      openingElement
    );
  }

  // Extract status prop (required)
  const status = getAttributeValue(openingElement, 'status');
  if (!status) {
    throw ctx.createError('OnStatus requires status prop', openingElement);
  }

  // Validate status is one of the allowed values
  const validStatuses = ['SUCCESS', 'BLOCKED', 'NOT_FOUND', 'ERROR', 'CHECKPOINT'];
  if (!validStatuses.includes(status)) {
    throw ctx.createError(
      `OnStatus status must be one of: ${validStatuses.join(', ')}. Got: ${status}`,
      openingElement
    );
  }

  // Transform children as block content
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'onStatus',
    outputRef: {
      kind: 'outputReference',
      agent: agentName,
    },
    status: status as OnStatusNode['status'],
    children,
  };
}

// ============================================================================
// Helper Functions for Hook Extraction
// ============================================================================

/**
 * Extract useOutput declarations from source file
 * Returns map of identifier name -> agent name
 *
 * Uses forEachDescendant to find declarations inside function bodies,
 * following the same pattern as extractVariableDeclarations in parser.ts
 */
export function extractOutputDeclarations(sourceFile: SourceFile): Map<string, string> {
  const outputs = new Map<string, string>();

  // Find all variable declarations (including inside functions)
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const init = node.getInitializer();
    if (!init || !Node.isCallExpression(init)) return;

    // Check if it's a useOutput call
    const expr = init.getExpression();
    if (!Node.isIdentifier(expr) || expr.getText() !== 'useOutput') return;

    const args = init.getArguments();
    if (args.length < 1) return;

    const agentArg = args[0];
    // Get the string literal value (agent name)
    if (Node.isStringLiteral(agentArg)) {
      const agentName = agentArg.getLiteralValue();
      const identName = node.getName();
      outputs.set(identName, agentName);
    }
  });

  return outputs;
}

/**
 * Extract useStateRef declarations from source file
 * Returns map of identifier name -> state key
 *
 * Uses forEachDescendant to find declarations inside function bodies,
 * following the same pattern as extractOutputDeclarations
 */
export function extractStateRefDeclarations(sourceFile: SourceFile): Map<string, string> {
  const stateRefs = new Map<string, string>();

  // Find all variable declarations (including inside functions)
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const init = node.getInitializer();
    if (!init || !Node.isCallExpression(init)) return;

    // Check if it's a useStateRef call
    const expr = init.getExpression();
    if (!Node.isIdentifier(expr) || expr.getText() !== 'useStateRef') return;

    const args = init.getArguments();
    if (args.length < 1) return;

    const keyArg = args[0];
    // Get the string literal value (state key)
    if (Node.isStringLiteral(keyArg)) {
      const stateKey = keyArg.getLiteralValue();
      const identName = node.getName();
      stateRefs.set(identName, stateKey);
    }
  });

  return stateRefs;
}
