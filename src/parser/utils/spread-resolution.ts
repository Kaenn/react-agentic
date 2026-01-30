/**
 * JSX spread attribute resolution utilities
 */

import {
  Node,
  JsxSpreadAttribute,
  ObjectLiteralExpression,
  SyntaxKind,
} from 'ts-morph';

/**
 * Extract property values from an ObjectLiteralExpression
 *
 * Handles StringLiteral, ArrayLiteralExpression, NumericLiteral, TrueKeyword, FalseKeyword.
 * Returns a Record of property names to their values.
 */
export function extractObjectLiteralProps(
  objLiteral: ObjectLiteralExpression
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const prop of objLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const name = prop.getName();
      const initializer = prop.getInitializer();

      if (!initializer) continue;

      if (Node.isStringLiteral(initializer)) {
        result[name] = initializer.getLiteralValue();
      } else if (Node.isArrayLiteralExpression(initializer)) {
        // Reuse array extraction pattern
        const elements: string[] = [];
        for (const el of initializer.getElements()) {
          if (Node.isStringLiteral(el)) {
            elements.push(el.getLiteralValue());
          }
        }
        if (elements.length > 0) {
          result[name] = elements;
        }
      } else if (Node.isNumericLiteral(initializer)) {
        result[name] = initializer.getLiteralValue();
      } else if (initializer.getKind() === SyntaxKind.TrueKeyword) {
        result[name] = true;
      } else if (initializer.getKind() === SyntaxKind.FalseKeyword) {
        result[name] = false;
      }
      // Other types (nested objects, functions) are not supported
    }
    // ShorthandPropertyAssignment and SpreadAssignment not supported
  }

  return result;
}

/**
 * Resolve a JsxSpreadAttribute to its object literal values
 *
 * Only supports simple identifiers referencing object literals:
 *   const props = { name: "x", desc: "y" };
 *   <Command {...props} />
 *
 * Throws for:
 * - Non-identifier expressions: {...getProps()}
 * - Non-object-literal sources: const props = someFunc();
 */
export function resolveSpreadAttribute(
  spreadAttr: JsxSpreadAttribute
): Record<string, unknown> {
  const expression = spreadAttr.getExpression();

  // Only handle simple identifiers: {...props}
  if (!Node.isIdentifier(expression)) {
    throw new Error('Spread expressions must be simple identifiers');
  }

  // Get the symbol for the identifier
  const symbol = expression.getSymbol();
  if (!symbol) {
    throw new Error(`Cannot resolve '${expression.getText()}'`);
  }

  // Get the declaration (variable declaration)
  const declarations = symbol.getDeclarations();
  const varDecl = declarations?.find(d => Node.isVariableDeclaration(d));
  if (!varDecl || !Node.isVariableDeclaration(varDecl)) {
    throw new Error('Spread source must be a variable declaration');
  }

  // Get the initializer (object literal)
  const initializer = varDecl.getInitializer();
  if (!initializer || !Node.isObjectLiteralExpression(initializer)) {
    throw new Error('Spread source must be an object literal');
  }

  // Extract properties
  return extractObjectLiteralProps(initializer);
}
