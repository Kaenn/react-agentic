/**
 * State System Module
 *
 * Typed, persistent state for Commands and Agents.
 *
 * @example
 * import { FileAdapter, StateConfig } from './state/index.js';
 *
 * const config: StateConfig = {
 *   location: '.state/project.json',
 *   defaults: { name: '', phase: 0 }
 * };
 * const adapter = new FileAdapter(config);
 * const state = await adapter.read();
 */

export { StateAdapter, StateConfig, getNestedValue, setNestedValue } from './types.js';
export { FileAdapter } from './file-adapter.js';
