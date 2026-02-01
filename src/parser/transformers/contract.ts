/**
 * Contract Component Transformers
 *
 * Transforms agent contract components to IR nodes:
 * - Role → RoleNode
 * - UpstreamInput → UpstreamInputNode
 * - DownstreamConsumer → DownstreamConsumerNode
 * - Methodology → MethodologyNode
 * - StructuredReturns → StructuredReturnsNode (with Return children)
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
} from 'ts-morph';
import type {
  RoleNode,
  UpstreamInputNode,
  DownstreamConsumerNode,
  MethodologyNode,
  StructuredReturnsNode,
  ReturnStatusNode,
  BaseBlockNode,
} from '../../ir/nodes.js';
import { getElementName, getAttributeValue } from '../utils/index.js';
import type { TransformContext } from './types.js';
import { transformBlockChildren as dispatchTransformBlockChildren } from './dispatch.js';

// ============================================================================
// Helper
// ============================================================================

/**
 * Get transformBlockChildren function from context or fallback to dispatch
 */
function getTransformBlockChildren(ctx: TransformContext) {
  return ctx.transformBlockChildren ?? dispatchTransformBlockChildren;
}

// ============================================================================
// Simple Container Transformers
// ============================================================================

/**
 * Transform Role component to RoleNode
 */
export function transformRole(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): RoleNode {
  const children = Node.isJsxElement(node)
    ? getTransformBlockChildren(ctx)(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'role',
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform UpstreamInput component to UpstreamInputNode
 */
export function transformUpstreamInput(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): UpstreamInputNode {
  const children = Node.isJsxElement(node)
    ? getTransformBlockChildren(ctx)(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'upstreamInput',
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform DownstreamConsumer component to DownstreamConsumerNode
 */
export function transformDownstreamConsumer(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): DownstreamConsumerNode {
  const children = Node.isJsxElement(node)
    ? getTransformBlockChildren(ctx)(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'downstreamConsumer',
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform Methodology component to MethodologyNode
 */
export function transformMethodology(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): MethodologyNode {
  const children = Node.isJsxElement(node)
    ? getTransformBlockChildren(ctx)(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'methodology',
    children: children as BaseBlockNode[],
  };
}

// ============================================================================
// StructuredReturns Transformer
// ============================================================================

/**
 * Transform ReturnStatus component to ReturnStatusNode
 * Only valid inside StructuredReturns
 */
export function transformReturn(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ReturnStatusNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const status = getAttributeValue(opening, 'status');
  if (!status) {
    throw ctx.createError('Return requires status prop', node);
  }

  const children = Node.isJsxElement(node)
    ? getTransformBlockChildren(ctx)(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'returnStatus',
    status,
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform StructuredReturns component to StructuredReturnsNode
 * Contains ReturnStatus children only
 */
export function transformStructuredReturns(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): StructuredReturnsNode {
  if (Node.isJsxSelfClosingElement(node)) {
    throw ctx.createError('StructuredReturns must have ReturnStatus children', node);
  }

  const returns: ReturnStatusNode[] = [];

  for (const child of node.getJsxChildren()) {
    // Skip whitespace-only text
    if (Node.isJsxText(child)) {
      const text = child.getText().trim();
      if (!text) continue;
      // Non-empty text inside StructuredReturns is an error
      throw ctx.createError(
        'StructuredReturns can only contain ReturnStatus components, not text',
        child
      );
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = getElementName(child);
      if (childName === 'ReturnStatus' || childName === 'StatusReturn') {
        returns.push(transformReturn(child, ctx));
      } else {
        throw ctx.createError(
          `StructuredReturns can only contain ReturnStatus/StatusReturn components, not <${childName}>`,
          child
        );
      }
    }
  }

  if (returns.length === 0) {
    throw ctx.createError('StructuredReturns must have at least one ReturnStatus child', node);
  }

  return {
    kind: 'structuredReturns',
    returns,
  };
}

// ============================================================================
// Contract Component Detection
// ============================================================================

/**
 * Check if element name is a contract component
 */
export function isContractComponent(name: string): boolean {
  return [
    'Role',
    'UpstreamInput',
    'DownstreamConsumer',
    'Methodology',
    'StructuredReturns',
    'ReturnStatus',
    'StatusReturn',
  ].includes(name);
}
