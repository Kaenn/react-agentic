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
  TemplateExpression,
  CallExpression,
  ArrowFunction,
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
 * Known test helper function names from jsx.ts
 */
const TEST_HELPERS = new Set(['fileExists', 'dirExists', 'isEmpty', 'notEmpty', 'equals', 'and', 'or']);

/**
 * Get the value of a test attribute, supporting both string literals
 * and test helper function calls like fileExists(varRef), isEmpty(varRef), etc.
 *
 * @param element - The JSX element to get the attribute from
 * @param name - The attribute name (typically 'test')
 * @param variables - Map of declared useVariable results for resolving identifiers
 * @returns The test expression string, or undefined if not found/invalid
 */
export function getTestAttributeValue(
  element: JsxOpeningElement | JsxSelfClosingElement,
  name: string,
  variables: Map<string, ExtractedVariable>
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

  // JSX expression: attr={value}, attr={"value"}, or attr={helperFn(var)}
  if (Node.isJsxExpression(init)) {
    const expr = init.getExpression();
    if (!expr) {
      return undefined;
    }

    // String literal inside expression: attr={"value"}
    if (Node.isStringLiteral(expr)) {
      return expr.getLiteralValue();
    }

    // Call expression: attr={fileExists(varRef)} or attr={equals(varRef, "value")}
    if (Node.isCallExpression(expr)) {
      return evaluateTestHelperCall(expr, variables);
    }
  }

  return undefined;
}

/**
 * ts-morph Node type alias for use in local function signatures
 */
type TsMorphNode = import('ts-morph').Node;

/**
 * Evaluate a test helper function call at compile time.
 *
 * Supports:
 * - fileExists(varRef) -> [ -f $VAR_NAME ]
 * - dirExists(varRef) -> [ -d $VAR_NAME ]
 * - isEmpty(varRef) -> [ -z "$VAR_NAME" ]
 * - notEmpty(varRef) -> [ -n "$VAR_NAME" ]
 * - equals(varRef, "value") -> [ $VAR_NAME = value ]
 * - and(...tests) -> test1 && test2 && ...
 * - or(...tests) -> test1 || test2 || ...
 */
