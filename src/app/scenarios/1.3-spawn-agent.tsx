/**
 * Scenario 1.3: Spawn a Minimal Agent - Command Definition
 *
 * Goal: Confirm that when a command spawns an agent using Task() syntax,
 * Claude correctly launches a sub-agent with the agent's configuration.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/1.3-spawn-agent.tsx
 * Output: .claude/commands/1.3-spawn-agent.md
 */

import { Command, SpawnAgent } from '../../jsx.js';
import type { TimestampAgentOutput } from './1.3-timestamp-agent.js';

export default function SpawnAgentCommand() {
  return (
    <Command
      name="1.3-spawn-agent"
      description="A minimal command that spawns an agent to verify Task() invocation works correctly."
    >
      <h1>Spawn Agent Test Command</h1>

      <p>
        This command tests the SpawnAgent pattern by launching the
        1.3-timestamp-agent and verifying it executes successfully.
      </p>

      <h2>Process</h2>

      <h3>Step 1: Spawn the Timestamp Agent</h3>

      <p>Launch the agent using the Task() syntax:</p>

      <SpawnAgent<object, TimestampAgentOutput>
        agent="1.3-timestamp-agent"
        model="haiku"
        description="Spawn timestamp agent to confirm invocation"
        prompt={`You have been spawned by the 1.3-spawn-agent command.

Your task is to confirm successful spawning and report the current timestamp.

Please follow the instructions in your agent definition.`}
      />

      <h3>Step 2: Report Result</h3>

      <p>After the agent returns, confirm the test completed by stating:</p>

      <ul>
        <li>"Command-to-Agent spawn test complete!"</li>
        <li>The status returned by the agent</li>
        <li>The timestamp reported by the agent</li>
      </ul>
    </Command>
  );
}
