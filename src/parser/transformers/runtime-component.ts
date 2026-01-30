/**
 * Runtime Component Transformer
 *
 * Handles build-time inlining of local function components.
 * Enables React-style component definitions:
 *
 * ```tsx
 * const Glenn = () => <h2>Glenn</h2>;
 * const Greeting = ({ name }: { name: string }) => <p>Hello {name}</p>;
 *
 * // Usage
 * <Glenn />
 * <Greeting name="World" />
 * ```
 */

import {
  Node,
  SourceFile,
  ArrowFunction,
  FunctionExpression,
  FunctionDeclaration,
  JsxElement,
  JsxSelfClosingElement,
  JsxFragment,
  ImportDeclaration,
} from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { RuntimeTransformContext, LocalComponentInfo } from './runtime-types.js';
import { getElementName, extractJsonValue, isCustomComponent } from './runtime-utils.js';

// Import will be resolved after this module is loaded (circular import handling)
import { transformToRuntimeBlock as dispatchTransform } from './runtime-dispatch.js';

// ============================================================================
// Component Extraction
// ============================================================================

/**
 * Extract all local component definitions from a source file
 *
 * Scans for:
 * - Variable declarations: `const Glenn = () => <h2>Glenn</h2>`
 * - Function declarations: `function Glenn() { return <h2>Glenn</h2> }`
 *
 * Components must:
 * - Have PascalCase names
 * - Be arrow functions, function expressions, or function declarations
 * - Return JSX
 */
export function extractLocalComponentDeclarations(
  sourceFile: SourceFile,
  ctx: RuntimeTransformContext
): void {
  // Find variable declarations with PascalCase names that are arrow functions or function expressions
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const name = varDecl.getName();
    if (!isCustomComponent(name)) continue;

    const init = varDecl.getInitializer();
    if (!init) continue;

    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      ctx.localComponents.set(name, {
        name,
        declaration: varDecl,
        propNames: extractPropNames(init),
      });
    }
  }

  // Also check function declarations
  for (const funcDecl of sourceFile.getFunctions()) {
    const name = funcDecl.getName();
    if (!name || !isCustomComponent(name)) continue;

    ctx.localComponents.set(name, {
      name,
      declaration: funcDecl,
      propNames: extractFunctionPropNames(funcDecl),
    });
  }
}

/**
 * Extract external component declarations from imports
 *
 * Scans for relative imports that reference PascalCase components
 * and registers them in the context for build-time inlining.
 *
 * Supports:
 * - Default imports: `import Banner from './banner'`
 * - Named imports: `import { Header, Footer } from './ui'`
 */
export function extractExternalComponentDeclarations(
  sourceFile: SourceFile,
  ctx: RuntimeTransformContext
): void {
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();

    // Skip non-relative imports (node_modules)
    if (!specifier.startsWith('.')) continue;

    // Process default imports
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport && isCustomComponent(defaultImport.getText())) {
      extractExternalComponent(defaultImport.getText(), importDecl, ctx, true);
    }

    // Process named imports
    for (const namedImport of importDecl.getNamedImports()) {
      const name = namedImport.getName();
      if (isCustomComponent(name)) {
        extractExternalComponent(name, importDecl, ctx, false);
      }
    }
  }
}

/**
 * Extract a single external component and add to context
 */
function extractExternalComponent(
  name: string,
  importDecl: ImportDeclaration,
  ctx: RuntimeTransformContext,
  isDefault: boolean
): void {
  // Skip if already defined locally (local definitions take precedence)
  if (ctx.localComponents.has(name)) return;

  const externalFile = importDecl.getModuleSpecifierSourceFile();
  if (!externalFile) {
    throw ctx.createError(`Cannot resolve import for '${name}'`, importDecl);
  }

  // Get exported declarations
  const exports = externalFile.getExportedDeclarations();
  const decls = isDefault ? exports.get('default') : exports.get(name);

  if (!decls || decls.length === 0) {
    throw ctx.createError(`Component '${name}' not exported from '${importDecl.getModuleSpecifierValue()}'`, importDecl);
  }

  const decl = decls[0];

  // Extract prop names from the component declaration
  const propNames = extractExternalPropNames(decl);

  // Store in localComponents (same map, isExternal flag differentiates)
  ctx.localComponents.set(name, {
    name,
    declaration: decl,
    propNames,
    sourceFilePath: externalFile.getFilePath(),
    isExternal: true,
    importPath: importDecl.getModuleSpecifierValue(),
  });
}

/**
 * Extract prop names from an external component declaration
 *
 * Handles both variable declarations (arrow functions) and function declarations.
 */
function extractExternalPropNames(decl: Node): string[] {
  // Variable declaration with arrow function or function expression
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
      return extractPropNames(init);
    }
  }

  // Function declaration
  if (Node.isFunctionDeclaration(decl)) {
    return extractFunctionPropNames(decl);
  }

  return [];
}

