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
  InterfaceDeclaration,
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
 * For inline context, we need to preserve whitespace that separates
 * inline elements. Only skip nodes that are purely formatting whitespace
 * (newlines + indentation between block elements).
 *
 * Preserves leading/trailing spaces as they separate inline elements.
 */
export function extractInlineText(node: JsxText): string | null {
  const raw = node.getText();

  // Skip purely structural whitespace (newlines with optional indentation)
  // These are formatting between block-level elements
  if (/^\s*\n\s*$/.test(raw)) {
    return null;
  }

  // Normalize multiple whitespace to single space, preserving edges
  const normalized = normalizeInlineWhitespace(raw);
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

// ============================================================================
// Component Import Resolution
// ============================================================================

/**
 * Result of resolving a component import
 */
export interface ResolvedComponent {
  jsx: JsxElement | JsxSelfClosingElement | JsxFragment;
  sourceFile: SourceFile;
  visitedPaths: Set<string>;
}

/**
 * Resolve a component import and extract its JSX
 *
 * Follows import declarations to find the component's source file,
 * then extracts the JSX returned by the component function.
 *
 * @param componentName - Name of the component to resolve
 * @param sourceFile - Source file containing the import
 * @param visitedPaths - Set of already visited file paths (for circular detection)
 * @throws Error if component not imported, not exported, circular import detected,
 *         or import is not relative
 */
export function resolveComponentImport(
  componentName: string,
  sourceFile: SourceFile,
  visitedPaths?: Set<string>
): ResolvedComponent {
  // Initialize visitedPaths if not provided
  const visited = visitedPaths ?? new Set<string>();

  // Add current file to visited paths
  const currentPath = sourceFile.getFilePath();
  visited.add(currentPath);

  // Find import declaration for this component
  const importDecl = sourceFile.getImportDeclaration((decl) => {
    const namedImports = decl.getNamedImports();
    return namedImports.some((ni) => ni.getName() === componentName);
  });

  if (!importDecl) {
    throw new Error(`Component '${componentName}' not imported`);
  }

  // Validate module specifier is relative import
  const specifier = importDecl.getModuleSpecifierValue();
  if (!specifier.startsWith('.')) {
    throw new Error(
      `Only relative imports supported for components: '${specifier}'`
    );
  }

  // Resolve to source file
  const componentSourceFile = importDecl.getModuleSpecifierSourceFile();
  if (!componentSourceFile) {
    throw new Error(`Cannot resolve import for '${componentName}'`);
  }

  // Check for circular import
  const componentPath = componentSourceFile.getFilePath();
  if (visited.has(componentPath)) {
    throw new Error(`Circular import detected: ${componentName}`);
  }

  // Find the exported component declaration
  const exportedDecls = componentSourceFile.getExportedDeclarations();
  const componentDecls = exportedDecls.get(componentName);

  if (!componentDecls || componentDecls.length === 0) {
    throw new Error(`Component '${componentName}' not exported`);
  }

  // Extract JSX from component function
  const jsx = extractJsxFromComponent(componentDecls[0]);
  if (!jsx) {
    throw new Error(`Component '${componentName}' does not return JSX`);
  }

  return {
    jsx,
    sourceFile: componentSourceFile,
    visitedPaths: visited,
  };
}

/**
 * Extract the JSX returned by a component function
 *
 * Handles:
 * - Function declarations: function Foo() { return <div />; }
 * - Arrow functions: const Foo = () => <div />;
 * - Arrow functions with body: const Foo = () => { return <div />; };
 *
 * @param decl - The component's declaration node
 * @returns The JSX element/fragment returned, or null if not found
 */
/**
 * Extract generic type arguments from a JSX element
 *
 * For <SpawnAgent<ResearcherInput>> returns ['ResearcherInput']
 * For <Agent<MyInput>> returns ['MyInput']
 * Returns undefined if no type arguments present
 *
 * Uses ts-morph's getDescendantsOfKind to find TypeReference nodes within the
 * opening element's tag, which is where JSX type arguments are attached.
 */
export function extractTypeArguments(
  element: JsxElement | JsxSelfClosingElement
): string[] | undefined {
  // Get the opening element (where generics are attached in JSX)
  const openingElement = Node.isJsxElement(element)
    ? element.getOpeningElement()
    : element;

  // Get all TypeReference descendants of the opening tag
  // In JSX, type arguments appear as TypeReference children of the tag name
  const typeRefNodes = openingElement.getDescendantsOfKind(SyntaxKind.TypeReference);

  if (typeRefNodes.length === 0) {
    return undefined;
  }

  // Extract the type name text from each TypeReference
  return typeRefNodes.map(node => node.getText());
}

export function extractJsxFromComponent(
  decl: Node
): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  let functionBody: Node | undefined;

  if (Node.isFunctionDeclaration(decl)) {
    functionBody = decl.getBody();
  } else if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      // Check for concise body (arrow function returning JSX directly)
      const body = init.getBody();
      if (Node.isJsxElement(body)) {
        return body;
      } else if (Node.isJsxSelfClosingElement(body)) {
        return body;
      } else if (Node.isJsxFragment(body)) {
        return body;
      } else if (Node.isParenthesizedExpression(body)) {
        const inner = body.getExpression();
        if (Node.isJsxElement(inner)) {
          return inner;
        } else if (Node.isJsxSelfClosingElement(inner)) {
          return inner;
        } else if (Node.isJsxFragment(inner)) {
          return inner;
        }
      }
      functionBody = body;
    }
  }

  if (!functionBody) return null;

  // Find return statement with JSX
  let result: JsxElement | JsxSelfClosingElement | JsxFragment | null = null;
  functionBody.forEachDescendant((node, traversal) => {
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
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
  });

  return result;
}

