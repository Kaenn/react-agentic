/**
 * @component SpawnBackend
 * @description Documents a spawn backend type with its characteristics
 */

import { BackendType } from './enums';

// =============================================================================
// ENUMS (re-export for convenience)
// =============================================================================

export { BackendType };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface SpawnBackendProps {
  /**
   * Backend type identifier - use BackendType enum
   * @required
   */
  type: BackendType;

  /**
   * Brief description of how this backend works
   * @required
   */
  description: string;

  /**
   * List of advantages
   * @required
   */
  pros: string[];

  /**
   * List of disadvantages
   * @required
   */
  cons: string[];

  /**
   * When this backend is auto-selected
   * @optional
   */
  autoSelectWhen?: string[];

  /**
   * Setup instructions - use children for complex setup
   * @optional
   */
  children?: React.ReactNode;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SpawnBackend({ type, description, pros, cons, autoSelectWhen, children }: SpawnBackendProps) {
  // Implementation renders to markdown section
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: in-process backend (using enum)
const InProcessBackendExample = () => (
  <SpawnBackend
    type={BackendType.InProcess}
    description="Teammates run as async tasks within the same Node.js process"
    pros={['Fastest startup (no process spawn)', 'Lowest overhead', 'Works everywhere']}
    cons={["Can't see teammate output in real-time", 'All die if leader dies', 'Harder to debug']}
    autoSelectWhen={['Not running inside tmux session', 'Non-interactive mode (CI, scripts)', 'iTerm2 without it2 CLI']}
  >
    <CodeBlock language="bash" title="Force in-process backend">
      {`export CLAUDE_CODE_SPAWN_BACKEND=in-process`}
    </CodeBlock>
  </SpawnBackend>
);

// Example 2: tmux backend (using enum)
const TmuxBackendExample = () => (
  <SpawnBackend
    type={BackendType.Tmux}
    description="Teammates run as separate Claude instances in tmux panes/windows"
    pros={[
      'See teammate output in real-time',
      'Teammates survive leader exit',
      'Can attach/detach sessions',
      'Works in CI/headless environments'
    ]}
    cons={['Slower startup (process spawn)', 'Requires tmux installed', 'More resource usage']}
    autoSelectWhen={['Running inside a tmux session ($TMUX is set)', 'tmux available and not in iTerm2']}
  >
    <CodeBlock language="bash" title="Setup tmux backend">
      {`# Install tmux
brew install tmux

# Start tmux session
tmux new-session -s claude

# Or force tmux backend
export CLAUDE_CODE_SPAWN_BACKEND=tmux`}
    </CodeBlock>

    <CodeBlock language="bash" title="Useful tmux commands">
      {`# List all panes
tmux list-panes

# Switch to pane by number
tmux select-pane -t 1

# View swarm session (if external)
tmux attach -t claude-swarm

# Rebalance pane layout
tmux select-layout tiled`}
    </CodeBlock>
  </SpawnBackend>
);

// Example 3: iterm2 backend (using enum)
const ITerm2BackendExample = () => (
  <SpawnBackend
    type={BackendType.ITerm2}
    description="Teammates run as split panes within your iTerm2 window"
    pros={['Visual debugging - see all teammates', 'Native macOS experience', 'No tmux needed', 'Automatic pane management']}
    cons={['macOS + iTerm2 only', 'Requires setup (it2 CLI + Python API)', 'Panes die with window']}
    autoSelectWhen={['Running in iTerm2 ($TERM_PROGRAM === "iTerm.app")', 'it2 CLI is installed and working']}
  >
    <CodeBlock language="bash" title="Setup iTerm2 backend">
      {`# 1. Install it2 CLI
uv tool install it2
# OR
pipx install it2
# OR
pip install --user it2

# 2. Enable Python API in iTerm2
# iTerm2 → Settings → General → Magic → Enable Python API

# 3. Restart iTerm2

# 4. Verify installation
it2 --version
it2 session list`}
    </CodeBlock>
  </SpawnBackend>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ### Spawn Backend: in-process
 *
 * > Teammates run as async tasks within the same Node.js process
 *
 * **Pros:**
 * - ✅ Fastest startup (no process spawn)
 * - ✅ Lowest overhead
 * - ✅ Works everywhere
 *
 * **Cons:**
 * - ❌ Can't see teammate output in real-time
 * - ❌ All die if leader dies
 * - ❌ Harder to debug
 *
 * **Auto-selected when:**
 * - Not running inside tmux session
 * - Non-interactive mode (CI, scripts)
 * - iTerm2 without it2 CLI
 *
 * **Force in-process backend:**
 * ```bash
 * export CLAUDE_CODE_SPAWN_BACKEND=in-process
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * ### Spawn Backend: tmux
 *
 * > Teammates run as separate Claude instances in tmux panes/windows
 *
 * **Pros:**
 * - ✅ See teammate output in real-time
 * - ✅ Teammates survive leader exit
 * - ✅ Can attach/detach sessions
 * - ✅ Works in CI/headless environments
 *
 * **Cons:**
 * - ❌ Slower startup (process spawn)
 * - ❌ Requires tmux installed
 * - ❌ More resource usage
 *
 * **Auto-selected when:**
 * - Running inside a tmux session ($TMUX is set)
 * - tmux available and not in iTerm2
 *
 * **Setup tmux backend:**
 * ```bash
 * # Install tmux
 * brew install tmux
 *
 * # Start tmux session
 * tmux new-session -s claude
 *
 * # Or force tmux backend
 * export CLAUDE_CODE_SPAWN_BACKEND=tmux
 * ```
 *
 * **Useful tmux commands:**
 * ```bash
 * # List all panes
 * tmux list-panes
 *
 * # Switch to pane by number
 * tmux select-pane -t 1
 *
 * # View swarm session (if external)
 * tmux attach -t claude-swarm
 *
 * # Rebalance pane layout
 * tmux select-layout tiled
 * ```
 * ```
 */

// =============================================================================
// BACKEND COMPARISON
// =============================================================================

/**
 * ## Backend Comparison
 *
 * | Backend | Visibility | Persistence | Speed | Platform |
 * |---------|------------|-------------|-------|----------|
 * | in-process | Hidden | Dies with leader | Fastest | All |
 * | tmux | Visible in tmux | Survives leader | Medium | All (needs tmux) |
 * | iterm2 | Visible side-by-side | Dies with window | Medium | macOS only |
 *
 * ## Auto-Detection Flow
 *
 * ```mermaid
 * flowchart TD
 *     A[Start] --> B{Inside tmux?}
 *     B -->|Yes| C[Use tmux]
 *     B -->|No| D{In iTerm2?}
 *     D -->|No| E{tmux available?}
 *     E -->|Yes| F[Use tmux - external]
 *     E -->|No| G[Use in-process]
 *     D -->|Yes| H{it2 installed?}
 *     H -->|Yes| I[Use iterm2]
 *     H -->|No| J{tmux available?}
 *     J -->|Yes| K[Use tmux]
 *     J -->|No| L[Error]
 * ```
 */
