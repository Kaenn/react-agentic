/**
 * Scenario 5.6: Multi-Status Agent
 *
 * An agent that returns different statuses based on its prompt input,
 * used to test multiple OnStatus handlers in the calling command.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.6-multi-status-agent.tsx
 * Output: .claude/agents/5.6-multi-status-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the multi-status agent
 */
export interface MultiStatusAgentInput {
  /** Which status to return: SUCCESS, ERROR, or BLOCKED */
  requestedStatus: 'SUCCESS' | 'ERROR' | 'BLOCKED';
  /** Optional context message */
  context?: string;
}

/**
 * Output contract for the multi-status agent
 */
export interface MultiStatusAgentOutput extends BaseOutput {
  /** The status that was requested */
  requestedStatus: string;
  /** Confirmation message */
  confirmation: string;
  /** Error details (only when status is ERROR) */
  errorDetails?: string;
  /** Blocker description (only when status is BLOCKED) */
  blockedBy?: string;
}

export default function MultiStatusAgent() {
  return (
    <Agent<MultiStatusAgentInput, MultiStatusAgentOutput>
      name="5.6-multi-status-agent"
      description="Agent that returns configurable status codes to test OnStatus handler routing."
    >
      <h1>Multi-Status Test Agent</h1>

      <p>
        You are the 5.6-multi-status-agent. Your purpose is to return a specific
        status based on the requestedStatus field in your input, enabling testing
        of multiple OnStatus handlers in the calling command.
      </p>

      <h2>Instructions</h2>

      <ol>
        <li>Read the requestedStatus from your input prompt</li>
        <li>Return a structured YAML response with that exact status</li>
        <li>Include appropriate fields based on the status type</li>
      </ol>

      <h2>Response Format by Status</h2>

      <h3>For SUCCESS:</h3>

      <pre><code className="language-yaml">{`status: SUCCESS
message: Agent completed successfully as requested
requestedStatus: SUCCESS
confirmation: SUCCESS handler should be triggered`}</code></pre>

      <h3>For ERROR:</h3>

      <pre><code className="language-yaml">{`status: ERROR
message: Agent encountered simulated error as requested
requestedStatus: ERROR
confirmation: ERROR handler should be triggered
errorDetails: This is a simulated error for testing OnStatus ERROR handling`}</code></pre>

      <h3>For BLOCKED:</h3>

      <pre><code className="language-yaml">{`status: BLOCKED
message: Agent is blocked as requested
requestedStatus: BLOCKED
confirmation: BLOCKED handler should be triggered
blockedBy: Simulated external dependency for testing OnStatus BLOCKED handling`}</code></pre>

      <h2>Important</h2>

      <p>
        Always return exactly one of the three status types. Parse the requestedStatus
        from your input and respond accordingly. This enables the calling command to
        verify that the correct OnStatus handler is invoked.
      </p>
    </Agent>
  );
}
