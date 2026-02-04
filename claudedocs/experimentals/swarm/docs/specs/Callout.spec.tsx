/**
 * @component Callout
 * @description Renders a callout block for important information
 */

import { CalloutType } from './enums';

// =============================================================================
// ENUMS (re-export for convenience)
// =============================================================================

export { CalloutType };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface CalloutProps {
  /**
   * Type of callout - determines icon and styling
   * Use CalloutType enum
   * @default CalloutType.Info
   */
  type?: CalloutType;

  /**
   * Callout content
   * @required
   */
  children: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Callout({ type = 'info', children }: CalloutProps) {
  // Implementation renders to markdown blockquote
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Info callout (using enum)
const InfoCallout = () => <Callout type={CalloutType.Info}>Workers will automatically claim tasks from the pool.</Callout>;

// Example 2: Warning callout (using enum)
const WarningCallout = () => (
  <Callout type={CalloutType.Warning}>Broadcasting sends N separate messages for N teammates. Use sparingly.</Callout>
);

// Example 3: Danger callout (using enum)
const DangerCallout = () => (
  <Callout type={CalloutType.Danger}>Never call cleanup while teammates are still active. This will fail and leave orphaned resources.</Callout>
);

// Example 4: Tip callout (using enum)
const TipCallout = () => (
  <Callout type={CalloutType.Tip}>Use haiku model for simple file scanning tasks to reduce costs and increase speed.</Callout>
);

// Example 5: Multiline callout (using enum)
const MultilineCallout = () => (
  <Callout type={CalloutType.Info}>
    {`This workflow has three phases:
1. Research - gather best practices
2. Implementation - build the feature
3. Review - security and quality check`}
  </Callout>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 (info) renders to:
 *
 * ```markdown
 * > ℹ️ **Info:** Workers will automatically claim tasks from the pool.
 * ```
 */

/**
 * Example 2 (warning) renders to:
 *
 * ```markdown
 * > ⚠️ **Warning:** Broadcasting sends N separate messages for N teammates. Use sparingly.
 * ```
 */

/**
 * Example 3 (danger) renders to:
 *
 * ```markdown
 * > 🚨 **Danger:** Never call cleanup while teammates are still active. This will fail and leave orphaned resources.
 * ```
 */

/**
 * Example 4 (tip) renders to:
 *
 * ```markdown
 * > 💡 **Tip:** Use haiku model for simple file scanning tasks to reduce costs and increase speed.
 * ```
 */

/**
 * Example 5 (multiline) renders to:
 *
 * ```markdown
 * > ℹ️ **Info:** This workflow has three phases:
 * > 1. Research - gather best practices
 * > 2. Implementation - build the feature
 * > 3. Review - security and quality check
 * ```
 */

// =============================================================================
// CALLOUT TYPE REFERENCE
// =============================================================================

/**
 * | Type | Icon | Use Case |
 * |------|------|----------|
 * | info | ℹ️ | General information, context, explanations |
 * | warning | ⚠️ | Cautions, potential issues, things to watch for |
 * | danger | 🚨 | Critical warnings, actions that can cause problems |
 * | tip | 💡 | Best practices, helpful hints, optimizations |
 */
