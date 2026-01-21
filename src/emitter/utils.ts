/**
 * Emitter Utilities
 */

/**
 * Helper for exhaustiveness checking in switch statements.
 * If TypeScript complains that the argument is not of type 'never',
 * it means there's an unhandled case in the switch.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected node: ${JSON.stringify(x)}`);
}
