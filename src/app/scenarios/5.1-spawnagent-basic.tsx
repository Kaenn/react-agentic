/**
 * Scenario 5.1: SpawnAgent Basic Invocation
 *
 * Goal: Confirm that <SpawnAgent> produces correct Task() syntax that Claude
 * recognizes and executes.
 *
 * Success Criteria:
 * - SpawnAgent renders as Task() call syntax
 * - The agent name is correctly specified (subagent_type)
 * - The description becomes the prompt
 * - Claude successfully spawns the sub-agent
 *
 * v2.0 Features Demonstrated:
 * - List component with ordered prop for numbered objectives
 *
 * Run: node dist/cli/index.js build src/app/scenarios/5.1-spawnagent-basic.tsx
 * Output: .claude/commands/5.1-spawnagent-basic.md
 */

import { Command, SpawnAgent, List } from '../../jsx.js';
import type { EchoAgentOutput } from './5.1-echo-agent.js';

export default function SpawnAgentBasicCommand() {
  return (
    <Command
      name="5.1-spawnagent-basic"
      description="Test command for SpawnAgent basic invocation. Verifies Task() syntax generation."
    >
      <h1>SpawnAgent Basic Invocation Test</h1>

      <p>
        This command tests that the SpawnAgent component correctly renders
        as Task() syntax that Claude can parse and execute.
      </p>

      <h2>Test Objectives</h2>

      <List
        items={[
          "Verify SpawnAgent produces Task() call in the markdown",
          "Verify agent name appears as subagent_type parameter",
          "Verify description/prompt is passed correctly",
          "Verify Claude successfully spawns and receives agent response",
        ]}
        ordered
      />

      <h2>Spawn Test</h2>

      <p>
        Execute the following Task() call to spawn the echo agent.
        This tests the basic SpawnAgent invocation pattern:
      </p>

      <SpawnAgent
        agent="5.1-echo-agent"
        model="haiku"
        description="Test basic SpawnAgent invocation"
        prompt="Confirm you received this prompt, report your agent type, and return a structured response confirming success."
      />

      <h2>Validation</h2>

      <p>After the agent returns, report the following in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 5.1
test_name: SpawnAgent Basic Invocation
task_syntax_used: [YES/NO - was Task() syntax visible in markdown?]
agent_spawned: [YES/NO - did Claude spawn the sub-agent?]
agent_received_prompt: [YES/NO - did agent confirm receiving the prompt?]
agent_returned_response: [YES/NO - did the agent return a structured response?]
overall_result: [PASSED/FAILED]
notes: [any observations about the SpawnAgent behavior]`}</code></pre>
    </Command>
  );
}
