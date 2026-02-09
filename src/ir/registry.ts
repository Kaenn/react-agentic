/**
 * Primitive Component Registry
 *
 * Formalizes which components are compiler-owned primitives vs user-definable composites.
 * Infrastructure primitives handle plumbing (agents, control flow).
 * Presentation primitives are destined for composite layer in Phase 32.
 */

// ============================================================================
// Primitive Component Registry
// ============================================================================

/**
 * All primitive component kinds (node.kind values)
 */
export const PRIMITIVE_COMPONENTS = new Set([
  // Infrastructure primitives (will remain primitives)
  'spawnAgent',
  'if',
  'else',
  'loop',
  'break',
  'return',
  'askUser',
  'runtimeVarDecl',
  'runtimeCall',
  'onStatus',

  // Presentation primitives (destined for composite in Phase 32)
  'table',
  'list',
  'indent',
  'executionContext',
  'successCriteria',
  'offerNext',
  'xmlBlock',
  'step',

  // Core document structure
  'document',
  'agentDocument',
  'frontmatter',
  'agentFrontmatter',
] as const);

/**
 * Type representing all primitive component kinds
 */
export type PrimitiveKind = typeof PRIMITIVE_COMPONENTS extends Set<infer T> ? T : never;

// ============================================================================
// Component Classification
// ============================================================================

/**
 * Component classification metadata
 */
export interface ComponentInfo {
  kind: string;
  category: 'primitive' | 'composite';
  layer: 'infrastructure' | 'presentation' | 'document';
  migrationTarget?: 'composite';  // For presentation primitives
}

/**
 * Infrastructure primitive kinds (control flow, agents, runtime)
 */
const INFRASTRUCTURE_KINDS = new Set([
  'spawnAgent',
  'if',
  'else',
  'loop',
  'break',
  'return',
  'askUser',
  'runtimeVarDecl',
  'runtimeCall',
  'onStatus',
]);

/**
 * Presentation primitive kinds (destined for composite migration)
 */
const PRESENTATION_KINDS = new Set([
  'table',
  'list',
  'indent',
  'executionContext',
  'successCriteria',
  'offerNext',
  'xmlBlock',
  'step',
]);

/**
 * Document structure kinds (root nodes, frontmatter)
 */
const DOCUMENT_KINDS = new Set([
  'document',
  'agentDocument',
  'frontmatter',
  'agentFrontmatter',
]);

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Check if a node is a compiler-owned primitive component
 *
 * @param node - Node with a kind property
 * @returns true if the node is a primitive component
 *
 * @example
 * isPrimitive({ kind: 'if' }) // true
 * isPrimitive({ kind: 'MyCustomComponent' }) // false
 */
export function isPrimitive(node: { kind: string }): boolean {
  return PRIMITIVE_COMPONENTS.has(node.kind as any);
}

/**
 * Get the set of all primitive component kinds
 *
 * @returns Readonly set of primitive kinds
 */
export function getPrimitives(): ReadonlySet<string> {
  return PRIMITIVE_COMPONENTS;
}

/**
 * Get the list of all composite component kinds
 *
 * Currently returns an empty array - will be populated in Phase 32
 * when presentation primitives are migrated to the composite layer.
 *
 * @returns Array of composite component kinds
 */
export function getComposites(): string[] {
  return [];
}

/**
 * Get classification metadata for a component kind
 *
 * @param kind - Component kind string
 * @returns Classification metadata
 *
 * @example
 * getComponentInfo('table')
 * // { kind: 'table', category: 'primitive', layer: 'presentation', migrationTarget: 'composite' }
 *
 * getComponentInfo('if')
 * // { kind: 'if', category: 'primitive', layer: 'infrastructure' }
 *
 * getComponentInfo('MyCustomComponent')
 * // { kind: 'MyCustomComponent', category: 'composite', layer: 'presentation' }
 */
export function getComponentInfo(kind: string): ComponentInfo {
  // Check if it's a primitive
  if (!PRIMITIVE_COMPONENTS.has(kind as any)) {
    // Unknown kinds are assumed to be user composites
    return {
      kind,
      category: 'composite',
      layer: 'presentation',
    };
  }

  // Determine layer
  let layer: 'infrastructure' | 'presentation' | 'document';
  let migrationTarget: 'composite' | undefined;

  if (INFRASTRUCTURE_KINDS.has(kind)) {
    layer = 'infrastructure';
  } else if (PRESENTATION_KINDS.has(kind)) {
    layer = 'presentation';
    migrationTarget = 'composite'; // Mark for Phase 32 migration
  } else if (DOCUMENT_KINDS.has(kind)) {
    layer = 'document';
  } else {
    // Fallback (shouldn't happen if registry is complete)
    layer = 'presentation';
  }

  return {
    kind,
    category: 'primitive',
    layer,
    migrationTarget,
  };
}
