/**
 * Swarm component transformers
 *
 * Transforms TaskDef and TaskPipeline JSX components to IR nodes.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement } from 'ts-morph';
import type { TaskDefNode, TaskPipelineNode } from '../../ir/swarm-nodes.js';
import type { TransformContext } from './types.js';
import { getAttributeValue, getBooleanAttribute } from '../utils/index.js';

/**
 * Extract TaskRef from a JSX attribute value
 *
 * Handles: task={Research} where Research is a defineTask() result
 * Returns the TaskRef properties (__id, subject, name)
 */
function extractTaskRefFromAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
  ctx: TransformContext
): { taskId: string; subject: string; name: string } | null {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return null;
  }

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    return null;
  }

  const expr = init.getExpression();
  if (!expr || !Node.isIdentifier(expr)) {
    return null;
  }

  // Get the variable name and look up its declaration
  const varName = expr.getText();
  const sourceFile = ctx.sourceFile;
  if (!sourceFile) {
    return null;
  }

  // Find the defineTask() call for this variable
  for (const stmt of sourceFile.getStatements()) {
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        if (decl.getName() === varName) {
          const initializer = decl.getInitializer();
          if (initializer && Node.isCallExpression(initializer)) {
            const callee = initializer.getExpression();
            if (Node.isIdentifier(callee) && callee.getText() === 'defineTask') {
              const args = initializer.getArguments();
              if (args.length >= 1) {
                // Get subject (first arg)
                const subjectArg = args[0];
                let subject = '';
                if (Node.isStringLiteral(subjectArg)) {
                  subject = subjectArg.getLiteralValue();
                }

                // Get name (second arg) or derive from subject
                let name = '';
                if (args.length >= 2) {
                  const nameArg = args[1];
                  if (Node.isStringLiteral(nameArg)) {
                    name = nameArg.getLiteralValue();
                  }
                }
                if (!name) {
                  // Derive name from subject: lowercase, truncate, replace spaces
                  name = subject
                    .slice(0, 15)
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/-+$/, '');
                }

                // Generate deterministic ID based on variable name
                // In real usage, the TaskRef already has a __id from defineTask()
                // but we can't access runtime values, so we use the variable name
                const taskId = `task:${varName}`;

                return { taskId, subject, name };
              }
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Extract blockedBy array from JSX attribute
 *
 * Handles: blockedBy={[Research, Plan]} or blockedBy={[Research]}
 * Returns array of task IDs
 */
function extractBlockedByIds(
  element: JsxOpeningElement | JsxSelfClosingElement,
  ctx: TransformContext
): string[] {
  const attr = element.getAttribute('blockedBy');
  if (!attr || !Node.isJsxAttribute(attr)) {
    return [];
  }

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    return [];
  }

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) {
    return [];
  }

  const ids: string[] = [];
  for (const elem of expr.getElements()) {
    if (Node.isIdentifier(elem)) {
      // Use the variable name as task ID (matches extractTaskRefFromAttribute)
      ids.push(`task:${elem.getText()}`);
    }
  }

  return ids;
}

/**
 * Transform TaskDef component to TaskDefNode IR
 */
export function transformTaskDef(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TaskDefNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract task prop (required)
  const taskRef = extractTaskRefFromAttribute(openingElement, 'task', ctx);
  if (!taskRef) {
    throw ctx.createError('TaskDef requires a task prop with a defineTask() reference', node);
  }

  // Extract description prop (required)
  const description = getAttributeValue(openingElement, 'description');
  if (!description) {
    throw ctx.createError('TaskDef requires a description prop', node);
  }

  // Extract activeForm prop (optional)
  const activeForm = getAttributeValue(openingElement, 'activeForm');

  // Extract blockedBy prop (optional)
  const blockedByIds = extractBlockedByIds(openingElement, ctx);

  return {
    kind: 'taskDef',
    taskId: taskRef.taskId,
    subject: taskRef.subject,
    name: taskRef.name,
    description,
    activeForm: activeForm || undefined,
    blockedByIds: blockedByIds.length > 0 ? blockedByIds : undefined,
  };
}

/**
 * Transform TaskPipeline component to TaskPipelineNode IR
 */
export function transformTaskPipeline(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TaskPipelineNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract title prop (optional)
  const title = getAttributeValue(openingElement, 'title');

  // Extract autoChain prop (default: false)
  const autoChain = getBooleanAttribute(openingElement, 'autoChain') ?? false;

  // Transform TaskDef children
  const children: TaskDefNode[] = [];

  if (Node.isJsxElement(node)) {
    for (const child of node.getJsxChildren()) {
      // Skip whitespace text nodes
      if (Node.isJsxText(child)) {
        continue;
      }

      if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
        const childName = Node.isJsxElement(child)
          ? child.getOpeningElement().getTagNameNode().getText()
          : child.getTagNameNode().getText();

        if (childName === 'TaskDef') {
          const taskDefNode = transformTaskDef(child, ctx);
          children.push(taskDefNode);
        } else {
          throw ctx.createError(`TaskPipeline only accepts TaskDef children, got: ${childName}`, child);
        }
      }
    }
  }

  // Apply autoChain: each task is blocked by the previous
  if (autoChain && children.length > 1) {
    for (let i = 1; i < children.length; i++) {
      const prevTaskId = children[i - 1].taskId;
      // Merge with existing blockedBy
      const existing = children[i].blockedByIds ?? [];
      if (!existing.includes(prevTaskId)) {
        children[i].blockedByIds = [prevTaskId, ...existing];
      }
    }
  }

  return {
    kind: 'taskPipeline',
    title: title || undefined,
    autoChain,
    children,
  };
}
