/**
 * Provider Template System
 *
 * Abstracts code generation for different storage backends.
 * Each provider generates bash/SQL skills for state operations.
 */

import type { StateSchema, OperationNode } from '../ir/nodes.js';

/**
 * Generated skill content
 */
export interface GeneratedSkill {
  /** Skill filename (e.g., "releases.read.md") */
  filename: string;
  /** Full markdown content for the skill file */
  content: string;
}

/**
 * Provider configuration passed to generators
 */
export interface ProviderContext {
  /** State name (e.g., "releases") */
  stateName: string;
  /** Database path from config */
  database: string;
  /** Parsed schema with flattened fields */
  schema: StateSchema;
}

/**
 * Provider template interface
 *
 * Each provider implements these methods to generate
 * storage-specific skill code.
 */
export interface ProviderTemplate {
  /** Provider identifier */
  readonly name: string;

  /**
   * Generate init skill - creates schema/table
   */
  generateInit(ctx: ProviderContext): GeneratedSkill;

  /**
   * Generate read skill - SELECT with optional field filter
   */
  generateRead(ctx: ProviderContext): GeneratedSkill;

  /**
   * Generate write skill - UPDATE field with value
   */
  generateWrite(ctx: ProviderContext): GeneratedSkill;

  /**
   * Generate delete skill - DELETE/reset state
   */
  generateDelete(ctx: ProviderContext): GeneratedSkill;

  /**
   * Generate custom operation skill
   */
  generateOperation(ctx: ProviderContext, operation: OperationNode): GeneratedSkill;
}

// Provider registry
const providers = new Map<string, ProviderTemplate>();

/**
 * Register a provider template
 */
export function registerProvider(provider: ProviderTemplate): void {
  providers.set(provider.name, provider);
}

// Lazy initialization flag
let initialized = false;

/**
 * Ensure built-in providers are registered
 * Uses dynamic import to avoid circular dependency issues
 */
async function ensureProviders(): Promise<void> {
  if (initialized) return;
  initialized = true;
  await import('./sqlite.js');
}

/**
 * Initialize providers synchronously (call at module load time)
 * This ensures providers are available for sync getProvider calls
 */
export function initializeProviders(): void {
  // Trigger async initialization
  ensureProviders();
}

/**
 * Get a provider by name
 * @throws Error if provider not registered
 */
export function getProvider(name: string): ProviderTemplate {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Unknown provider: ${name}. Available: ${Array.from(providers.keys()).join(', ')}`);
  }
  return provider;
}

/**
 * Get a provider by name with automatic initialization
 * Ensures providers are loaded before lookup
 */
export async function getProviderAsync(name: string): Promise<ProviderTemplate> {
  await ensureProviders();
  return getProvider(name);
}
