/**
 * Runtime Variable Transformer
 *
 * Extracts useRuntimeVar<T>('NAME') declarations from source files.
 * Populates the V3TransformContext with variable info for reference resolution.
 */

import { Node, SourceFile } from 'ts-morph';
import type { RuntimeVarInfo, V3TransformContext } from './v3-types.js';
import type { RuntimeVarDeclNode, RuntimeVarRefNode } from '../../ir/index.js';

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
export function extractRuntimeVarDeclarations(
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
    const info: RuntimeVarInfo = {
      varName,
      identifierName,
      tsType,
      location: {
        line: node.getStartLineNumber(),
        column: node.getStart() - node.getStartLineNumber(),
      },
    };

    // Check for duplicate identifier
    if (ctx.runtimeVars.has(identifierName)) {
      throw ctx.createError(
        `Duplicate runtime variable identifier: ${identifierName}`,
        node
      );
    }

    ctx.runtimeVars.set(identifierName, info);
  });
}

/**
 * Get RuntimeVarDeclNode array from context
 *
 * Used to include declarations in the V3Document.
 */
export function getRuntimeVarDecls(ctx: V3TransformContext): RuntimeVarDeclNode[] {
  return Array.from(ctx.runtimeVars.values()).map(info => ({
    kind: 'runtimeVarDecl' as const,
    varName: info.varName,
    tsType: info.tsType,
  }));
}

// ============================================================================
// Reference Resolution
// ============================================================================

/**
 * Resolve an identifier to its RuntimeVar info
 *
 * @param identifierName - The identifier text (e.g., 'ctx')
 * @param ctx - Transform context with declarations
 * @returns RuntimeVarInfo if found, undefined otherwise
 */
export function resolveRuntimeVar(
  identifierName: string,
  ctx: V3TransformContext
): RuntimeVarInfo | undefined {
  return ctx.runtimeVars.get(identifierName);
}

/**
 * Parse a property access expression to RuntimeVarRefNode
 *
 * Handles expressions like:
 * - ctx -> { varName: 'CTX', path: [] }
 * - ctx.error -> { varName: 'CTX', path: ['error'] }
 * - ctx.user.name -> { varName: 'CTX', path: ['user', 'name'] }
 *
 * @param node - Property access or identifier node
 * @param ctx - Transform context
 * @returns RuntimeVarRefNode if valid, null if not a RuntimeVar reference
 */
export function parseRuntimeVarRef(
  node: Node,
  ctx: V3TransformContext
): RuntimeVarRefNode | null {
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
  const info = ctx.runtimeVars.get(identName);

  if (!info) {
    return null;
  }

  return {
    kind: 'runtimeVarRef',
    varName: info.varName,
    path,
  };
}

/**
 * Check if a node is a RuntimeVar reference
 */
export function isRuntimeVarReference(
  node: Node,
  ctx: V3TransformContext
): boolean {
  return parseRuntimeVarRef(node, ctx) !== null;
}
