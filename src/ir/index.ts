/**
 * IR Module - Intermediate Representation types
 *
 * Re-exports all IR node types for convenient importing.
 */

export * from './nodes.js';
export * from './runtime-nodes.js';
export * from './swarm-nodes.js';
export {
  isPrimitive,
  getPrimitives,
  getComposites,
  getComponentInfo,
  PRIMITIVE_COMPONENTS,
  type PrimitiveKind,
  type ComponentInfo,
} from './registry.js';
export type {
  CommandContent,
  AgentContent,
  SubComponentContent,
} from './content-types.js';
