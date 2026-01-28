/**
 * Primitive components transformation module
 *
 * Handles transformStep, transformBash, transformReadFiles, transformPromptTemplate
 * and related helper functions for primitive markdown components.
 */

import { Node, JsxElement, JsxSelfClosingElement, JsxOpeningElement, ObjectLiteralExpression, TemplateExpression } from 'ts-morph';
import type { StepNode, StepVariant, CodeBlockNode, ReadFilesNode, ReadFileEntry, PromptTemplateNode, BlockNode, BaseBlockNode } from '../../ir/index.js';
import type { TransformContext } from './types.js';
import { getAttributeValue } from '../utils/index.js';
import { transformBlockChildren } from './dispatch.js';

/**
 * Transform Step component to StepNode IR
 */
export function transformStep(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): StepNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  // Extract number prop (supports both string and numeric literals)
  let stepNumber: string | undefined = undefined;
  const numberAttr = openingElement.getAttribute('number');
  if (numberAttr && Node.isJsxAttribute(numberAttr)) {
    const init = numberAttr.getInitializer();
    if (init) {
      // String literal: number="1.1"
      if (Node.isStringLiteral(init)) {
        stepNumber = init.getLiteralValue();
      }
      // JSX expression: number={1} or number={"1.1"}
      else if (Node.isJsxExpression(init)) {
        const expr = init.getExpression();
        if (expr) {
          if (Node.isNumericLiteral(expr)) {
            stepNumber = String(expr.getLiteralValue());
          } else if (Node.isStringLiteral(expr)) {
            stepNumber = expr.getLiteralValue();
          }
        }
      }
    }
  }

  // Extract name prop
  const name = getAttributeValue(openingElement, 'name');

  if (!stepNumber) {
    throw ctx.createError('Step requires number prop', openingElement);
  }
  if (!name) {
    throw ctx.createError('Step requires name prop', openingElement);
  }

  // Extract variant with default
  const variantAttr = getAttributeValue(openingElement, 'variant');
  let variant: StepVariant = 'heading'; // Default
  if (variantAttr === 'heading' || variantAttr === 'bold' || variantAttr === 'xml') {
    variant = variantAttr;
  }

  // Transform children
  const children = Node.isJsxElement(node)
    ? transformBlockChildren(node.getJsxChildren(), ctx)
    : [];

  return {
    kind: 'step',
    number: stepNumber,
    name,
    variant,
    children: children as BaseBlockNode[],
  };
}

/**
 * Transform <Bash> to CodeBlockNode with language 'bash'
 *
 * <Bash>ls -la</Bash>
 * becomes:
 * ```bash
 * ls -la
 * ```
 */
export function transformBash(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): CodeBlockNode {
  if (Node.isJsxSelfClosingElement(node)) {
    return { kind: 'codeBlock', language: 'bash', content: '' };
  }

  // Use extractCodeContent to preserve whitespace
  const content = extractCodeContent(node);

  return {
    kind: 'codeBlock',
    language: 'bash',
    content,
  };
}

/**
 * Transform <ReadFiles> to ReadFilesNode
 *
 * Extracts the files prop (which should be a defineFiles() result)
 * and creates a ReadFilesNode with file entries.
 */
