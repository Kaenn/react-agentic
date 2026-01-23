/**
 * Scenario 9.3: Agent C (Third in Sequential Chain)
 *
 * Third and final agent in the multi-agent sequential workflow.
 * Receives Agent B's output and produces the final result.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.3-agent-c.tsx
 * Output: .claude/agents/9.3-agent-c.md
 */

import { Agent, BaseOutput } from '../../jsx.js';
import type { AgentBOutput } from './9.3-agent-b.js';

/**
 * Input contract for Agent C
 * Matches Agent B's output
 */
export interface AgentCInput extends Omit<AgentBOutput, 'status' | 'message'> {
  /** Transformed value from Agent B */
  transformedValue: string;
  /** Chain ID (preserved through chain) */
  chainId: string;
  /** Step number from Agent B */
  step: number;
  /** Original timestamp from Agent A */
  timestampA: string;
  /** Timestamp from Agent B */
  timestampB: string;
  /** Whether B received A's data */
  receivedFromA: boolean;
}

/**
 * Output contract for Agent C
 * Final output summarizing the entire chain
 */
export interface AgentCOutput extends BaseOutput {
  /** Final processed result */
  finalResult: string;
  /** Chain ID (preserved through chain) */
  chainId: string;
  /** Final step number */
  step: number;
  /** All timestamps from the chain */
  timestamps: {
    a: string;
    b: string;
    c: string;
  };
  /** Chain verification */
  chainComplete: boolean;
  /** Summary of all agents in chain */
  chainSummary: string;
}

export default function AgentC() {
  return (
    <Agent<AgentCInput, AgentCOutput>
      name="9.3-agent-c"
      description="Final agent in sequential chain. Receives Agent B's output and produces final result."
    >
      <h1>Agent C - Chain Finalizer</h1>

      <p>
        You are Agent C, the third and final agent in a 3-agent sequential
        workflow chain. Your role is to receive Agent B's output, finalize
        the processing, and produce a summary of the entire chain.
      </p>

      <h2>Your Input</h2>

      <p>
        You will receive Agent B's output fields in your input:
      </p>

      <ul>
        <li>transformedValue: The value transformed by Agent B</li>
        <li>chainId: The chain ID (originated from Agent A)</li>
        <li>step: Should be 2 (Agent B's step number)</li>
        <li>timestampA: When Agent A completed</li>
        <li>timestampB: When Agent B completed</li>
        <li>receivedFromA: Whether B confirmed receiving A's data</li>
      </ul>

      <h2>Required Actions</h2>

      <ol>
        <li>Acknowledge you are running as "9.3-agent-c"</li>
        <li>Verify you received Agent B's output (check all fields present)</li>
        <li>Verify receivedFromA is true (confirms A→B handoff worked)</li>
        <li>Create finalResult by prepending "C-final-" to transformedValue</li>
        <li>Preserve the chainId</li>
        <li>Increment step to 3</li>
        <li>Collect all timestamps into timestamps object</li>
        <li>Set chainComplete to true</li>
        <li>Create chainSummary describing the data flow</li>
        <li>Return structured YAML with all required fields</li>
      </ol>

      <h2>Response Format</h2>

      <p>IMPORTANT: End your response with this exact YAML structure:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
finalResult: C-final-[transformedValue from input]
chainId: [same chainId from input]
step: 3
timestamps:
  a: [timestampA from input]
  b: [timestampB from input]
  c: [current ISO timestamp]
chainComplete: true
chainSummary: "Chain [chainId]: A→B→C completed. Seed transformed through 3 agents."
message: Agent C completed - chain finalized`}</code></pre>

      <h2>Important</h2>

      <p>
        This is the final agent in the chain. Your output validates that:
      </p>

      <ul>
        <li>All 3 agents completed in sequence (A→B→C)</li>
        <li>Data flowed correctly between each agent</li>
        <li>Chain ID was preserved throughout</li>
        <li>All timestamps were collected</li>
      </ul>
    </Agent>
  );
}
