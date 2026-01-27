/**
 * Variable declaration extraction and input/state schema utilities
 */

import {
  Node,
  SourceFile,
  ObjectLiteralExpression,
  JsxElement,
  InterfaceDeclaration,
  ArrowFunction,
} from 'ts-morph';
import type { InputProperty, InputPropertyValue, StateSchema, StateSchemaField } from '../../ir/nodes.js';

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

    // Handle useVariable() call
    if (funcName === 'useVariable') {
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
 * @returns Array of InputProperty with proper InputPropertyValue types
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

    let value: InputPropertyValue;

    if (Node.isStringLiteral(initializer)) {
      const strValue = initializer.getLiteralValue();
      // Check for {placeholder} pattern
      const placeholderMatch = strValue.match(/^\{(\w+)\}$/);
      if (placeholderMatch) {
        value = { type: 'placeholder', name: placeholderMatch[1] };
      } else {
        value = { type: 'string', value: strValue };
      }
    } else if (Node.isNoSubstitutionTemplateLiteral(initializer)) {
      const strValue = initializer.getLiteralValue();
      // Check for {placeholder} pattern
      const placeholderMatch = strValue.match(/^\{(\w+)\}$/);
      if (placeholderMatch) {
        value = { type: 'placeholder', name: placeholderMatch[1] };
      } else {
        value = { type: 'string', value: strValue };
      }
    } else if (Node.isIdentifier(initializer)) {
      // Identifier referencing a variable
      const varName = initializer.getText();
      const variable = variables.get(varName);
      if (variable) {
        value = { type: 'variable', name: variable.envName };
      } else {
        // Unknown identifier - treat as string (will be validated elsewhere)
        value = { type: 'string', value: varName };
      }
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

  // Extract parameter (should be exactly one)
  const params = expr.getParameters();
  if (params.length !== 1) {
    return { isRenderProps: false };
  }

  return {
    isRenderProps: true,
    paramName: params[0].getName(),
    arrowFunction: expr,
  };
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
 *
 * NOTE: This function is duplicated from component-resolution.ts for now.
 * Will be resolved when parser.ts imports are updated to use utils/.
 */
import { SyntaxKind } from 'ts-morph';

export function extractTypeArguments(
  element: JsxElement | import('ts-morph').JsxSelfClosingElement
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
