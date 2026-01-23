/**
 * Scenario 9.3: Multi-Agent Sequential Workflow
 *
 * Goal: Confirm that a command can spawn multiple agents sequentially,
 * with each agent receiving output from the previous.
 *
 * Success Criteria:
 * - Agent A is spawned first
 * - Agent B receives Agent A's output
 * - Agent C receives Agent B's output
 * - Each agent completes before the next spawns
 * - Final result incorporates all agent outputs
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.3-multi-agent-sequential.tsx
 * Output: .claude/commands/9.3-multi-agent-sequential.md
 */

import { Command, SpawnAgent, useOutput, useVariable, Assign, OnStatus } from '../../jsx.js';
import type { AgentAOutput } from './9.3-agent-a.js';
import type { AgentBOutput } from './9.3-agent-b.js';
import type { AgentCOutput } from './9.3-agent-c.js';

export default function MultiAgentSequentialCommand() {
  // Variable for initial seed
  const seedVar = useVariable('SEED_VALUE');

  // Output refs for each agent
  const outputA = useOutput<AgentAOutput>('9.3-agent-a');
  const outputB = useOutput<AgentBOutput>('9.3-agent-b');
  const outputC = useOutput<AgentCOutput>('9.3-agent-c');

  return (
    <Command
      name="9.3-multi-agent-sequential"
      description="Test command for multi-agent sequential workflow. Spawns A→B→C with data passing."
    >
      <h1>Multi-Agent Sequential Workflow Test</h1>

      <p>
        This command tests that multiple agents can be spawned sequentially,
        with each agent receiving the output from the previous agent in the chain.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Agent A is spawned first and produces initial output</li>
        <li>Agent B receives Agent A's output and transforms it</li>
        <li>Agent C receives Agent B's output and produces final result</li>
        <li>Each agent completes BEFORE the next one spawns</li>
        <li>Final result incorporates data from all three agents</li>
      </ol>

      <h2>Workflow Overview</h2>

      <pre><code className="language-text">{`┌─────────┐    ┌─────────┐    ┌─────────┐
│ Agent A │───▶│ Agent B │───▶│ Agent C │
│  (Init) │    │(Transform)│   │ (Final) │
└─────────┘    └─────────┘    └─────────┘
    │              │              │
    ▼              ▼              ▼
 chainId       preserve      timestamps
 step: 1       step: 2        step: 3
 seedProc      transform     finalResult`}</code></pre>

      <h2>Step 1: Initialize Seed Value</h2>

      <p>
        First, assign a seed value that will flow through the agent chain:
      </p>

      <Assign var={seedVar} value="test-seed-9.3" />

      <h2>Step 2: Spawn Agent A (Chain Initiator)</h2>

      <p>
        Spawn Agent A with the seed value. Agent A will process the seed
        and generate a chain ID for tracking:
      </p>

      <SpawnAgent
        agent="9.3-agent-a"
        model="haiku"
        description="Spawn Agent A to initiate the sequential chain"
        prompt={`You are Agent A in a sequential chain workflow.

<seed>$SEED_VALUE</seed>

Process the seed value and generate chain tracking data.
Return your output in the specified YAML format.`}
      />

      <h3>Agent A Result Handling</h3>

      <OnStatus output={outputA} status="SUCCESS">
        <p>
          <strong>Agent A completed successfully!</strong>
        </p>
        <ul>
          <li>Processed Seed: {outputA.field('processedSeed')}</li>
          <li>Chain ID: {outputA.field('chainId')}</li>
          <li>Step: {outputA.field('step')}</li>
          <li>Timestamp A: {outputA.field('timestampA')}</li>
        </ul>
        <p>
          Now proceed to Step 3 to spawn Agent B with Agent A's output.
        </p>
      </OnStatus>

      <OnStatus output={outputA} status="ERROR">
        <p>
          <strong>Agent A failed!</strong> Cannot continue chain.
          Error: {outputA.field('message')}
        </p>
        <p>Skip to Validation section and report chain_broken: Agent A.</p>
      </OnStatus>

      <h2>Step 3: Spawn Agent B (Chain Transformer)</h2>

      <p>
        <strong>CRITICAL:</strong> Only spawn Agent B AFTER Agent A completes successfully.
        Pass all of Agent A's output fields to Agent B:
      </p>

      <SpawnAgent
        agent="9.3-agent-b"
        model="haiku"
        description="Spawn Agent B to transform Agent A's output"
        prompt={`You are Agent B in a sequential chain workflow.
You are receiving output from Agent A. Here is Agent A's data:

<processedSeed>{output.processedSeed}</processedSeed>
<chainId>{output.chainId}</chainId>
<step>{output.step}</step>
<timestampA>{output.timestampA}</timestampA>

IMPORTANT: The placeholder values above (like {output.processedSeed}) will be substituted
with actual values from Agent A's output by Claude before spawning you.

Transform this data according to your instructions.
Return your output in the specified YAML format.`}
      />

      <h3>Agent B Result Handling</h3>

      <OnStatus output={outputB} status="SUCCESS">
        <p>
          <strong>Agent B completed successfully!</strong>
        </p>
        <ul>
          <li>Transformed Value: {outputB.field('transformedValue')}</li>
          <li>Chain ID (preserved): {outputB.field('chainId')}</li>
          <li>Step: {outputB.field('step')}</li>
          <li>Received from A: {outputB.field('receivedFromA')}</li>
          <li>Timestamp B: {outputB.field('timestampB')}</li>
        </ul>
        <p>
          Now proceed to Step 4 to spawn Agent C with Agent B's output.
        </p>
      </OnStatus>

      <OnStatus output={outputB} status="ERROR">
        <p>
          <strong>Agent B failed!</strong> Cannot continue chain.
          Error: {outputB.field('message')}
        </p>
        <p>Skip to Validation section and report chain_broken: Agent B.</p>
      </OnStatus>

      <h2>Step 4: Spawn Agent C (Chain Finalizer)</h2>

      <p>
        <strong>CRITICAL:</strong> Only spawn Agent C AFTER Agent B completes successfully.
        Pass all of Agent B's output fields to Agent C:
      </p>

      <SpawnAgent
        agent="9.3-agent-c"
        model="haiku"
        description="Spawn Agent C to finalize the sequential chain"
        prompt={`You are Agent C in a sequential chain workflow.
You are receiving output from Agent B (which received from Agent A). Here is the chain data:

<transformedValue>{output.transformedValue}</transformedValue>
<chainId>{output.chainId}</chainId>
<step>{output.step}</step>
<timestampA>{output.timestampA}</timestampA>
<timestampB>{output.timestampB}</timestampB>
<receivedFromA>{output.receivedFromA}</receivedFromA>

IMPORTANT: The placeholder values above will be substituted with actual values
from Agent B's output by Claude before spawning you.

Finalize the chain and produce the summary result.
Return your output in the specified YAML format.`}
      />

      <h3>Agent C Result Handling</h3>

      <OnStatus output={outputC} status="SUCCESS">
        <p>
          <strong>Agent C completed successfully! Chain complete!</strong>
        </p>
        <ul>
          <li>Final Result: {outputC.field('finalResult')}</li>
          <li>Chain ID: {outputC.field('chainId')}</li>
          <li>Final Step: {outputC.field('step')}</li>
          <li>Chain Complete: {outputC.field('chainComplete')}</li>
          <li>Chain Summary: {outputC.field('chainSummary')}</li>
        </ul>
      </OnStatus>

      <OnStatus output={outputC} status="ERROR">
        <p>
          <strong>Agent C failed!</strong> Chain incomplete.
          Error: {outputC.field('message')}
        </p>
      </OnStatus>

      <h2>Step 5: Validation Report</h2>

      <p>
        After completing the workflow (or encountering an error),
        report the results in YAML format:
      </p>

      <pre><code className="language-yaml">{`test_id: "9.3"
test_name: Multi-Agent Sequential Workflow
results:
  agent_a_spawned: [YES/NO]
  agent_a_completed: [YES/NO]
  agent_b_spawned: [YES/NO]
  agent_b_received_a_output: [YES/NO - did B receive processedSeed, chainId, etc.?]
  agent_b_completed: [YES/NO]
  agent_c_spawned: [YES/NO]
  agent_c_received_b_output: [YES/NO - did C receive transformedValue, timestamps, etc.?]
  agent_c_completed: [YES/NO]
  sequential_order_maintained: [YES/NO - did each agent wait for previous?]
  chain_id_preserved: [YES/NO - same chainId through all agents?]
  timestamps_collected: [YES/NO - all 3 timestamps present?]
chain_data:
  initial_seed: [the seed value]
  chain_id: [chain ID from Agent A]
  agent_a_output:
    processedSeed: [value]
    step: [1]
  agent_b_output:
    transformedValue: [value]
    step: [2]
    receivedFromA: [true/false]
  agent_c_output:
    finalResult: [value]
    step: [3]
    chainComplete: [true/false]
    chainSummary: [summary text]
timestamps:
  a: [timestamp from A]
  b: [timestamp from B]
  c: [timestamp from C]
overall_result: [PASSED/FAILED]
notes: [observations about sequential workflow behavior]`}</code></pre>
    </Command>
  );
}
