/**
 * Cross-file type resolution utilities
 */

import {
  Node,
  SourceFile,
  InterfaceDeclaration,
} from 'ts-morph';

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
