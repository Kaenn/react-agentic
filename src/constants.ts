/**
 * Shared constants for react-agentic
 *
 * Centralized location for magic numbers and configuration values
 * used across multiple modules.
 */

// ============================================================================
// Root Element Tags
// ============================================================================

/**
 * Supported root element tags for document files
 */
export const SUPPORTED_ROOT_TAGS = ['Command', 'RuntimeCommand', 'Agent'] as const;

export type SupportedRootTag = (typeof SUPPORTED_ROOT_TAGS)[number];

// ============================================================================
// File Watcher Constants
// ============================================================================

/**
 * Default debounce time in milliseconds for file watcher
 */
export const DEFAULT_DEBOUNCE_MS = 200;

/**
 * Time to wait for file writes to stabilize before triggering rebuild
 */
export const WRITE_STABILITY_THRESHOLD_MS = 100;

/**
 * Poll interval for write stability detection
 */
export const WRITE_STABILITY_POLL_MS = 50;

// ============================================================================
// Exit Codes
// ============================================================================

/**
 * Standard exit codes for CLI operations
 */
export const EXIT_CODES = {
  /** Successful execution */
  SUCCESS: 0,
  /** User/validation error (bad arguments, conflicts) */
  VALIDATION_ERROR: 1,
  /** Build/compilation error */
  BUILD_ERROR: 1,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];

// ============================================================================
// Build Configuration
// ============================================================================

/**
 * Default output directory for generated markdown files
 */
export const DEFAULT_OUTPUT_DIR = '.claude/commands';

/**
 * Default output directory for runtime bundles
 */
export const DEFAULT_RUNTIME_DIR = '.claude/runtime';

/**
 * Default glob pattern for watch mode when no patterns provided
 */
export const DEFAULT_WATCH_PATTERN = 'src/app/**/*.tsx';
