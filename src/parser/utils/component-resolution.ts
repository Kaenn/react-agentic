/**
 * Component import resolution utilities
 */

import {
  Node,
  JsxElement,
  JsxSelfClosingElement,
  JsxFragment,
  SourceFile,
  SyntaxKind,
} from 'ts-morph';

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
