/**
 * Script Variable Transformer
 *
 * Extracts useRuntimeVar<T>('NAME') declarations from source files.
 * Populates the V3TransformContext with variable info for reference resolution.
 */

import { Node, SourceFile } from 'ts-morph';
import type { ScriptVarInfo, V3TransformContext } from './types.js';
import type { ScriptVarDeclNode, ScriptVarRefNode } from '../../ir/index.js';

// ============================================================================
// Extraction
// ============================================================================

/**
 * Extract all useRuntimeVar declarations from a source file
 *
 * Searches for patterns like:
 * - const ctx = useRuntimeVar<Type>('NAME')
 * - const { a, b } = useRuntimeVar<Type>('NAME') (not supported, error)
 *
 * @param sourceFile - Source file to scan
 * @param ctx - Transform context to populate
 */
export function extractScriptVarDeclarations(
  sourceFile: SourceFile,
  ctx: V3TransformContext
): void {
  // Find all variable declarations
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const init = node.getInitializer();
    if (!init || !Node.isCallExpression(init)) return;

    // Check if it's a useRuntimeVar call
    const expr = init.getExpression();
    if (!Node.isIdentifier(expr) || expr.getText() !== 'useRuntimeVar') return;

    // Get the variable name argument (first arg)
    const args = init.getArguments();
    if (args.length < 1) {
      throw ctx.createError(
        'useRuntimeVar requires a variable name argument',
        init
      );
    }

    const nameArg = args[0];
    if (!Node.isStringLiteral(nameArg)) {
      throw ctx.createError(
        'useRuntimeVar argument must be a string literal',
        nameArg
      );
    }

    const varName = nameArg.getLiteralValue();
    const identifierName = node.getName();

    // Check for destructuring (not supported)
    if (identifierName.includes('{') || identifierName.includes('[')) {
      throw ctx.createError(
        'useRuntimeVar does not support destructuring. Use: const ctx = useRuntimeVar<T>("NAME")',
        node
      );
    }

    // Extract type argument if present
    const typeArgs = init.getTypeArguments();
    const tsType = typeArgs.length > 0 ? typeArgs[0].getText() : undefined;

    // Create info entry
    const info: ScriptVarInfo = {
      varName,
      identifierName,
      tsType,
      location: {
        line: node.getStartLineNumber(),
        column: node.getStart() - node.getStartLineNumber(),
      },
    };

    // Check for duplicate identifier
    if (ctx.scriptVars.has(identifierName)) {
      throw ctx.createError(
        `Duplicate script variable identifier: ${identifierName}`,
        node
      );
    }

    ctx.scriptVars.set(identifierName, info);
  });
}

/**
 * Get ScriptVarDeclNode array from context
 *
 * Used to include declarations in the V3Document.
 */
export function getScriptVarDecls(ctx: V3TransformContext): ScriptVarDeclNode[] {
  return Array.from(ctx.scriptVars.values()).map(info => ({
    kind: 'scriptVarDecl' as const,
    varName: info.varName,
    tsType: info.tsType,
  }));
}

// ============================================================================
// Reference Resolution
// ============================================================================

/**
 * Resolve an identifier to its ScriptVar info
 *
 * @param identifierName - The identifier text (e.g., 'ctx')
 * @param ctx - Transform context with declarations
 * @returns ScriptVarInfo if found, undefined otherwise
 */
export function resolveScriptVar(
  identifierName: string,
  ctx: V3TransformContext
): ScriptVarInfo | undefined {
  return ctx.scriptVars.get(identifierName);
}

/**
 * Parse a property access expression to ScriptVarRefNode
 *
 * Handles expressions like:
 * - ctx -> { varName: 'CTX', path: [] }
 * - ctx.error -> { varName: 'CTX', path: ['error'] }
 * - ctx.user.name -> { varName: 'CTX', path: ['user', 'name'] }
 *
 * @param node - Property access or identifier node
 * @param ctx - Transform context
 * @returns ScriptVarRefNode if valid, null if not a ScriptVar reference
 */
export function parseScriptVarRef(
  node: Node,
  ctx: V3TransformContext
): ScriptVarRefNode | null {
  // Build path by walking property access chain
  const path: string[] = [];
  let current: Node = node;

  // Walk up the property access chain
  while (Node.isPropertyAccessExpression(current)) {
    const propName = current.getName();
    path.unshift(propName);
    current = current.getExpression();
  }

  // Current should now be the root identifier
  if (!Node.isIdentifier(current)) {
    return null;
  }

  const identName = current.getText();
  const info = ctx.scriptVars.get(identName);

  if (!info) {
    return null;
  }

  return {
    kind: 'scriptVarRef',
    varName: info.varName,
    path,
  };
}

/**
 * Check if a node is a ScriptVar reference
 */
export function isScriptVarReference(
  node: Node,
  ctx: V3TransformContext
): boolean {
  return parseScriptVarRef(node, ctx) !== null;
}
