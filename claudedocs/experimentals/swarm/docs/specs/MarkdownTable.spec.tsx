/**
 * @component MarkdownTable
 * @description Renders a markdown table from structured data
 */

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface MarkdownTableProps {
  /**
   * Column headers
   * @required
   */
  headers: string[];

  /**
   * Table rows - each row is an array of cell values
   * @required
   */
  rows: string[][];

  /**
   * Optional caption for the table
   * @optional
   */
  caption?: string;

  /**
   * Column alignment (left, center, right)
   * @default all left-aligned
   */
  align?: ('left' | 'center' | 'right')[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MarkdownTable({ headers, rows, caption, align }: MarkdownTableProps) {
  // Implementation renders to markdown table
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple table
const SimpleTable = () => (
  <MarkdownTable
    headers={['Name', 'Type', 'Description']}
    rows={[
      ['worker-1', 'general-purpose', 'Main implementation worker'],
      ['researcher', 'Explore', 'Codebase exploration'],
      ['reviewer', 'security-sentinel', 'Security review']
    ]}
  />
);

// Example 2: Table with caption
const TableWithCaption = () => (
  <MarkdownTable
    caption="Available Agent Types"
    headers={['Type', 'Tools', 'Best For']}
    rows={[
      ['Explore', 'Read, Glob, Grep', 'Codebase exploration'],
      ['Plan', 'Read, Glob, Grep', 'Architecture planning'],
      ['general-purpose', 'All (*)', 'Multi-step tasks'],
      ['Bash', 'Bash only', 'Git operations']
    ]}
  />
);

// Example 3: Table with alignment
const AlignedTable = () => (
  <MarkdownTable
    headers={['Task', 'Status', 'Owner', 'Progress']}
    rows={[
      ['Research', 'completed', 'researcher', '100%'],
      ['Plan', 'in_progress', 'planner', '50%'],
      ['Implement', 'pending', '-', '0%'],
      ['Test', 'pending', '-', '0%']
    ]}
    align={['left', 'center', 'left', 'right']}
  />
);

// Example 4: Message types reference table
const MessageTypesTable = () => (
  <MarkdownTable
    caption="Message Types Reference"
    headers={['Type', 'Direction', 'Purpose']}
    rows={[
      ['text', 'Any → Any', 'General communication'],
      ['shutdown_request', 'Leader → Teammate', 'Request graceful shutdown'],
      ['shutdown_approved', 'Teammate → Leader', 'Confirm shutdown'],
      ['idle_notification', 'Teammate → Leader', 'Report idle state'],
      ['task_completed', 'Teammate → Leader', 'Report task done'],
      ['plan_approval_request', 'Teammate → Leader', 'Request plan approval'],
      ['join_request', 'Agent → Leader', 'Request to join team']
    ]}
  />
);

// Example 5: Error reference table
const ErrorTable = () => (
  <MarkdownTable
    caption="Common Errors"
    headers={['Error', 'Cause', 'Solution']}
    rows={[
      ['Cannot cleanup with active members', 'Teammates still running', 'requestShutdown all teammates first'],
      ['Already leading a team', 'Team already exists', 'cleanup first or use different name'],
      ['Agent not found', 'Wrong teammate name', 'Check config.json for actual names'],
      ['Team does not exist', 'No team created', 'Call spawnTeam first']
    ]}
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * | Name | Type | Description |
 * |------|------|-------------|
 * | worker-1 | general-purpose | Main implementation worker |
 * | researcher | Explore | Codebase exploration |
 * | reviewer | security-sentinel | Security review |
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * *Available Agent Types*
 *
 * | Type | Tools | Best For |
 * |------|-------|----------|
 * | Explore | Read, Glob, Grep | Codebase exploration |
 * | Plan | Read, Glob, Grep | Architecture planning |
 * | general-purpose | All (*) | Multi-step tasks |
 * | Bash | Bash only | Git operations |
 * ```
 */

/**
 * Example 3 renders to:
 *
 * ```markdown
 * | Task | Status | Owner | Progress |
 * |:-----|:------:|:------|--------:|
 * | Research | completed | researcher | 100% |
 * | Plan | in_progress | planner | 50% |
 * | Implement | pending | - | 0% |
 * | Test | pending | - | 0% |
 * ```
 */

/**
 * Example 4 renders to:
 *
 * ```markdown
 * *Message Types Reference*
 *
 * | Type | Direction | Purpose |
 * |------|-----------|---------|
 * | text | Any → Any | General communication |
 * | shutdown_request | Leader → Teammate | Request graceful shutdown |
 * | shutdown_approved | Teammate → Leader | Confirm shutdown |
 * | idle_notification | Teammate → Leader | Report idle state |
 * | task_completed | Teammate → Leader | Report task done |
 * | plan_approval_request | Teammate → Leader | Request plan approval |
 * | join_request | Agent → Leader | Request to join team |
 * ```
 */

// =============================================================================
// ALIGNMENT REFERENCE
// =============================================================================

/**
 * Alignment options:
 *
 * | Alignment | Markdown | Result |
 * |-----------|----------|--------|
 * | left | :--- | Left-aligned (default) |
 * | center | :---: | Center-aligned |
 * | right | ---: | Right-aligned |
 */