// ============================================================================
// Cross-File Type Resolution Utilities
// ============================================================================

/**
 * Result of resolving a type import
 */
export interface ResolvedType {
  sourceFile: SourceFile;
  interfaceName: string;
  interface: InterfaceDeclaration;
}

/**
 * Resolve a type name to its interface declaration
 * Follows import declarations to find the source file and interface
 *
 * @param typeName - Name of the type to resolve (e.g., 'ResearcherInput')
 * @param sourceFile - Source file containing the import
 * @returns ResolvedType with source file and interface, or undefined if not found
 */
export function resolveTypeImport(
  typeName: string,
  sourceFile: SourceFile
): ResolvedType | undefined {
  // Check if type is defined locally first
  const localInterface = sourceFile.getInterface(typeName);
  if (localInterface) {
    return {
      sourceFile,
      interfaceName: typeName,
      interface: localInterface,
    };
  }

  // Find import declaration for this type
  for (const importDecl of sourceFile.getImportDeclarations()) {
    // Check named imports: import { TypeName } from '...'
    for (const namedImport of importDecl.getNamedImports()) {
      if (namedImport.getName() === typeName) {
        const resolved = importDecl.getModuleSpecifierSourceFile();
        if (!resolved) {
          return undefined;
        }

        // Handle aliased imports: import { X as Y } from '...'
        const originalName = namedImport.getAliasNode()?.getText() ?? typeName;

        // Get the interface from the resolved file
        const iface = resolved.getInterface(originalName);
        if (!iface) {
          // Try exported declarations (for re-exports)
          const exported = resolved.getExportedDeclarations().get(originalName);
          const exportedIface = exported?.find(d => Node.isInterfaceDeclaration(d));
          if (exportedIface && Node.isInterfaceDeclaration(exportedIface)) {
            return {
              sourceFile: resolved,
              interfaceName: originalName,
              interface: exportedIface,
            };
          }
          return undefined;
        }

        return {
          sourceFile: resolved,
          interfaceName: originalName,
          interface: iface,
        };
      }
    }

    // Check type-only imports: import type { TypeName } from '...'
    if (importDecl.isTypeOnly()) {
      for (const namedImport of importDecl.getNamedImports()) {
        if (namedImport.getName() === typeName) {
          const resolved = importDecl.getModuleSpecifierSourceFile();
          if (!resolved) {
            return undefined;
          }

          const originalName = namedImport.getAliasNode()?.getText() ?? typeName;
          const iface = resolved.getInterface(originalName);
          if (iface) {
            return {
              sourceFile: resolved,
              interfaceName: originalName,
              interface: iface,
            };
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Property information extracted from an interface
 */
export interface InterfaceProperty {
  name: string;
  required: boolean;
  type: string;
}

/**
 * Extract property information from an interface
 *
 * @param iface - Interface declaration to extract from
 * @returns Array of property information
 */
export function extractInterfaceProperties(
  iface: InterfaceDeclaration
): InterfaceProperty[] {
  const properties: InterfaceProperty[] = [];

  for (const prop of iface.getProperties()) {
    properties.push({
      name: prop.getName(),
      required: !prop.hasQuestionToken(),
      type: prop.getType().getText(),
    });
  }

  return properties;
}

/**
 * Extract {placeholder} patterns from a prompt string
 *
 * @param prompt - Prompt string with {variable} placeholders
 * @returns Set of placeholder names (without braces)
 */
export function extractPromptPlaceholders(prompt: string): Set<string> {
  const matches = prompt.matchAll(/\{(\w+)\}/g);
  return new Set([...matches].map(m => m[1]));
}
