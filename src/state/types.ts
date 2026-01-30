/**
 * State System Types
 *
 * Core interfaces for the typed state persistence system.
 * Adapters implement StateAdapter to provide different storage backends.
 */

/**
 * Configuration for a state adapter
 */
export interface StateConfig {
  /** File path for FileAdapter, connection string for database adapters */
  location: string;
  /** Default value if state doesn't exist */
  defaults: unknown;
}

/**
 * Abstract interface for state storage backends
 *
 * Implementations:
 * - FileAdapter: JSON file storage (local development)
 * - Future: RedisAdapter, PostgresAdapter, SupabaseAdapter
 */
export interface StateAdapter<T = unknown> {
  /**
   * Read current state value
   * Creates with defaults if not exists
   * @returns Current state or defaults
   */
  read(): Promise<T>;

  /**
   * Write complete state value (replaces existing)
   * @param value - New state value
   */
  write(value: T): Promise<void>;

  /**
   * Read a nested field from state
   * @param path - Dot-notation path (e.g., "user.preferences.theme")
   * @returns Field value or undefined
   */
  readField(path: string): Promise<unknown>;

  /**
   * Write a single nested field
   * @param path - Dot-notation path
   * @param value - Value to write
   */
  writeField(path: string, value: unknown): Promise<void>;

  /**
   * Merge partial update into state (shallow merge at top level)
   * @param partial - Partial state to merge
   */
  merge(partial: Partial<T>): Promise<void>;

  /**
   * Check if state file/record exists
   * @returns true if exists, false otherwise
   */
  exists(): Promise<boolean>;
}

/**
 * Helper to get nested value from object using dot-notation path
 * @param obj - Source object
 * @param path - Dot-notation path (e.g., "user.preferences.theme")
 * @returns Value at path or undefined
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Helper to set nested value in object using dot-notation path
 * Creates intermediate objects as needed
 * @param obj - Target object (mutated in place)
 * @param path - Dot-notation path
 * @param value - Value to set
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