/**
 * Extract prop names from arrow function or function expression parameters
 */
function extractPropNames(fn: ArrowFunction | FunctionExpression): string[] {
  const params = fn.getParameters();
  if (params.length === 0) return [];

  const firstParam = params[0];
  const bindingName = firstParam.getNameNode();

  // Destructured: ({ title, count, children }) => ...
  if (Node.isObjectBindingPattern(bindingName)) {
    return bindingName.getElements().map(el => el.getName());
  }

  // Simple: (props) => ...
  return [firstParam.getName()];
}

/**
 * Extract prop names from function declaration parameters
 */
function extractFunctionPropNames(fn: FunctionDeclaration): string[] {
  const params = fn.getParameters();
  if (params.length === 0) return [];

  const firstParam = params[0];
  const bindingName = firstParam.getNameNode();

  // Destructured: function Foo({ title }) { ... }
  if (Node.isObjectBindingPattern(bindingName)) {
    return bindingName.getElements().map(el => el.getName());
  }

  // Simple: function Foo(props) { ... }
  return [firstParam.getName()];
}

// ============================================================================
// JSX Extraction from Component
// ============================================================================

/**
 * Extract JSX from a component's body
 *
 * Handles:
 * - Arrow function with expression body: `() => <div>...</div>`
 * - Arrow function with block body: `() => { return <div>...</div> }`
 * - Function declaration: `function Foo() { return <div>...</div> }`
 */
function extractJsxFromComponent(
  info: LocalComponentInfo
): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  const decl = info.declaration;

  // Variable declaration with arrow function or function expression
  if (Node.isVariableDeclaration(decl)) {
    const init = decl.getInitializer();
    if (!init) return null;

    if (Node.isArrowFunction(init)) {
      return extractJsxFromArrowFunction(init);
    }

    if (Node.isFunctionExpression(init)) {
      return extractJsxFromFunctionBody(init);
    }
  }

  // Function declaration
  if (Node.isFunctionDeclaration(decl)) {
    return extractJsxFromFunctionBody(decl);
  }

  return null;
}

/**
 * Extract JSX from arrow function
 */
function extractJsxFromArrowFunction(fn: ArrowFunction): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  const body = fn.getBody();

  // Expression body: () => <div>...</div>
  if (Node.isJsxElement(body) || Node.isJsxSelfClosingElement(body) || Node.isJsxFragment(body)) {
    return body;
  }

  // Parenthesized expression: () => (<div>...</div>)
  if (Node.isParenthesizedExpression(body)) {
    let inner = body.getExpression();
    while (Node.isParenthesizedExpression(inner)) {
      inner = inner.getExpression();
    }
    if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner) || Node.isJsxFragment(inner)) {
      return inner;
    }
  }

  // Block body: () => { return <div>...</div> }
  if (Node.isBlock(body)) {
    return extractJsxFromBlock(body);
  }

  return null;
}

/**
 * Extract JSX from function body (function expression or declaration)
 */
function extractJsxFromFunctionBody(fn: FunctionExpression | FunctionDeclaration): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  const body = fn.getBody();
  if (!body || !Node.isBlock(body)) return null;
  return extractJsxFromBlock(body);
}

/**
 * Extract JSX from a block (looks for return statement)
 */
function extractJsxFromBlock(block: Node): JsxElement | JsxSelfClosingElement | JsxFragment | null {
  let result: JsxElement | JsxSelfClosingElement | JsxFragment | null = null;

  block.forEachDescendant((node, traversal) => {
    if (Node.isReturnStatement(node)) {
      const expr = node.getExpression();
      if (expr) {
        // Unwrap parentheses
        let inner = expr;
        while (Node.isParenthesizedExpression(inner)) {
          inner = inner.getExpression();
        }

        if (Node.isJsxElement(inner) || Node.isJsxSelfClosingElement(inner) || Node.isJsxFragment(inner)) {
          result = inner;
          traversal.stop();
        }
      }
    }
  });

  return result;
}

// ============================================================================
// Props Extraction from Usage Site
// ============================================================================

/**
 * Extract props from component usage site
 *
 * Handles:
 * - prop="value" -> { prop: "value" }
 * - prop={123} -> { prop: 123 }
 * - prop={true} -> { prop: true }
 * - prop={{ key: "value" }} -> { prop: { key: "value" } }
 * - prop (no value) -> { prop: true }
 */
