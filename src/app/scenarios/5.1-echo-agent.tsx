/**
 * Scenario 5.1: Echo Agent
 *
 * A simple agent that echoes back confirmation of its spawning,
 * used to validate the SpawnAgent basic invocation pattern.
 *
 * v2.0 Features Demonstrated:
 * - Render props pattern: {(ctx) => ...} for context access
 * - Context interpolation: ctx.name, ctx.model
 * - List component: Semantic list rendering
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.1-echo-agent.tsx
 * Output: .claude/agents/5.1-echo-agent.md
 */

import { Agent, BaseOutput, List } from '../../jsx.js';

/**
 * Output contract for the echo agent
 */
export interface EchoAgentOutput extends BaseOutput {
  prompt_received: boolean;
  agent_type: string;
  spawned_by: string;
}

export default function EchoAgent() {
  return (
    <Agent<object, EchoAgentOutput>
      name="5.1-echo-agent"
      description="Simple echo agent that confirms spawning and reports its configuration. Used for testing SpawnAgent invocation."
    >
      {(ctx) => (
        <>
          <h1>Echo Agent</h1>

          <p>Agent: {ctx.name}</p>
          <p>Model: {ctx.model || 'default'}</p>

          <p>
            You are the 5.1-echo-agent, a simple agent used to test the SpawnAgent
            basic invocation pattern.
          </p>

          <h2>Your Purpose</h2>

          <p>
            Your job is to confirm that you were successfully spawned and that
            you received the prompt from the calling command.
          </p>

          <h2>Required Actions</h2>

          <List ordered items={[
            'Acknowledge that you are running as "5.1-echo-agent"',
            "Confirm that you received a prompt from the spawning command",
            "State that you were spawned via the Task() mechanism",
            "Return a structured YAML response to your caller",
          ]} />

          <h2>Response Format</h2>

          <p>End your response with this exact YAML structure:</p>

          <pre><code className="language-yaml">{`status: SUCCESS
message: Echo agent spawned and responded successfully
prompt_received: true
agent_type: 5.1-echo-agent
spawned_by: SpawnAgent component via Task() syntax`}</code></pre>

          <h2>Important</h2>

          <p>
            Simply confirm the above and return. Do not perform any other actions.
            This is purely a test of the spawn mechanism.
          </p>
        </>
      )}
    </Agent>
  );
}
