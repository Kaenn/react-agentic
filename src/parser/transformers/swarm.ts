/**
 * Swarm component transformers
 *
 * Transforms TaskDef, TaskPipeline, Team, and Teammate JSX components to IR nodes.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement } from 'ts-morph';
import type { TaskDefNode, TaskPipelineNode, TeamNode, TeammateNode, ShutdownSequenceNode } from '../../ir/swarm-nodes.js';
import type { TransformContext } from './types.js';
import { getAttributeValue, getBooleanAttribute } from '../utils/index.js';
import { transformBlockChildren } from './dispatch.js';
import { MarkdownEmitter } from '../../emitter/emitter.js';

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

// =============================================================================
// Team + Teammate Transformers
// =============================================================================

/**
 * Known enum values for compile-time resolution
 * These match the exports from components/swarm/enums.ts
 */
const ENUM_VALUES: Record<string, Record<string, string>> = {
  AgentType: {
    Bash: 'Bash',
    Explore: 'Explore',
    Plan: 'Plan',
    GeneralPurpose: 'general-purpose',
  },
  PluginAgentType: {
    SecuritySentinel: 'compound-engineering:review:security-sentinel',
    PerformanceOracle: 'compound-engineering:review:performance-oracle',
    ArchitectureStrategist: 'compound-engineering:review:architecture-strategist',
    BestPracticesResearcher: 'compound-engineering:research:best-practices-researcher',
  },
  Model: {
    Haiku: 'haiku',
    Sonnet: 'sonnet',
    Opus: 'opus',
  },
};

/**
 * Resolve enum property access to its actual string value
 *
 * @example
 * resolveEnumValue('PluginAgentType.SecuritySentinel')
 * // Returns: 'compound-engineering:review:security-sentinel'
 *
 * resolveEnumValue('Model.Sonnet')
 * // Returns: 'sonnet'
 */
function resolveEnumValue(enumAccess: string): string {
  const parts = enumAccess.split('.');
  if (parts.length !== 2) {
    return enumAccess; // Not a valid enum access, return as-is
  }

  const [enumName, propName] = parts;
  const enumDef = ENUM_VALUES[enumName];
  if (enumDef && propName in enumDef) {
    return enumDef[propName];
  }

  return enumAccess; // Unknown enum, return as-is
}

/**
 * Extract an enum value from a JSX attribute
 *
 * Handles both string literals and property access expressions (enums).
 * Returns the resolved string value or undefined if not found.
 */
function getEnumAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string
): string | undefined {
  const attr = element.getAttribute(attrName);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: model="haiku"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) return undefined;

    // String literal inside expression: model={"haiku"}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Property access expression: model={Model.Haiku}
    if (Node.isPropertyAccessExpression(expr)) {
      const enumText = expr.getText();
      return resolveEnumValue(enumText);
    }
  }

  return undefined;
}

/**
 * Extract WorkerRef from a JSX attribute value
 *
 * Handles: worker={Security} where Security is a defineWorker() result
 * Returns the WorkerRef properties (__id, name, type, model)
 */
function extractWorkerRefFromAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
  ctx: TransformContext
): { workerId: string; workerName: string; workerType: string; workerModel?: string } | null {
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

  // Find the defineWorker() call for this variable
  for (const stmt of sourceFile.getStatements()) {
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        if (decl.getName() === varName) {
          const initializer = decl.getInitializer();
          if (initializer && Node.isCallExpression(initializer)) {
            const callee = initializer.getExpression();
            if (Node.isIdentifier(callee) && callee.getText() === 'defineWorker') {
              const args = initializer.getArguments();
              if (args.length >= 2) {
                // Get name (first arg)
                const nameArg = args[0];
                let workerName = '';
                if (Node.isStringLiteral(nameArg)) {
                  workerName = nameArg.getLiteralValue();
                }

                // Get type (second arg)
                const typeArg = args[1];
                let workerType = '';
                if (Node.isStringLiteral(typeArg)) {
                  workerType = typeArg.getLiteralValue();
                } else if (Node.isPropertyAccessExpression(typeArg)) {
                  // Handle enum access like AgentType.Explore or PluginAgentType.SecuritySentinel
                  const enumText = typeArg.getText();
                  workerType = resolveEnumValue(enumText);
                }

                // Get model (third arg, optional)
                let workerModel: string | undefined;
                if (args.length >= 3) {
                  const modelArg = args[2];
                  if (Node.isStringLiteral(modelArg)) {
                    workerModel = modelArg.getLiteralValue();
                  } else if (Node.isPropertyAccessExpression(modelArg)) {
                    const enumText = modelArg.getText();
                    workerModel = resolveEnumValue(enumText);
                  }
                }

                // Generate deterministic ID based on variable name
                const workerId = `worker:${varName}`;

                return { workerId, workerName, workerType, workerModel };
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
 * Extract TeamRef from a JSX attribute value
 *
 * Handles: team={ReviewTeam} where ReviewTeam is a defineTeam() result
 * Returns the TeamRef properties (__id, name)
 */
function extractTeamRefFromAttribute(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
  ctx: TransformContext
): { teamId: string; teamName: string } | null {
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

  // Find the defineTeam() call for this variable
  for (const stmt of sourceFile.getStatements()) {
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        if (decl.getName() === varName) {
          const initializer = decl.getInitializer();
          if (initializer && Node.isCallExpression(initializer)) {
            const callee = initializer.getExpression();
            if (Node.isIdentifier(callee) && callee.getText() === 'defineTeam') {
              const args = initializer.getArguments();
              if (args.length >= 1) {
                // Get name (first arg)
                const nameArg = args[0];
                let teamName = '';
                if (Node.isStringLiteral(nameArg)) {
                  teamName = nameArg.getLiteralValue();
                }

                // Generate deterministic ID based on variable name
                const teamId = `team:${varName}`;

                return { teamId, teamName };
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
 * Extract prompt content from <Prompt> child element
 *
 * Transforms Prompt's children to IR, then emits to markdown string.
 */
function extractPromptChild(
  node: JsxElement,
  ctx: TransformContext
): string | undefined {
  for (const child of node.getJsxChildren()) {
    // Skip whitespace text nodes
    if (Node.isJsxText(child)) {
      continue;
    }

    if (Node.isJsxElement(child) || Node.isJsxSelfClosingElement(child)) {
      const childName = Node.isJsxElement(child)
        ? child.getOpeningElement().getTagNameNode().getText()
        : child.getTagNameNode().getText();

      if (childName === 'Prompt') {
        if (!Node.isJsxElement(child)) {
          // Self-closing <Prompt /> has no content
          return undefined;
        }

        // Transform Prompt's children to IR nodes
        const childNodes = transformBlockChildren(child.getJsxChildren(), ctx);

        // Emit IR nodes to markdown string
        const emitter = new MarkdownEmitter();
        const parts: string[] = [];
        for (const block of childNodes) {
          // Use the emitter's internal emitBlock method via emit with a fake doc
          // Actually, we need to emit blocks directly
          // Let's create a simple helper
          parts.push(emitBlockNode(block, emitter));
        }

        const content = parts.filter(p => p.length > 0).join('\n\n').trim();
        return content || undefined;
      }
    }
  }

  return undefined;
}

/**
 * Helper to emit a single block node using MarkdownEmitter
 */
function emitBlockNode(node: import('../../ir/index.js').BlockNode, emitter: MarkdownEmitter): string {
  // Create a minimal document to emit the single block
  // This is a workaround since emitBlock is private
  const doc: import('../../ir/runtime-nodes.js').DocumentNode = {
    kind: 'document',
    runtimeVars: [],
    runtimeFunctions: [],
    children: [node],
  };
  const result = emitter.emit(doc);
  // Remove trailing newline added by emit
  return result.trimEnd();
}

/**
 * Transform Teammate component to TeammateNode IR
 *
 * Called from transformTeam when processing children.
 */
function transformTeammate(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TeammateNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract worker prop (required)
  const workerRef = extractWorkerRefFromAttribute(openingElement, 'worker', ctx);
  if (!workerRef) {
    throw ctx.createError('Teammate requires a worker prop with a defineWorker() reference', node);
  }

  // Extract description prop (required)
  const description = getAttributeValue(openingElement, 'description');
  if (!description) {
    throw ctx.createError('Teammate requires a description prop', node);
  }

  // Extract prompt: prefer <Prompt> child, fall back to prompt prop
  let prompt: string | undefined;
  if (Node.isJsxElement(node)) {
    prompt = extractPromptChild(node, ctx);
  }
  if (!prompt) {
    prompt = getAttributeValue(openingElement, 'prompt');
  }
  if (!prompt) {
    throw ctx.createError('Teammate requires either a <Prompt> child or prompt prop', node);
  }

  // Extract model prop (optional override) - handles both strings and enum values
  const modelProp = getEnumAttributeValue(openingElement, 'model');

  // Extract background prop (default true)
  const backgroundProp = getBooleanAttribute(openingElement, 'background');
  const background = backgroundProp ?? true;

  return {
    kind: 'teammate',
    workerId: workerRef.workerId,
    workerName: workerRef.workerName,
    workerType: workerRef.workerType,
    workerModel: workerRef.workerModel,
    description,
    prompt,
    model: modelProp || undefined,
    background,
  };
}

/**
 * Transform Team component to TeamNode IR
 */
export function transformTeam(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): TeamNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract team prop (required)
  const teamRef = extractTeamRefFromAttribute(openingElement, 'team', ctx);
  if (!teamRef) {
    throw ctx.createError('Team requires a team prop with a defineTeam() reference', node);
  }

  // Extract description prop (optional)
  const description = getAttributeValue(openingElement, 'description');

  // Transform Teammate children
  const children: TeammateNode[] = [];

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

        if (childName === 'Teammate') {
          const teammateNode = transformTeammate(child, ctx);
          children.push(teammateNode);
        } else {
          throw ctx.createError(`Team only accepts Teammate children, got: ${childName}`, child);
        }
      }
    }
  }

  if (children.length === 0) {
    throw ctx.createError('Team requires at least one Teammate child', node);
  }

  return {
    kind: 'team',
    teamId: teamRef.teamId,
    teamName: teamRef.teamName,
    description: description || undefined,
    children,
  };
}

// =============================================================================
// ShutdownSequence Transformer
// =============================================================================

/**
 * Extract WorkerRef array from a JSX attribute
 *
 * Handles: workers={[Security, Perf]}
 */
function extractWorkerRefArray(
  element: JsxOpeningElement | JsxSelfClosingElement,
  attrName: string,
  ctx: TransformContext
): Array<{ workerId: string; workerName: string }> {
  const attr = element.getAttribute(attrName);
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

  const workers: Array<{ workerId: string; workerName: string }> = [];

  for (const elem of expr.getElements()) {
    if (Node.isIdentifier(elem)) {
      const varName = elem.getText();
      // Look up the defineWorker() call
      const workerRef = findWorkerRefByVarName(varName, ctx);
      if (workerRef) {
        workers.push({
          workerId: workerRef.workerId,
          workerName: workerRef.workerName,
        });
      }
    }
  }

  return workers;
}

/**
 * Find WorkerRef data by variable name
 */
function findWorkerRefByVarName(
  varName: string,
  ctx: TransformContext
): { workerId: string; workerName: string } | null {
  const sourceFile = ctx.sourceFile;
  if (!sourceFile) return null;

  for (const stmt of sourceFile.getStatements()) {
    if (Node.isVariableStatement(stmt)) {
      for (const decl of stmt.getDeclarationList().getDeclarations()) {
        if (decl.getName() === varName) {
          const initializer = decl.getInitializer();
          if (initializer && Node.isCallExpression(initializer)) {
            const callee = initializer.getExpression();
            if (Node.isIdentifier(callee) && callee.getText() === 'defineWorker') {
              const args = initializer.getArguments();
              if (args.length >= 1) {
                const nameArg = args[0];
                let workerName = '';
                if (Node.isStringLiteral(nameArg)) {
                  workerName = nameArg.getLiteralValue();
                }
                return {
                  workerId: `worker:${varName}`,
                  workerName,
                };
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
 * Transform ShutdownSequence component to ShutdownSequenceNode IR
 */
export function transformShutdownSequence(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ShutdownSequenceNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract workers array (required)
  const workers = extractWorkerRefArray(openingElement, 'workers', ctx);
  if (workers.length === 0) {
    throw ctx.createError(
      'ShutdownSequence requires at least one worker in the workers array',
      node
    );
  }

  // Extract reason (optional, default "Shutdown requested")
  const reason = getAttributeValue(openingElement, 'reason') ?? 'Shutdown requested';

  // Extract cleanup (optional, default true)
  const cleanupAttr = getBooleanAttribute(openingElement, 'cleanup');
  const includeCleanup = cleanupAttr ?? true;

  // Extract team (optional)
  const teamRef = extractTeamRefFromAttribute(openingElement, 'team', ctx);
  const teamName = teamRef?.teamName;

  // Extract title (optional, default "Shutdown")
  const title = getAttributeValue(openingElement, 'title') ?? 'Shutdown';

  return {
    kind: 'shutdownSequence',
    workers,
    reason,
    includeCleanup,
    teamName,
    title,
  };
}
