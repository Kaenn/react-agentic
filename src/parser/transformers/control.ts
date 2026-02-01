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
  OnStatusDefaultNode,
  OutputReference,
  BlockNode,
} from '../../ir/index.js';
import {
  getAttributeValue,
} from '../utils/index.js';
import type { TransformContext } from './types.js';
import { transformBlockChildren } from './dispatch.js';
import type { BaseBlockNode } from '../../ir/index.js';

// ============================================================================
// If/Else Transformers
// ============================================================================

/**
 * Transform If component to IfNode
 *
 * NOTE: Control flow (If/Else/Loop) is only supported in V3 Commands with runtime features.
 * Use the V3 transformers (v3-control.ts) for Commands.
 * This V1 transformer throws an error since Agent/Skill documents don't support control flow.
 */
export function transformIf(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): IfNode {
  throw ctx.createError(
    'If/Else control flow is only supported in V3 Commands. ' +
    'Use useRuntimeVar and the V3 If component, or remove control flow from Agent/Skill documents.',
    node
  );
}

/**
 * Transform an Else element to ElseNode
 *
 * NOTE: Control flow (If/Else/Loop) is only supported in V3 Commands with runtime features.
 * This V1 transformer throws an error since Agent/Skill documents don't support control flow.
 */
export function transformElse(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ElseNode {
  throw ctx.createError(
    'Else control flow is only supported in V3 Commands. ' +
    'Use useRuntimeVar and the V3 Else component, or remove control flow from Agent/Skill documents.',
    node
  );
}

// ============================================================================
// Loop Transformer
// ============================================================================

/**
 * Transform Loop component to LoopNode IR
 *
 * NOTE: Control flow (If/Else/Loop) is only supported in V3 Commands with runtime features.
 * This V1 transformer throws an error since Agent/Skill documents don't support control flow.
 */
export function transformLoop(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): LoopNode {
  throw ctx.createError(
    'Loop control flow is only supported in V3 Commands. ' +
    'Use useRuntimeVar and the V3 Loop component, or remove control flow from Agent/Skill documents.',
    node
  );
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
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform OnStatusDefault component to OnStatusDefaultNode
 * Handles catch-all for agent output statuses
 *
 * @param node - JSX element
 * @param ctx - Transform context
 * @param outputRef - Output reference from preceding OnStatus (sibling detection) or explicit prop
 */
export function transformOnStatusDefault(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  outputRef?: OutputReference
): OnStatusDefaultNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Check for explicit output prop
  const outputAttr = openingElement.getAttribute('output');
  let resolvedOutputRef: OutputReference | undefined = outputRef;

  if (outputAttr && Node.isJsxAttribute(outputAttr)) {
    const outputInit = outputAttr.getInitializer();
    if (outputInit && Node.isJsxExpression(outputInit)) {
      const outputExpr = outputInit.getExpression();
      if (outputExpr && Node.isIdentifier(outputExpr)) {
        const outputIdentifier = outputExpr.getText();
        const agentName = ctx.outputs.get(outputIdentifier);
        if (agentName) {
          resolvedOutputRef = {
            kind: 'outputReference',
            agent: agentName,
          };
        }
      }
    }
  }

  // Validate we have an output reference
  if (!resolvedOutputRef) {
    throw ctx.createError(
      'OnStatusDefault must follow OnStatus blocks or provide output prop',
      openingElement
    );
  }

  // Transform children as block content
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'onStatusDefault',
    outputRef: resolvedOutputRef,
    children: children as BaseBlockNode[],
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