export function transformReadFiles(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): ReadFilesNode {
  const opening = Node.isJsxElement(node) ? node.getOpeningElement() : node;

  // Get the 'files' prop - should be an identifier referencing defineFiles result
  const filesAttr = opening.getAttribute('files');
  if (!filesAttr || !Node.isJsxAttribute(filesAttr)) {
    throw ctx.createError('ReadFiles requires files prop', node);
  }

  const init = filesAttr.getInitializer();
  if (!init || !Node.isJsxExpression(init)) {
    throw ctx.createError('ReadFiles files prop must be a JSX expression', node);
  }

  const expr = init.getExpression();
  if (!expr) {
    throw ctx.createError('ReadFiles files prop expression is empty', node);
  }

  // The files prop should reference a variable that holds defineFiles() result
  // We need to trace back to find the defineFiles() call and extract its schema
  const files: ReadFileEntry[] = [];

  // If it's an identifier, look up the variable declaration
  if (Node.isIdentifier(expr)) {
    const varName = expr.getText();
    // Find the variable declaration in the source file
    const sourceFile = ctx.sourceFile;
    if (sourceFile) {
      const statements = sourceFile.getStatements();
      for (const stmt of statements) {
        if (Node.isVariableStatement(stmt)) {
          for (const decl of stmt.getDeclarationList().getDeclarations()) {
            if (decl.getName() === varName) {
              const initializer = decl.getInitializer();
              if (initializer && Node.isCallExpression(initializer)) {
                const callee = initializer.getExpression();
                if (Node.isIdentifier(callee) && callee.getText() === 'defineFiles') {
                  // Found the defineFiles call - extract the schema
                  const args = initializer.getArguments();
                  if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                    extractFilesFromSchema(args[0], files);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  // If it's a call expression directly: <ReadFiles files={defineFiles({...})} />
  else if (Node.isCallExpression(expr)) {
    const callee = expr.getExpression();
    if (Node.isIdentifier(callee) && callee.getText() === 'defineFiles') {
      const args = expr.getArguments();
      if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
        extractFilesFromSchema(args[0], files);
      }
    }
  }

  if (files.length === 0) {
    throw ctx.createError('ReadFiles: could not extract files from defineFiles schema', node);
  }

  return {
    kind: 'readFiles',
    files,
  };
}

/**
 * Transform <PromptTemplate> to PromptTemplateNode
 *
 * <PromptTemplate>
 *   <XmlBlock name="objective">...</XmlBlock>
 * </PromptTemplate>
 *
 * Becomes:
 * ```markdown
 * <objective>
 * ...
 * </objective>
 * ```
 */
export function transformPromptTemplate(
  node: JsxElement | JsxSelfClosingElement,
  ctx: TransformContext
): PromptTemplateNode {
  if (Node.isJsxSelfClosingElement(node)) {
    return { kind: 'promptTemplate', children: [] };
  }

  // Transform children normally
  const children = transformBlockChildren(node.getJsxChildren(), ctx);

  return {
    kind: 'promptTemplate',
    children: children as BaseBlockNode[],
  };
}

/**
 * Extract code content from JSX element, preserving whitespace
 * Used by transformBash and similar code block transformers
 */
function extractCodeContent(node: JsxElement): string {
  const parts: string[] = [];

  for (const child of node.getJsxChildren()) {
    if (Node.isJsxText(child)) {
      parts.push(child.getText());
    } else if (Node.isJsxExpression(child)) {
      // Handle {`template`} and {"string"} expressions
      const expr = child.getExpression();
      if (expr) {
        if (Node.isStringLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isNoSubstitutionTemplateLiteral(expr)) {
          parts.push(expr.getLiteralValue());
        } else if (Node.isTemplateExpression(expr)) {
          parts.push(extractTemplateContent(expr));
        }
      }
    }
  }

  // Join all parts
  let content = parts.join('');

  // Strip leading and trailing newlines (but preserve internal whitespace)
  content = content.replace(/^\n+/, '').replace(/\n+$/, '');

  return content;
}

/**
 * Extract content from template expression, preserving ${var} syntax
 */
function extractTemplateContent(expr: TemplateExpression): string {
  const parts: string[] = [];

  // Head: text before first ${...}
  parts.push(expr.getHead().getLiteralText());

  // Spans: each has expression + literal text after
  for (const span of expr.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Preserve ${...} syntax for bash/code
    parts.push(`\${${spanExpr.getText()}}`);
    parts.push(span.getLiteral().getLiteralText());
  }

  return parts.join('');
}

/**
 * Extract file entries from defineFiles schema object literal
 */
function extractFilesFromSchema(obj: ObjectLiteralExpression, files: ReadFileEntry[]): void {
  for (const prop of obj.getProperties()) {
    if (Node.isPropertyAssignment(prop)) {
      const key = prop.getName();
      const value = prop.getInitializer();

      if (value && Node.isObjectLiteralExpression(value)) {
        // Extract path and required from the FileDef object
        let path: string | undefined;
        let required = true; // Default true

        for (const fileProp of value.getProperties()) {
          if (Node.isPropertyAssignment(fileProp)) {
            const propName = fileProp.getName();
            const propValue = fileProp.getInitializer();

            if (propName === 'path' && propValue) {
              if (Node.isStringLiteral(propValue)) {
                path = propValue.getLiteralValue();
              } else if (Node.isNoSubstitutionTemplateLiteral(propValue)) {
                path = propValue.getLiteralValue();
              } else if (Node.isTemplateExpression(propValue)) {
                // Template with ${} - preserve as-is for shell interpolation
                path = extractTemplatePath(propValue);
              }
            } else if (propName === 'required' && propValue) {
              if (propValue.getText() === 'false') {
                required = false;
              }
            }
          }
        }

        if (path) {
          // Convert key to UPPER_SNAKE_CASE + _CONTENT
          const varName = key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase() + '_CONTENT';
          files.push({ varName, path, required });
        }
      }
    }
  }
}

/**
 * Extract path from template expression, preserving ${} for shell
 */
function extractTemplatePath(tmpl: TemplateExpression): string {
  let result = tmpl.getHead().getLiteralText();

  for (const span of tmpl.getTemplateSpans()) {
    const spanExpr = span.getExpression();
    // Convert TS ${expr} to shell ${expr}
    result += '${' + spanExpr.getText() + '}';
    result += span.getLiteral().getLiteralText();
  }

  return result;
}
