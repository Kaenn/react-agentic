/**
 * react-agentic/composites - User-definable convenience wrappers
 *
 * Composites wrap primitives to provide enhanced variants with common patterns.
 * Users can import these for "batteries included" behavior, or copy/modify
 * the source code to create custom variants.
 *
 * Import: import { IfElseBlock, LoopWithBreak } from 'react-agentic/composites'
 */

// Control flow composites
export { IfElseBlock, type IfElseBlockProps } from './IfElseBlock.js';
export { LoopWithBreak, type LoopWithBreakProps } from './LoopWithBreak.js';

// Agent composites
export { SpawnAgentWithRetry, type SpawnAgentWithRetryProps } from './SpawnAgentWithRetry.js';
