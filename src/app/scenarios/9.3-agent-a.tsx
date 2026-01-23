/**
 * Scenario 9.3: Agent A (First in Sequential Chain)
 *
 * First agent in the multi-agent sequential workflow.
 * Produces initial data that will be passed to Agent B.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.3-agent-a.tsx
 * Output: .claude/agents/9.3-agent-a.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for Agent A
 */
export interface AgentAInput {
  /** Initial seed value to start the chain */
  seed: string;
}

/**
 * Output contract for Agent A
 * This output becomes Agent B's input
 */
export interface AgentAOutput extends BaseOutput {
  /** Processed seed value */
  processedSeed: string;
  /** Generated ID for tracking through chain */
  chainId: string;
  /** Step number in chain */
  step: number;
  /** Timestamp when A completed */
  timestampA: string;
}

export default function AgentA() {
  return (
    <Agent<AgentAInput, AgentAOutput>
      name="9.3-agent-a"
      description="First agent in sequential chain. Processes seed value and generates chain ID."
    >
      <h1>Agent A - Chain Initiator</h1>

      <p>
        You are Agent A, the first agent in a 3-agent sequential workflow chain.
        Your role is to process the initial seed value and produce output that
        Agent B will consume.
      </p>

      <h2>Your Input</h2>

      <p>
        You will receive a seed value in the input. Use this to generate your output.
      </p>

      <h2>Required Actions</h2>

      <ol>
        <li>Acknowledge you are running as "9.3-agent-a"</li>
        <li>Process the seed value by prepending "A-processed-"</li>
        <li>Generate a unique chainId (use format: chain-XXXX where XXXX is random)</li>
        <li>Record step number as 1</li>
        <li>Record your completion timestamp</li>
        <li>Return structured YAML with all required fields</li>
      </ol>

      <h2>Response Format</h2>

      <p>IMPORTANT: End your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
processedSeed: A-processed-[the seed value you received]
chainId: chain-[random 4 digits]
step: 1
timestampA: [current ISO timestamp]
message: Agent A completed - chain initiated`}</code></pre>

      <h2>Important</h2>

      <p>
        Your output will be passed to Agent B. All fields are REQUIRED.
        Agent B will verify it received your output correctly.
      </p>
    </Agent>
  );
}
