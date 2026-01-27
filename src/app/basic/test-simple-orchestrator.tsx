/**
 * Test: Simple Orchestrator Command
 *
 * Purpose: Test the basic orchestrator pattern with timestamp verification
 *
 * v2.0 Features Demonstrated:
 * - ExecutionContext: File reference section
 * - SuccessCriteria: Checkbox list of success items
 * - Step: Numbered workflow steps
 *
 * Run: node dist/cli/index.js build src/app/basic/test-simple-orchestrator.tsx
 * Output: .claude/commands/test:simple-orchestrator.md
 */

import { Command, XmlBlock, SpawnAgent, Assign, useVariable, useOutput, OnStatus, If, Else, fileExists, ExecutionContext, SuccessCriteria, Step } from '../../jsx.js';
import type { SimpleOrchestratorInput, SimpleOrchestratorOutput } from './simple-orchestrator-agent.js';

// Declare shell variables with useVariable
const commandTimestamp = useVariable<string>("COMMAND_TIMESTAMP");

const outputFile = useVariable<string>("OUTPUT_FILE");

// Track agent output for status-based handling
const agentOutput = useOutput<SimpleOrchestratorOutput>("basic/simple-orchestrator-agent");

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

      <ExecutionContext paths={[
        "src/app/basic/simple-orchestrator-agent.tsx",
      ]} />

      <XmlBlock name="context">
        <p>Output directory: <code>/tmp/gsd-test/</code></p>
        <p>The agent will write its result to a file in this directory.</p>
      </XmlBlock>

      <XmlBlock name="process">
        <Step name="Setup" number={1}>
          <p>Create output directory and generate command timestamp:</p>
          <pre><code className="language-bash">
mkdir -p /tmp/gsd-test
          </code></pre>

          <Assign var={commandTimestamp} bash={`date -u +"%Y-%m-%dT%H:%M:%SZ"`} />
          <Assign var={outputFile} value="/tmp/gsd-test/agent-result.md" />
        </Step>

        <Step name="Spawn Agent" number={2}>
          <SpawnAgent<SimpleOrchestratorInput>
            agent="basic/simple-orchestrator-agent"
            model="haiku"
            description="Verify timestamp"
            input={{
              commandTimestamp: commandTimestamp,
              outputFile: outputFile,
            }}
          />

          <h3>Handle Agent Status</h3>
          <OnStatus output={agentOutput} status="SUCCESS">
            <p>Agent completed successfully. Output: {agentOutput.field('message')}</p>
            <p>Output file: {agentOutput.field('outputFile')}</p>
          </OnStatus>

          <OnStatus output={agentOutput} status="ERROR">
            <p>Agent failed: {agentOutput.field('message')}</p>
          </OnStatus>
        </Step>

        <Step name="Validate Result" number={3}>
          <p>After agent returns, check if the output file exists and validate:</p>

          <If test={fileExists(outputFile)}>
            <p>Output file found. Reading contents:</p>
            <pre><code className="language-bash">cat "$OUTPUT_FILE"</code></pre>
            <p>Verify the file contains all required fields (Input Timestamp, Agent Timestamp, Success).</p>
          </If>
          <Else>
            <p>Output file not found at expected location. Agent may have failed.</p>
            <pre><code className="language-bash">ls -la /tmp/gsd-test/</code></pre>
          </Else>
        </Step>
      </XmlBlock>

      <SuccessCriteria items={[
        "Output directory created",
        "Command timestamp generated",
        "Agent spawned successfully",
        "Agent output file exists",
        "Output contains Input Timestamp",
        "Output contains Agent Timestamp",
        "Output contains Success status",
      ]} />
    </Command>
  );
}
