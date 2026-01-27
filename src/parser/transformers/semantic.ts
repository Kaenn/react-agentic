/**
 * Semantic component transformer functions
 *
 * Transforms semantic workflow components to IR nodes:
 * - Table → TableNode
 * - List (prop-based) → ListNode
 * - ExecutionContext → ExecutionContextNode
 * - SuccessCriteria → SuccessCriteriaNode
 * - OfferNext → OfferNextNode
 * - XmlSection → XmlBlockNode
 * - XML wrapper components (DeviationRules, etc.) → XmlBlockNode
 *
 * Extracted from Transformer class for maintainability and modularity.
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  PropertyAccessExpression,
} from 'ts-morph';
import type {
  TableNode,
  ListNode,
  ListItemNode,
  ExecutionContextNode,
  SuccessCriteriaNode,
  SuccessCriteriaItemData,
  OfferNextNode,
  OfferNextRouteData,
  XmlBlockNode,
  BlockNode,
} from '../../ir/index.js';
import {
  getElementName,
  getAttributeValue,
  getArrayAttributeValue,
} from '../utils/index.js';
import type { TransformContext } from './types.js';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert PascalCase component name to snake_case XML tag name
 * Example: DeviationRules -> deviation_rules
 */
function toSnakeCase(name: string): string {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

/**
 * Interpolate a PropertyAccessExpression if it references render props context
 * Returns the interpolated value or null if not a context access
 */
function interpolatePropertyAccess(
  expr: PropertyAccessExpression,
  ctx: TransformContext
): string | null {
  const objExpr = expr.getExpression();
  const propName = expr.getName();

  if (Node.isIdentifier(objExpr) && ctx.renderPropsContext) {
    const objName = objExpr.getText();
    if (objName === ctx.renderPropsContext.paramName) {
      const value = ctx.renderPropsContext.values[propName];
      if (value !== undefined) {
        return value;
      }
    }
  }
  return null;
}

// ============================================================================
// Table Transformer
// ============================================================================

/**
 * Transform Table component to TableNode
 */
export function transformTable(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TableNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Parse array props
  const headers = getArrayAttributeValue(opening, 'headers');
  const rows = parseRowsAttribute(opening, ctx);
  const alignRaw = getArrayAttributeValue(opening, 'align');
  const emptyCell = getAttributeValue(opening, 'emptyCell');

  // Convert align strings to typed array
  const align = alignRaw?.map(a => {
    if (a === 'left' || a === 'center' || a === 'right') return a;
    return 'left'; // Default invalid values to left
  }) as ('left' | 'center' | 'right')[] | undefined;

  return {
    kind: 'table',
    headers: headers?.length ? headers : undefined,
    rows: rows,
    align: align,
    emptyCell: emptyCell || undefined,
  };
}

/**
 * Parse rows attribute (array of arrays)
 * Handles string literals, numbers, and context property access
 */
export function parseRowsAttribute(
  opening: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): string[][] {
  const attr = opening.getAttribute('rows');
  if (!attr || !Node.isJsxAttribute(attr)) return [];

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return [];

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

  const rows: string[][] = [];
  for (const element of expr.getElements()) {
    if (Node.isArrayLiteralExpression(element)) {
      const row: string[] = [];
      for (const cell of element.getElements()) {
        // Handle string literals, numbers, and expressions
        if (Node.isStringLiteral(cell)) {
          row.push(cell.getLiteralValue());
        } else if (Node.isNumericLiteral(cell)) {
          row.push(cell.getLiteralValue().toString());
        } else if (Node.isPropertyAccessExpression(cell)) {
          // Handle context property access (e.g., ctx.name)
          const interpolated = interpolatePropertyAccess(cell, ctx);
          row.push(interpolated ?? cell.getText());
        } else {
          row.push(cell.getText());
        }
      }
      rows.push(row);
    }
  }
  return rows;
}

// ============================================================================
// Prop-based List Transformer
// ============================================================================

/**
 * Transform List component (prop-based) to ListNode IR
 * This is separate from HTML <ul>/<ol> transformation
 */
export function transformPropList(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ListNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Parse props
  const items = getArrayAttributeValue(opening, 'items') ?? [];
  const ordered = getAttributeValue(opening, 'ordered') === 'true' ||
                  opening.getAttribute('ordered') !== undefined; // Handle boolean attr

  // Parse start attribute (numeric)
  let start: number | undefined = undefined;
  const startAttr = opening.getAttribute('start');
  if (startAttr && Node.isJsxAttribute(startAttr)) {
    const init = startAttr.getInitializer();
    if (init && Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr && Node.isNumericLiteral(expr)) {
        start = expr.getLiteralValue();
      }
    }
  }

  // Convert items to ListItemNode[]
  const listItems: ListItemNode[] = items.map(item => ({
    kind: 'listItem' as const,
    children: [{
      kind: 'paragraph' as const,
      children: [{ kind: 'text' as const, value: String(item) }]
    }]
  }));

  return {
    kind: 'list',
    ordered,
    items: listItems,
    start,
  };
}

