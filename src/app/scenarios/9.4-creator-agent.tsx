/**
 * Scenario 9.4: Creator Agent
 *
 * An agent that creates a new file when the target doesn't exist.
 * Spawned when the conditional file check fails (file doesn't exist).
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.4-creator-agent.tsx
 * Output: .claude/agents/9.4-creator-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the creator agent
 */
export interface CreatorAgentInput {
  /** Path where the file should be created */
  filePath: string;
  /** Content template or type to create */
  contentType?: 'placeholder' | 'template' | 'empty';
}

/**
 * Output contract for the creator agent
 */
export interface CreatorAgentOutput extends BaseOutput {
  /** Path where file would be created */
  targetPath: string;
  /** Content type that would be used */
  contentType: string;
  /** Description of what would be created */
  description: string;
  /** Which agent was invoked */
  agentType: 'creator';
}

export default function CreatorAgent() {
  return (
    <Agent<CreatorAgentInput, CreatorAgentOutput>
      name="9.4-creator-agent"
      description="Agent that would create a new file. Spawned when file doesn't exist."
    >
      <h1>File Creator Agent</h1>

      <p>
        You are the 9.4-creator-agent. Your purpose is to report what file would
        be created when the target file doesn't exist. You are spawned when the
        conditional check determines that a file does NOT exist.
      </p>

      <h2>Instructions</h2>

      <ol>
        <li>Read the filePath from your input</li>
        <li>Determine what type of file would be created based on the path</li>
        <li>Return a structured YAML response describing the creation plan</li>
      </ol>

      <h2>Note</h2>

      <p>
        For this test scenario, DO NOT actually create any files. Simply report
        what WOULD be created. This validates the conditional branching logic
        without side effects.
      </p>

      <h2>Response Format</h2>

      <p>Return your creation plan in this YAML format:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: File creation plan ready
targetPath: [the path where file would be created]
contentType: [placeholder|template|empty]
description: [what would be created]
agentType: creator`}</code></pre>

      <h2>Important</h2>

      <p>
        Always include agentType: creator in your response. This confirms which
        conditional branch was taken in the calling command.
      </p>
    </Agent>
  );
}