function evaluateTestHelperCall(
  callExpr: CallExpression,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  const callee = callExpr.getExpression();
  if (!Node.isIdentifier(callee)) {
    return undefined;
  }

  const funcName = callee.getText();
  if (!TEST_HELPERS.has(funcName)) {
    return undefined;
  }

  const args = callExpr.getArguments();

  switch (funcName) {
    case 'fileExists': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -f $${varName} ]` : undefined;
    }
    case 'dirExists': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -d $${varName} ]` : undefined;
    }
    case 'isEmpty': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -z "$${varName}" ]` : undefined;
    }
    case 'notEmpty': {
      const varName = resolveVariableArg(args[0], variables);
      return varName ? `[ -n "$${varName}" ]` : undefined;
    }
    case 'equals': {
      const varName = resolveVariableArg(args[0], variables);
      const value = args[1] && Node.isStringLiteral(args[1]) ? args[1].getLiteralValue() : undefined;
      return varName && value ? `[ $${varName} = ${value} ]` : undefined;
    }
    case 'and': {
      const tests = args.map((arg: TsMorphNode) => evaluateTestArg(arg, variables)).filter((t: string | undefined): t is string => t !== undefined);
      return tests.length > 0 ? tests.join(' && ') : undefined;
    }
    case 'or': {
      const tests = args.map((arg: TsMorphNode) => evaluateTestArg(arg, variables)).filter((t: string | undefined): t is string => t !== undefined);
      return tests.length > 0 ? tests.join(' || ') : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Resolve a variable reference argument to its shell variable name.
 */
function resolveVariableArg(
  arg: TsMorphNode | undefined,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  if (!arg || !Node.isIdentifier(arg)) {
    return undefined;
  }
  const variable = variables.get(arg.getText());
  return variable?.envName;
}

/**
 * Evaluate a test argument for and/or composition.
 * Handles both string literals and nested helper calls.
 */
function evaluateTestArg(
  arg: TsMorphNode,
  variables: Map<string, ExtractedVariable>
): string | undefined {
  if (Node.isStringLiteral(arg)) {
    return arg.getLiteralValue();
  }
  if (Node.isCallExpression(arg)) {
    return evaluateTestHelperCall(arg, variables);
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

// ============================================================================
// Variable Declaration Extraction (useVariable hook)
// ============================================================================

/**
 * Extracted variable information from useVariable() call
 */
export interface ExtractedVariable {
  /** Local const name (e.g., "phaseDir") */
  localName: string;
  /** Shell variable name (e.g., "PHASE_DIR") */
  envName: string;
}

/**
 * Extract all useVariable() and defineVars() declarations from a source file
 *
 * Finds patterns like:
 *   const phaseDir = useVariable("PHASE_DIR");
 *   const vars = defineVars({ MODEL_PROFILE: { type: 'string' } });
 *
 * For defineVars, each property becomes a separate entry:
 *   vars.MODEL_PROFILE -> { localName: 'vars.MODEL_PROFILE', envName: 'MODEL_PROFILE' }
 *
 * @param sourceFile - Source file to extract from
 * @returns Map from local variable name to ExtractedVariable info
 */
export function extractVariableDeclarations(
  sourceFile: SourceFile
): Map<string, ExtractedVariable> {
  const result = new Map<string, ExtractedVariable>();

  // Find all variable declarations
  sourceFile.forEachDescendant((node) => {
    if (!Node.isVariableDeclaration(node)) return;

    const initializer = node.getInitializer();
    if (!initializer || !Node.isCallExpression(initializer)) return;

    const callExpr = initializer.getExpression();
    if (!Node.isIdentifier(callExpr)) return;

    const funcName = callExpr.getText();

    // Handle useVariable() or useRuntimeVar() call (unified variable API)
    if (funcName === 'useVariable' || funcName === 'useRuntimeVar') {
      const args = initializer.getArguments();
      if (args.length < 1) return;

      // First arg: string literal for env name
      const firstArg = args[0];
      if (!Node.isStringLiteral(firstArg)) return;
      const envName = firstArg.getLiteralValue();

      // Get local variable name
      const localName = node.getName();

      result.set(localName, {
        localName,
        envName,
      });
    }

    // Handle defineVars() call
    if (funcName === 'defineVars') {
      const args = initializer.getArguments();
      if (args.length < 1) return;

      const schemaArg = args[0];
      if (!Node.isObjectLiteralExpression(schemaArg)) return;

      // Get the variable name (e.g., "vars")
      const varName = node.getName();

      // Extract each property from the schema
      for (const prop of schemaArg.getProperties()) {
        if (!Node.isPropertyAssignment(prop)) continue;

        // Get property name (e.g., "MODEL_PROFILE")
        const propName = prop.getName();

        // Create entry like "vars.MODEL_PROFILE" -> "MODEL_PROFILE"
        const localName = `${varName}.${propName}`;
        result.set(localName, {
          localName,
          envName: propName,
        });
      }
    }
  });

  return result;
}


// ============================================================================
// SpawnAgent Input Utilities
// ============================================================================

import type { StateSchema, StateSchemaField } from '../ir/nodes.js';
import type { InputProperty, InputValue } from '../ir/runtime-nodes.js';

/**
 * Check if an identifier references a useVariable result
 *
 * @param identifier - The identifier node to check
 * @param variables - Map of declared useVariable results
 * @returns true if identifier references a known useVariable
 */
export function isVariableRef(
  identifier: string,
  variables: Map<string, ExtractedVariable>
): boolean {
  return variables.has(identifier);
}

/**
 * Extract SpawnAgent input object literal properties
 *
 * Handles property values:
 * - String literal: { propName: "value" } -> { type: 'string', value: str }
 * - {placeholder} pattern: { propName: "{var}" } -> { type: 'placeholder', name: var }
 * - Identifier referencing variable: { propName: varRef } -> { type: 'variable', name: envName }
 *
 * @param objLiteral - The ObjectLiteralExpression from JSX input prop
 * @param variables - Map of declared useVariable results
 * @returns Array of InputProperty with proper InputValue types
 */
export function extractInputObjectLiteral(
  objLiteral: ObjectLiteralExpression,
  variables: Map<string, ExtractedVariable>
): InputProperty[] {
  const properties: InputProperty[] = [];

  for (const prop of objLiteral.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;

    const name = prop.getName();
    const initializer = prop.getInitializer();
    if (!initializer) continue;

    let value: InputValue;

    if (Node.isStringLiteral(initializer)) {
      const strValue = initializer.getLiteralValue();
      value = { type: 'string', value: strValue };
    } else if (Node.isNoSubstitutionTemplateLiteral(initializer)) {
      const strValue = initializer.getLiteralValue();
      value = { type: 'string', value: strValue };
    } else if (Node.isIdentifier(initializer)) {
      // Identifier referencing a variable - treat as string
      // V3 RuntimeVar references are handled by v3-spawner.ts using parseRuntimeVarRef
      const varName = initializer.getText();
      value = { type: 'string', value: varName };
    } else {
      // Unsupported initializer type - skip this property
      continue;
    }

    properties.push({ name, value });
  }

  return properties;
}

// ============================================================================
// State Schema Extraction
// ============================================================================

/**
 * Map TypeScript type to SQL type
 */
function mapTsTypeToSql(tsType: string): 'TEXT' | 'INTEGER' {
  switch (tsType) {
    case 'number':
      return 'INTEGER';
    case 'boolean':
      return 'INTEGER';  // 0/1
    default:
      return 'TEXT';  // string, Date, enums, etc.
  }
}

/**
 * Get default value for a type
 */
function getDefaultValue(tsType: string, sqlType: 'TEXT' | 'INTEGER'): string {
  if (sqlType === 'INTEGER') {
    return '0';
  }
  return '';  // Empty string for TEXT
}

/**
 * Extract enum values from union type
 * 'major' | 'minor' | 'patch' -> ['major', 'minor', 'patch']
 */
function extractEnumValues(typeText: string): string[] | undefined {
  // Match pattern like "'value1' | 'value2' | 'value3'"
  const matches = typeText.match(/'([^']+)'/g);
  if (matches && matches.length > 1) {
    return matches.map(m => m.replace(/'/g, ''));
  }
  return undefined;
}

/**
 * Flatten interface properties into schema fields
 * Handles nested objects with underscore separation
 *
 * @param sourceFile - Source file containing the interface
 * @param interfaceName - Name of the interface to extract
 */
export function extractStateSchema(
  sourceFile: SourceFile,
  interfaceName: string
): StateSchema | undefined {
  const fields: StateSchemaField[] = [];

  // Find the interface declaration
  const interfaceDecl = sourceFile.getInterface(interfaceName);
  if (!interfaceDecl) {
    return undefined;
  }

  // Recursive helper to flatten nested properties
  function processProperties(
    properties: ReturnType<InterfaceDeclaration['getProperties']>,
    prefix: string = ''
  ): void {
    for (const prop of properties) {
      const propName = prop.getName();
      const typeNode = prop.getTypeNode();
      const fullName = prefix ? `${prefix}_${propName}` : propName;

      if (!typeNode) continue;

      const typeText = typeNode.getText();

      // Check if this is a nested object type (TypeLiteral or interface reference)
      if (Node.isTypeLiteral(typeNode)) {
        // Inline object type: { debug: boolean; timeout: number; }
        const nestedProps = typeNode.getProperties();
        // Process nested properties with updated prefix
        for (const nestedProp of nestedProps) {
          const nestedName = nestedProp.getName();
          const nestedType = nestedProp.getTypeNode();
          if (!nestedType) continue;

          const nestedTypeText = nestedType.getText();
          const nestedFullName = `${fullName}_${nestedName}`;

          // For now, only go one level deep (can extend later)
          const tsType = nestedTypeText.includes('|') ? 'string' : nestedTypeText;
          const sqlType = mapTsTypeToSql(tsType);
          const enumValues = extractEnumValues(nestedTypeText);

          fields.push({
            name: nestedFullName,
            tsType,
            sqlType,
            defaultValue: getDefaultValue(tsType, sqlType),
            enumValues
          });
        }
      } else {
        // Simple type
        const tsType = typeText.includes('|') ? 'string' : typeText;
        const sqlType = mapTsTypeToSql(tsType);
        const enumValues = extractEnumValues(typeText);

        fields.push({
          name: fullName,
          tsType,
          sqlType,
          defaultValue: getDefaultValue(tsType, sqlType),
          enumValues
        });
      }
    }
  }

  processProperties(interfaceDecl.getProperties());

  return {
    interfaceName,
    fields
  };
}

/**
 * Extract $variable arguments from SQL template
 * Returns unique argument names without the $ prefix
 */
export function extractSqlArguments(sqlTemplate: string): string[] {
  const regex = /\$([a-z_][a-z0-9_]*)/gi;
  const args = new Set<string>();
  let match;
  while ((match = regex.exec(sqlTemplate)) !== null) {
    args.add(match[1].toLowerCase());
  }
  return Array.from(args);
}

// ============================================================================
// Render Props Pattern Detection
// ============================================================================

/**
 * Result of analyzing JSX children for render props pattern
 */
export interface RenderPropsInfo {
  /** True if children is a single arrow function */
  isRenderProps: boolean;
  /** Parameter name used in arrow function (e.g., 'ctx') */
  paramName?: string;
  /** The arrow function AST node */
  arrowFunction?: ArrowFunction;
}

/**
 * Analyze JSX element children for render props pattern
 *
 * Detects when children is a single arrow function: {(ctx) => ...}
 * Returns info about the arrow function for transformer use.
 *
 * @param element - JSX element to analyze
 * @returns RenderPropsInfo with detection results
 */
export function analyzeRenderPropsChildren(
  element: JsxElement
): RenderPropsInfo {
  const children = element.getJsxChildren();

  // Filter out whitespace-only text nodes
  const nonWhitespace = children.filter(child => {
    if (Node.isJsxText(child)) {
      return child.getText().trim().length > 0;
    }
    return true;
  });

  // Must have exactly one child that's a JSX expression
  if (nonWhitespace.length !== 1) {
    return { isRenderProps: false };
  }

  const child = nonWhitespace[0];
  if (!Node.isJsxExpression(child)) {
    return { isRenderProps: false };
  }

  const expr = child.getExpression();
  if (!expr || !Node.isArrowFunction(expr)) {
    return { isRenderProps: false };
  }

  // Extract parameter (zero or one parameter supported)
  const params = expr.getParameters();
  if (params.length > 1) {
    return { isRenderProps: false };
  }

  return {
    isRenderProps: true,
    paramName: params.length > 0 ? params[0].getName() : undefined,
    arrowFunction: expr,
  };
}