// ============================================================================
// Semantic Workflow Components
// ============================================================================

/**
 * Transform ExecutionContext component to ExecutionContextNode
 */
export function transformExecutionContext(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ExecutionContextNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const paths = getArrayAttributeValue(opening, 'paths') ?? [];
  const prefix = getAttributeValue(opening, 'prefix') ?? '@';

  // Transform children if present - requires dispatch (Plan 26-04)
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    // NOTE: Requires transformToBlock dispatch - stub for now
    throw new Error('transformExecutionContext: children transformation requires dispatch (Plan 26-04)');
  }

  return {
    kind: 'executionContext',
    paths,
    prefix,
    children,
  };
}

/**
 * Transform SuccessCriteria component to SuccessCriteriaNode
 */
export function transformSuccessCriteria(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): SuccessCriteriaNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const items = parseSuccessCriteriaItems(opening);

  return {
    kind: 'successCriteria',
    items,
  };
}

/**
 * Parse items attribute for SuccessCriteria
 * Handles both string shorthand and {text, checked} objects
 */
export function parseSuccessCriteriaItems(
  opening: JsxOpeningElement | JsxSelfClosingElement
): SuccessCriteriaItemData[] {
  const attr = opening.getAttribute('items');
  if (!attr || !Node.isJsxAttribute(attr)) return [];

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return [];

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

  const items: SuccessCriteriaItemData[] = [];
  for (const element of expr.getElements()) {
    if (Node.isStringLiteral(element)) {
      // String shorthand: "item text"
      items.push({ text: element.getLiteralValue(), checked: false });
    } else if (Node.isObjectLiteralExpression(element)) {
      // Object: { text: "...", checked: true }
      let text = '';
      let checked = false;

      for (const prop of element.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
          const propName = prop.getName();
          const propInit = prop.getInitializer();

          if (propName === 'text' && propInit && Node.isStringLiteral(propInit)) {
            text = propInit.getLiteralValue();
          } else if (propName === 'checked' && propInit) {
            // Handle both boolean literal and truthy values
            if (propInit.getKind() === 112) { // TrueKeyword
              checked = true;
            } else if (propInit.getKind() === 97) { // FalseKeyword
              checked = false;
            }
          }
        }
      }

      items.push({ text, checked });
    }
  }

  return items;
}

/**
 * Transform OfferNext component to OfferNextNode
 */
export function transformOfferNext(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): OfferNextNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const routes = parseOfferNextRoutes(opening);

  return {
    kind: 'offerNext',
    routes,
  };
}

/**
 * Parse routes attribute for OfferNext
 * Each route is an object with name, path, and optional description
 */
export function parseOfferNextRoutes(
  opening: JsxOpeningElement | JsxSelfClosingElement
): OfferNextRouteData[] {
  const attr = opening.getAttribute('routes');
  if (!attr || !Node.isJsxAttribute(attr)) return [];

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) return [];

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) return [];

  const routes: OfferNextRouteData[] = [];
  for (const element of expr.getElements()) {
    if (Node.isObjectLiteralExpression(element)) {
      let name = '';
      let path = '';
      let description: string | undefined = undefined;

      for (const prop of element.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
          const propName = prop.getName();
          const propInit = prop.getInitializer();

          if (propInit && Node.isStringLiteral(propInit)) {
            const value = propInit.getLiteralValue();
            if (propName === 'name') {
              name = value;
            } else if (propName === 'path') {
              path = value;
            } else if (propName === 'description') {
              description = value;
            }
          }
        }
      }

      if (name && path) {
        routes.push({ name, path, description });
      }
    }
  }

  return routes;
}

// ============================================================================
// XML Block Transformers
// ============================================================================

/**
 * Transform XmlSection component to XmlBlockNode
 * Dynamic XML block with custom tag name
 */
export function transformXmlSection(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): XmlBlockNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  const name = getAttributeValue(opening, 'name') ?? 'section';

  // Transform children - requires dispatch (Plan 26-04)
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    throw new Error('transformXmlSection: children transformation requires dispatch (Plan 26-04)');
  }

  return {
    kind: 'xmlBlock',
    name,
    children,
  };
}

/**
 * Transform XML wrapper components to XmlBlockNode
 * Used for: DeviationRules, CommitRules, WaveExecution, CheckpointHandling
 */
export function transformXmlWrapper(
  componentName: string,
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): XmlBlockNode {
  // Convert component name to snake_case for XML tag
  const tagName = toSnakeCase(componentName);

  // Transform children - requires dispatch (Plan 26-04)
  const children: BlockNode[] = [];
  if (Node.isJsxElement(node)) {
    throw new Error('transformXmlWrapper: children transformation requires dispatch (Plan 26-04)');
  }

  return {
    kind: 'xmlBlock',
    name: tagName,
    children,
  };
}
