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
  Expression,
} from 'ts-morph';
import type { BlockNode } from '../../ir/index.js';
import type { LocalComponentInfo } from './runtime-types.js';
import type { TransformContext } from './types.js';
import { getElementName, extractJsonValue, isCustomComponent } from './runtime-utils.js';
import { parseRuntimeVarRef } from './runtime-var.js';
import { extractRuntimeFnDeclarations } from './runtime-fn.js';

// Import will be resolved after this module is loaded (circular import handling)
import { transformToRuntimeBlock as dispatchTransform, transformFragmentChildrenForComponent } from './dispatch.js';

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
  ctx: TransformContext
): void {
  // Find variable declarations with PascalCase names that are arrow functions or function expressions
  for (const varDecl of sourceFile.getVariableDeclarations()) {
    const name = varDecl.getName();
    if (!isCustomComponent(name)) continue;

    const init = varDecl.getInitializer();
    if (!init) continue;

    if (Node.isArrowFunction(init) || Node.isFunctionExpression(init)) {
      ctx.localComponents!.set(name, {
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

    ctx.localComponents!.set(name, {
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
  ctx: TransformContext
): void {
  // Track processed files to avoid infinite recursion from circular imports
  const processedFiles = new Set<string>();
  extractExternalComponentsFromFile(sourceFile, ctx, processedFiles);
}

/**
 * Extract external components from a source file and recursively scan their source files
 *
 * When component A imports component B which imports component C,
 * all three must be registered for nested component resolution.
 */
function extractExternalComponentsFromFile(
  sourceFile: SourceFile,
  ctx: TransformContext,
  processedFiles: Set<string>
): void {
  const filePath = sourceFile.getFilePath();
  if (processedFiles.has(filePath)) return;
  processedFiles.add(filePath);

  // Collect source files of newly discovered external components
  const newExternalFiles: SourceFile[] = [];

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();

    // Skip non-relative imports (node_modules)
    if (!specifier.startsWith('.')) continue;

    // Process default imports
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport && isCustomComponent(defaultImport.getText())) {
      const extFile = extractExternalComponent(defaultImport.getText(), importDecl, ctx, true);
      if (extFile) newExternalFiles.push(extFile);
    }

    // Process named imports
    for (const namedImport of importDecl.getNamedImports()) {
      const name = namedImport.getName();
      if (isCustomComponent(name)) {
        const extFile = extractExternalComponent(name, importDecl, ctx, false);
        if (extFile) newExternalFiles.push(extFile);
      }
    }
  }

  // Recursively scan source files of newly discovered external components
  for (const extFile of newExternalFiles) {
    // Extract runtimeFn declarations from external component files
    // (import paths are resolved to absolute in extractRuntimeFnDeclarations)
    extractRuntimeFnDeclarations(extFile, ctx);

    extractExternalComponentsFromFile(extFile, ctx, processedFiles);
  }
}

/**
 * Extract a single external component and add to context
 *
 * @returns The external component's source file (for recursive scanning), or undefined if skipped
 */
function extractExternalComponent(
  name: string,
  importDecl: ImportDeclaration,
  ctx: TransformContext,
  isDefault: boolean
): SourceFile | undefined {
  // Skip if already defined locally (local definitions take precedence)
  if (ctx.localComponents!.has(name)) return undefined;

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
  ctx.localComponents!.set(name, {
    name,
    declaration: decl,
    propNames,
    sourceFilePath: externalFile.getFilePath(),
    isExternal: true,
    importPath: importDecl.getModuleSpecifierValue(),
  });

  return externalFile;
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
 * Result of extracting props from component usage
 */
interface ExtractedProps {
  /** Evaluated prop values (JSON-serializable) */
  values: Map<string, unknown>;
  /** Original AST expression nodes (for resolving identifiers in conditions) */
  expressions: Map<string, Expression>;
}

/**
 * Extract props from component usage site
 *
 * Handles:
 * - prop="value" -> { prop: "value" }
 * - prop={123} -> { prop: 123 }
 * - prop={true} -> { prop: true }
 * - prop={{ key: "value" }} -> { prop: { key: "value" } }
 * - prop (no value) -> { prop: true }
 * - prop={`text ${runtimeVar}`} -> { prop: "text $VAR" } (RuntimeVar resolution)
 *
 * Also stores original AST expressions for resolving prop identifiers
 * when composites use control flow (e.g., <If condition={condition}/>)
 */
function extractPropsFromUsage(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ExtractedProps {
  const values = new Map<string, unknown>();
  const expressions = new Map<string, Expression>();
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  for (const attr of opening.getAttributes()) {
    if (!Node.isJsxAttribute(attr)) continue;

    const name = attr.getNameNode().getText();
    const init = attr.getInitializer();

    if (!init) {
      // Boolean shorthand: <Component enabled />
      values.set(name, true);
    } else if (Node.isStringLiteral(init)) {
      values.set(name, init.getLiteralValue());
    } else if (Node.isJsxExpression(init)) {
      const expr = init.getExpression();
      if (expr) {
        // Try to resolve template expressions with RuntimeVar interpolation
        const resolved = resolveRuntimeVarPropValue(expr, ctx);
        if (resolved !== undefined) {
          values.set(name, resolved);
        } else if (Node.isIdentifier(expr) && ctx.componentProps?.has(expr.getText())) {
          // Resolve identifier through parent component's prop values
          // Enables nested components to inherit string props transitively
          values.set(name, ctx.componentProps.get(expr.getText()));
        } else {
          values.set(name, extractJsonValue(expr));
        }
        // Store the original expression for condition resolution
        expressions.set(name, expr);
      }
    }
  }

  return { values, expressions };
}

/**
 * Resolve a prop expression that may contain RuntimeVar references
 *
 * Handles:
 * - Template expressions: `text ${ctx.field}` -> "text $CTX.field"
 * - Direct RuntimeVar refs: ctx.field -> "$CTX.field"
 *
 * Returns undefined if the expression doesn't contain RuntimeVars.
 */
function resolveRuntimeVarPropValue(
  expr: Expression,
  ctx: TransformContext
): string | undefined {
  // Template expression: `text ${ctx.field}`
  if (Node.isTemplateExpression(expr)) {
    let hasRuntimeVar = false;
    const parts: string[] = [];
    parts.push(expr.getHead().getLiteralText());

    for (const span of expr.getTemplateSpans()) {
      const spanExpr = span.getExpression();
      const ref = parseRuntimeVarRef(spanExpr, ctx);
      if (ref) {
        hasRuntimeVar = true;
        const pathStr = ref.path.length === 0
          ? ''
          : ref.path.reduce((acc: string, p: string) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
        parts.push(`$${ref.varName}${pathStr}`);
      } else {
        parts.push(`\${${spanExpr.getText()}}`);
      }
      parts.push(span.getLiteral().getLiteralText());
    }

    if (hasRuntimeVar) {
      return parts.join('');
    }
  }

  // Direct RuntimeVar reference: ctx.field
  const ref = parseRuntimeVarRef(expr, ctx);
  if (ref) {
    const pathStr = ref.path.length === 0
      ? ''
      : ref.path.reduce((acc: string, p: string) => acc + (/^\d+$/.test(p) ? `[${p}]` : `.${p}`), '');
    return `$${ref.varName}${pathStr}`;
  }

  return undefined;
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
  ctx: TransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: TransformContext) => BlockNode[]
): BlockNode | BlockNode[] | null {
  const name = getElementName(node);
  const info = ctx.localComponents?.get(name);
  if (!info) return null;

  // Circular reference detection
  if (ctx.componentExpansionStack!.has(name)) {
    throw ctx.createError(`Circular component reference detected: ${name}`, node);
  }

  ctx.componentExpansionStack!.add(name);

  // Save current context values
  const prevProps = ctx.componentProps;
  const prevChildren = ctx.componentChildren;
  const prevPropExpressions = ctx.componentPropExpressions;

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

    // Extract props from usage site (values + expressions)
    const { values: props, expressions: propExpressions } = extractPropsFromUsage(node, ctx);

    // Extract children from usage site (for children prop support)
    const childrenBlocks = extractChildrenFromUsage(node, ctx, transformRuntimeBlockChildren);

    // Set component props, children, and expressions in context for substitution
    ctx.componentProps = props;
    ctx.componentChildren = childrenBlocks;
    ctx.componentPropExpressions = propExpressions;

    // Transform the component's JSX with prop substitution
    return transformComponentJsx(jsx, props, childrenBlocks, info.propNames, ctx, transformRuntimeBlockChildren);
  } finally {
    // Restore previous context values
    ctx.componentProps = prevProps;
    ctx.componentChildren = prevChildren;
    ctx.componentPropExpressions = prevPropExpressions;
    ctx.componentExpansionStack!.delete(name);
  }
}

/**
 * Extract children from component usage for children prop
 */
function extractChildrenFromUsage(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: TransformContext) => BlockNode[]
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
 *
 * For fragments, uses transformRuntimeBlockChildren to handle If/Else sibling pairs.
 * This is critical for composites like IfElseBlock that contain If/Else pairs.
 */
function transformComponentJsx(
  jsx: JsxElement | JsxSelfClosingElement | JsxFragment,
  props: Map<string, unknown>,
  childrenBlocks: BlockNode[] | null,
  propNames: string[],
  ctx: TransformContext,
  transformRuntimeBlockChildren: (parent: JsxElement, ctx: TransformContext) => BlockNode[]
): BlockNode | BlockNode[] | null {
  // For fragments, use If/Else-aware processing via dispatch's transformFragmentChildren
  // This handles If/Else sibling pairs correctly when composites contain control flow
  if (Node.isJsxFragment(jsx)) {
    const blocks = transformFragmentChildrenForComponent(jsx, ctx);
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
  ctx: TransformContext
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
