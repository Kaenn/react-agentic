import { Command, XmlBlock, SpawnAgent } from '../../jsx.js';
import type { SimpleOrchestratorInput } from './simple-orchestrator-agent.js';

export default function TestSimpleOrchestratorCommand() {
  return (
    <Command
      name="test:simple-orchestrator"
      description="Test command that spawns an agent with timestamp verification"
      agent="basic/simple-orchestrator-agent"
      allowedTools={['Read', 'Write', 'Bash', 'Task']}
    >
      <XmlBlock name="objective">
        <p>Test the basic orchestrator pattern by spawning an agent that verifies timestamps.</p>
        <p>This command generates a timestamp, spawns an agent, and validates the agent's output.</p>
      </XmlBlock>

      <XmlBlock name="context">
        <p>Output directory: <code>/tmp/gsd-test/</code></p>
        <p>The agent will write its result to a file in this directory.</p>
      </XmlBlock>

      <XmlBlock name="process">
        <h2>Step 1: Setup</h2>
        <p>Create output directory and generate command timestamp:</p>
        <pre><code className="language-bash">
mkdir -p /tmp/gsd-test
COMMAND_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUTPUT_FILE="/tmp/gsd-test/agent-result.md"
        </code></pre>

        <h2>Step 2: Spawn Agent</h2>
        <SpawnAgent<SimpleOrchestratorInput>
          agent="basic/simple-orchestrator-agent"
          model="haiku"
          description="Verify timestamp"
          prompt={`<input>
**Command Timestamp:** {command_timestamp}
</input>

<output>
Write your result to: {output_file}
</output>`}
        />

        <h2>Step 3: Validate Result</h2>
        <p>After agent returns, read and validate the output file:</p>
        <pre><code className="language-bash">
cat "$OUTPUT_FILE"
        </code></pre>
        <p>Verify the file contains all required fields.</p>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <ul>
          <li>[ ] Output directory created</li>
          <li>[ ] Command timestamp generated</li>
          <li>[ ] Agent spawned successfully</li>
          <li>[ ] Agent output file exists</li>
          <li>[ ] Output contains Input Timestamp</li>
          <li>[ ] Output contains Agent Timestamp</li>
          <li>[ ] Output contains Success status</li>
        </ul>
      </XmlBlock>
    </Command>
  );
}