function extractPropsFromUsage(
  node: JsxElement | JsxSelfClosingElement
): Map<string, unknown> {
  const props = new Map<string, unknown>();
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  for (const attr of opening.getAttributes()) {
    if (!Node.isJsxAttribute(attr)) continue;

    const name = attr.getNameNode().getText();
    const init = attr.getInitializer();

    if (!init) {
      // Boolean shorthand: <Component enabled />
      props.set(name, true);
    } else if (Node.isStringLiteral(init)) {
      props.set(name, init.getLiteralValue());
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr) {
        props.set(name, extractJsonValue(expr));
      }
    }
  }

  return props;
}

// ============================================================================
// Component Transformation
// ============================================================================

/**
 * Transform a local component usage to inlined JSX
 *
 * This is the main entry point called from runtime-dispatch.ts when
 * encountering a PascalCase element that matches a local component.
 */
export function transformLocalComponent(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: RuntimeTransformContext) => BlockNode[]
): BlockNode | BlockNode[] | null {
  const name = getElementName(node);
  const info = ctx.localComponents.get(name);
  if (!info) return null;

  // Circular reference detection
  if (ctx.componentExpansionStack.has(name)) {
    throw ctx.createError(`Circular component reference detected: ${name}`, node);
  }

  ctx.componentExpansionStack.add(name);

  // Save current context values
  const prevProps = ctx.componentProps;
  const prevChildren = ctx.componentChildren;

  try {
    // Get JSX from component (cache on first use)
    let jsx = info.jsx;
    if (!jsx) {
      const extracted = extractJsxFromComponent(info);
      if (!extracted) {
        throw ctx.createError(`Component '${name}' does not return JSX`, node);
      }
      jsx = extracted;
      info.jsx = extracted;
    }

    // Extract props from usage site
    const props = extractPropsFromUsage(node);

    // Extract children from usage site (for children prop support)
    const childrenBlocks = extractChildrenFromUsage(node, ctx, transformRuntimeBlockChildren);

    // Set component props and children in context for substitution
    ctx.componentProps = props;
    ctx.componentChildren = childrenBlocks;

    // Transform the component's JSX with prop substitution
    return transformComponentJsx(jsx, props, childrenBlocks, info.propNames, ctx, transformRuntimeBlockChildren);
  } finally {
    // Restore previous context values
    ctx.componentProps = prevProps;
    ctx.componentChildren = prevChildren;
    ctx.componentExpansionStack.delete(name);
  }
}

/**
 * Extract children from component usage for children prop
 */
function extractChildrenFromUsage(
  node: JsxElement | JsxSelfClosingElement,
  ctx: RuntimeTransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: RuntimeTransformContext) => BlockNode[]
): BlockNode[] | null {
  // Self-closing elements have no children
  if (Node.isJsxSelfClosingElement(node)) return null;

  // Get JSX children and transform them
  const jsxChildren = node.getJsxChildren();
  if (jsxChildren.length === 0) return null;

  // Check if there's any meaningful content
  const hasContent = jsxChildren.some(child => {
    if (Node.isJsxText(child)) {
      return child.getText().trim().length > 0;
    }
    return true;
  });

  if (!hasContent) return null;

  // Transform children using existing transformers
  return transformRuntimeBlockChildren(node, ctx);
}

/**
 * Transform component's JSX with prop substitution
 *
 * This walks the component's JSX and:
 * - Substitutes {propName} with actual values
 * - Substitutes {props.propName} with actual values
 * - Substitutes {children} with the children blocks
 */
function transformComponentJsx(
  jsx: JsxElement | JsxSelfClosingElement | JsxFragment,
  props: Map<string, unknown>,
  childrenBlocks: BlockNode[] | null,
  propNames: string[],
  ctx: RuntimeTransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: RuntimeTransformContext) => BlockNode[]
): BlockNode | BlockNode[] | null {
  // For fragments, transform all children and return as array
  if (Node.isJsxFragment(jsx)) {
    const blocks: BlockNode[] = [];
    for (const child of jsx.getJsxChildren()) {
      const block = transformComponentChild(child, props, childrenBlocks, propNames, ctx);
      if (block) {
        if (Array.isArray(block)) {
          blocks.push(...block);
        } else {
          blocks.push(block);
        }
      }
    }
    return blocks.length > 0 ? blocks : null;
  }

  // For single elements, transform directly
  return dispatchTransform(jsx, ctx);
}

/**
 * Transform a single child of the component's JSX
 */
function transformComponentChild(
  child: Node,
  props: Map<string, unknown>,
  childrenBlocks: BlockNode[] | null,
  propNames: string[],
  ctx: RuntimeTransformContext
): BlockNode | BlockNode[] | null {
  // Handle JSX expressions that might be {children}
  if (Node.isJsxExpression(child)) {
    const expr = child.getExpression();
    if (expr) {
      const text = expr.getText();
      // Check for {children} or {props.children}
      if (text === 'children' || text === 'props.children') {
        return childrenBlocks;
      }
    }
  }

  // For other nodes, use standard transformation
  return dispatchTransform(child, ctx);
}
