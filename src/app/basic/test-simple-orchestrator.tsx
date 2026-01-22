import { Command, XmlBlock, SpawnAgent, Assign, useVariable, If, Else } from '../../jsx.js';
import type { SimpleOrchestratorInput } from './simple-orchestrator-agent.js';

// Declare shell variables with useVariable
const commandTimestamp = useVariable<string>("COMMAND_TIMESTAMP", {
  bash: `date -u +"%Y-%m-%dT%H:%M:%SZ"`
});

const outputFile = useVariable<string>("OUTPUT_FILE", {
  value: "/tmp/gsd-test/agent-result.md"
});

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
        </code></pre>

        <Assign var={commandTimestamp} />
        <Assign var={outputFile} />

        <h2>Step 2: Spawn Agent</h2>
        <SpawnAgent<SimpleOrchestratorInput>
          agent="basic/simple-orchestrator-agent"
          model="haiku"
          description="Verify timestamp"
          input={{
            commandTimestamp: commandTimestamp,
            outputFile: outputFile,
          }}
        />

        <h2>Step 3: Validate Result</h2>
        <p>After agent returns, check if the output file exists and validate:</p>

        <If test="[ -f $OUTPUT_FILE ]">
          <p>Output file found. Reading contents:</p>
          <pre><code className="language-bash">cat "$OUTPUT_FILE"</code></pre>
          <p>Verify the file contains all required fields (Input Timestamp, Agent Timestamp, Success).</p>
        </If>
        <Else>
          <p>Output file not found at expected location. Agent may have failed.</p>
          <pre><code className="language-bash">ls -la /tmp/gsd-test/</code></pre>
        </Else>
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
