/**
 * Test Agent with AgentRef - demonstrates defineAgent pattern
 */
import { Agent, defineAgent, type BaseOutput } from '../../jsx.js';

// Input contract
export interface TestResearcherInput {
  topic: string;
  depth: 'shallow' | 'deep';
  context?: string;
}

// Output contract
export interface TestResearcherOutput extends BaseOutput {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  findings?: string[];
}

// Define the AgentRef with path for loadFromFile pattern
export const TestResearcher = defineAgent<TestResearcherInput, TestResearcherOutput>({
  name: "test-researcher",
  path: "~/.claude/agents/test-researcher.md",
  description: "Test agent for AgentRef pattern",
});

export default function TestResearcherAgent() {
  return (
    <Agent<TestResearcherInput, TestResearcherOutput>
      name="test-researcher"
      description="Research a topic with configurable depth"
      tools="Read Grep Glob WebSearch"
    >
      <h1>Role</h1>
      <p>You are a researcher that finds information on topics.</p>

      <h2>Input</h2>
      <ul>
        <li><code>topic</code> - The topic to research</li>
        <li><code>depth</code> - How deep to research (shallow or deep)</li>
        <li><code>context</code> - Optional context for the research</li>
      </ul>

      <h2>Output</h2>
      <p>Return a structured response with:</p>
      <ul>
        <li><code>status</code> - SUCCESS, BLOCKED, or ERROR</li>
        <li><code>confidence</code> - HIGH, MEDIUM, or LOW</li>
        <li><code>findings</code> - Array of findings (on SUCCESS)</li>
      </ul>
    </Agent>
  );
}
