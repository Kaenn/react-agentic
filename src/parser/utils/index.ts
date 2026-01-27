/**
 * Parser utilities barrel export
 *
 * Re-exports all public APIs from utility modules for convenient importing.
 */

// Project creation and parsing
export {
  createProject,
  parseFile,
  parseSource,
  type CreateProjectOptions
} from './project.js';

// JSX traversal
export {
  getElementName,
  getJsxChildren,
  getAttributeValue,
  getArrayAttributeValue,
  getTestAttributeValue,
  findRootJsxElement,
  type JsxChild
} from './jsx-traversal.js';

// Text extraction
export {
  extractText,
  extractInlineText,
  normalizeWhitespace,
  normalizeInlineWhitespace,
  isWhitespaceOnlyText
} from './text-extraction.js';

// Spread resolution
export {
  resolveSpreadAttribute,
  extractObjectLiteralProps
} from './spread-resolution.js';

// Component resolution
export {
  resolveComponentImport,
  extractJsxFromComponent,
  type ResolvedComponent
} from './component-resolution.js';

// Type resolution
export {
  resolveTypeImport,
  extractInterfaceProperties,
  extractPromptPlaceholders,
  type ResolvedType,
  type InterfaceProperty
} from './type-resolution.js';

// Variable and state extraction
export {
  extractVariableDeclarations,
  extractTypeArguments,
  analyzeRenderPropsChildren,
  extractInputObjectLiteral,
  extractStateSchema,
  extractSqlArguments,
  isVariableRef,
  type ExtractedVariable,
  type RenderPropsInfo
} from './variable-extraction.js';
