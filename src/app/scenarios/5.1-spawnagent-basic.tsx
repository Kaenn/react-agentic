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
 * Run: node dist/cli/index.js build src/app/scenarios/5.1-spawnagent-basic.tsx
 * Output: .claude/commands/5.1-spawnagent-basic.md
 */

import { Command, SpawnAgent } from '../../jsx.js';
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

      <ol>
        <li>Verify SpawnAgent produces Task() call in the markdown</li>
        <li>Verify agent name appears as subagent_type parameter</li>
        <li>Verify description/prompt is passed correctly</li>
        <li>Verify Claude successfully spawns and receives agent response</li>
      </ol>

      <h2>Spawn Test</h2>

      <p>
        Execute the following Task() call to spawn the echo agent.
        This tests the basic SpawnAgent invocation pattern:
      </p>

      <SpawnAgent<object, EchoAgentOutput>
        agent="5.1-echo-agent"
        model="haiku"
        description="Test basic SpawnAgent invocation"
        prompt={`You are being spawned to test the basic SpawnAgent pattern.

Your task:
1. Confirm you received this prompt
2. Report the subagent_type you are running as
3. Return a structured response confirming success

This validates that:
- SpawnAgent rendered as Task() syntax
- The agent name (5.1-echo-agent) was passed as subagent_type
- This prompt text was received as the prompt parameter`}
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
