/**
 * Test file for Phase 14: Agent Output Schema
 *
 * Tests:
 * - Agent with TInput and TOutput type parameters
 * - Output interface extending BaseOutput
 * - Auto-generated structured_returns section
 */

import { Agent, BaseOutput } from '../../jsx.js';

// Input contract (same as before)
export interface AnalyzerInput {
  filePath: string;
  depth: 'shallow' | 'deep';
}

// Output contract extending BaseOutput
export interface AnalyzerOutput extends BaseOutput {
  // SUCCESS fields
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  findings?: string[];
  metrics?: {
    linesAnalyzed: number;
    issuesFound: number;
  };
  // BLOCKED fields
  blockedBy?: string;
  // NOT_FOUND fields
  searchedPaths?: string[];
}

export default function TestOutputSchema() {
  return (
    <Agent<AnalyzerInput, AnalyzerOutput>
      name="test-analyzer"
      description="Analyzes code for quality issues"
      tools="Read Grep Glob"
    >
      <h1>Role</h1>
      <p>You are a code analyzer that examines files for quality issues.</p>

      <h2>Process</h2>
      <ol>
        <li>Read the specified file</li>
        <li>Analyze based on depth setting</li>
        <li>Report findings with confidence level</li>
      </ol>
    </Agent>
  );
}
