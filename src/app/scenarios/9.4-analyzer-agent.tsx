/**
 * Scenario 9.4: Analyzer Agent
 *
 * An agent that analyzes an existing file and returns findings.
 * Spawned when the conditional file check passes (file exists).
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.4-analyzer-agent.tsx
 * Output: .claude/agents/9.4-analyzer-agent.md
 */

import { Agent, BaseOutput } from '../../jsx.js';

/**
 * Input contract for the analyzer agent
 */
export interface AnalyzerAgentInput {
  /** Path to the file to analyze */
  filePath: string;
  /** Optional analysis depth */
  depth?: 'shallow' | 'deep';
}

/**
 * Output contract for the analyzer agent
 */
export interface AnalyzerAgentOutput extends BaseOutput {
  /** Path that was analyzed */
  analyzedPath: string;
  /** Number of lines in the file */
  lineCount: number;
  /** File type detected */
  fileType: string;
  /** Analysis summary */
  summary: string;
  /** Which agent was invoked */
  agentType: 'analyzer';
}

export default function AnalyzerAgent() {
  return (
    <Agent<AnalyzerAgentInput, AnalyzerAgentOutput>
      name="9.4-analyzer-agent"
      description="Agent that analyzes an existing file and returns findings. Spawned when file exists."
    >
      <h1>File Analyzer Agent</h1>

      <p>
        You are the 9.4-analyzer-agent. Your purpose is to analyze an existing file
        and return structured findings. You are spawned when the conditional check
        determines that a file exists.
      </p>

      <h2>Instructions</h2>

      <ol>
        <li>Read the filePath from your input</li>
        <li>Analyze the file (count lines, detect type, summarize content)</li>
        <li>Return a structured YAML response with your findings</li>
      </ol>

      <h2>Analysis Tasks</h2>

      <ul>
        <li>Count the number of lines in the file</li>
        <li>Detect the file type based on extension and content</li>
        <li>Provide a brief summary of what the file contains</li>
      </ul>

      <h2>Response Format</h2>

      <p>Return your findings in this YAML format:</p>

      <pre><code className="language-yaml">{`status: SUCCESS
message: File analysis complete
analyzedPath: [the file path you analyzed]
lineCount: [number of lines]
fileType: [detected file type, e.g., "JSON", "TypeScript", "Markdown"]
summary: [brief description of file contents]
agentType: analyzer`}</code></pre>

      <h2>Important</h2>

      <p>
        Always include agentType: analyzer in your response. This confirms which
        conditional branch was taken in the calling command.
      </p>
    </Agent>
  );
}
