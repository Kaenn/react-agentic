/**
 * ts-morph Parser - TSX file parsing and JSX AST extraction
 *
 * Provides utilities for parsing TSX files and extracting JSX elements
 * for transformation into IR nodes.
 */

import {
  Project,
  SourceFile,
  ScriptTarget,
  ModuleKind,
  ts,
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxOpeningElement,
  JsxFragment,
  JsxText,
  JsxExpression,
  ArrayLiteralExpression,
  JsxSpreadAttribute,
  ObjectLiteralExpression,
  SyntaxKind,
} from 'ts-morph';

export interface CreateProjectOptions {
  /**
   * Use in-memory filesystem (default: false)
   * Set to true for test scenarios where files don't exist on disk
   */
  inMemory?: boolean;
}

/**
 * Create a ts-morph Project configured for JSX parsing
 *
 * @param options.inMemory - Use in-memory filesystem (default: false)
 */
export function createProject(options: CreateProjectOptions = {}): Project {
  return new Project({
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
    },
    useInMemoryFileSystem: options.inMemory ?? false,
  });
}

/**
 * Add and parse a file from the filesystem
 */
export function parseFile(project: Project, filePath: string): SourceFile {
  return project.addSourceFileAtPath(filePath);
}

/**
 * Parse an in-memory TSX string
 */
export function parseSource(
  project: Project,
  source: string,
  fileName = 'source.tsx'
): SourceFile {
  return project.createSourceFile(fileName, source, { overwrite: true });
}

// ============================================================================
// JSX Traversal Utilities
// ============================================================================

/**
 * Get the element tag name from a JSX element or self-closing element
 */
export function getElementName(
  node: JsxElement | JsxSelfClosingElement
): string {
  if (Node.isJsxElement(node)) {
    return node.getOpeningElement().getTagNameNode().getText();
  }
  return node.getTagNameNode().getText();
}

/**
 * JSX child node types
 */
export type JsxChild = JsxElement | JsxSelfClosingElement | JsxText | JsxExpression;

/**
 * Get the JSX children of an element
 */
export function getJsxChildren(node: JsxElement): JsxChild[] {
  return node.getJsxChildren() as JsxChild[];
}

/**
 * Get the value of a JSX attribute by name
 *
 * Handles both string literals (attr="value") and JSX expressions with
 * string literals (attr={"value"}).
 *
 * Returns undefined if attribute is missing or not a string.
 */
export function getAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init) {
    return undefined;
  }

  // String literal: attr="value"
  if (Node.isStringLiteral(init)) {
    return init.getLiteralValue();
  }

  // JSX expression: attr={value} or attr={"value"}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (expr && Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }
  }

  return undefined;
}

/**
 * Find the root JSX element returned by the default export function
 *
 * Searches for a ReturnStatement containing JSX within the file.
 * Returns null if no JSX is found.
 */
export function findRootJsxElement(
  sourceFile: SourceFile
): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  let result: JsxElement | JsxSelfClosingElement | JsxFragment | null = null;

  sourceFile.forEachDescendant((node, traversal) => {
    // Look for return statements
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (expr) {
        // Check if the return expression is JSX
        if (Node.isJsxElement(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isJsxSelfClosingElement(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isJsxFragment(expr)) {
          result = expr;
          traversal.stop();
        } else if (Node.isParenthesizedExpression(expr)) {
          // Handle parenthesized JSX: return (<div>...</div>)
          const inner = expr.getExpression();
          if (Node.isJsxElement(inner)) {
            result = inner;
            traversal.stop();
          } else if (Node.isJsxSelfClosingElement(inner)) {
            result = inner;
            traversal.stop();
          } else if (Node.isJsxFragment(inner)) {
            result = inner;
            traversal.stop();
          }
        }
      }
    }
  });

  return result;
}

// ============================================================================
// Text Extraction Utilities
// ============================================================================

/**
 * Check if a JsxText node contains only whitespace (formatting between elements)
 */
export function isWhitespaceOnlyText(node: JsxText): boolean {
  return node.containsOnlyTriviaWhiteSpaces();
}

/**
 * Normalize whitespace in text content
 *
 * Collapses multiple spaces/newlines to a single space and trims edges.
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize whitespace for inline text content
 *
 * Collapses multiple spaces/newlines to a single space but preserves
 * leading/trailing spaces (they separate inline elements).
 */
export function normalizeInlineWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ');
}

/**
 * Extract text content from a JsxText node
 *
 * Returns null for whitespace-only nodes (formatting between elements).
 * Otherwise returns normalized text content.
 */
export function extractText(node: JsxText): string | null {
  if (isWhitespaceOnlyText(node)) {
    return null;
  }
  const normalized = normalizeWhitespace(node.getText());
  return normalized || null;
}

/**
 * Extract text content from a JsxText node for inline context
 *
 * Returns null for whitespace-only nodes.
 * Preserves leading/trailing spaces as they separate inline elements.
 */
export function extractInlineText(node: JsxText): string | null {
  if (isWhitespaceOnlyText(node)) {
    return null;
  }
  const normalized = normalizeInlineWhitespace(node.getText());
  return normalized || null;
}

/**
 * Get the value of a JSX array attribute by name
 *
 * Handles JSX expressions containing array literals: attr={["a", "b"]}
 * Returns undefined if attribute is missing or not a string array.
 */
export function getArrayAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string
): string[] | undefined {
  const attr = element.getAttribute(name);
  if (!attr || !Node.isJsxAttribute(attr)) {
    return undefined;
  }

  const init = attr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    return undefined;
  }

  const expr = init.getExpression();
  if (!expr || !Node.isArrayLiteralExpression(expr)) {
    return undefined;
  }

  const elements: string[] = [];
  for (const el of expr.getElements()) {
    if (Node.isStringLiteral(el)) {
      elements.push(el.getLiteralValue());
    }
  }
  return elements.length > 0 ? elements : undefined;
}

// ============================================================================
// Spread Attribute Resolution
// ============================================================================

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
