/**
 * Test Command - demonstrates explicit loadFromFile path
 *
 * This shows using loadFromFile with an explicit path string
 * instead of relying on AgentRef.path
 */
import {
  Command,
  XmlBlock,
  SpawnAgent,
} from '../../jsx.js';

// Simple input type (no AgentRef needed)
interface SimpleInput {
  task: string;
}

export default function TestExplicitPathCommand() {
  return (
    <Command
      name="test:explicit-path"
      description="Test explicit loadFromFile path"
      agent="test-orchestrator"
      allowedTools={['Read', 'Task']}
    >
      <XmlBlock name="process">
        <h2>Spawn with Explicit Path</h2>
        <p>Using string agent name with explicit loadFromFile path:</p>

        <SpawnAgent<SimpleInput>
          agent="my-custom-agent"
          loadFromFile="~/.claude/agents/custom-agent.md"
          model="sonnet"
          description="Do the custom task"
          input={{
            task: "Complete the assignment",
          }}
        >
          Additional instructions for the agent.
        </SpawnAgent>
      </XmlBlock>
    </Command>
  );
}
