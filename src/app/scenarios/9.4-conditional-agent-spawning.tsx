/**
 * Scenario 9.4: Conditional Agent Spawning
 *
 * Goal: Confirm that conditional logic can control which agent is spawned
 * based on runtime conditions.
 *
 * Success Criteria:
 * - Condition is evaluated at runtime
 * - Only one agent is spawned (not both)
 * - The correct agent is chosen based on condition
 * - Agent output is handled in both branches
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.4-conditional-agent-spawning.tsx
 * Output: .claude/commands/9.4-conditional-agent-spawning.md
 */

import {
  Command,
  Assign,
  useVariable,
  If,
  Else,
  SpawnAgent,
  useOutput,
  OnStatus,
  fileExists
} from '../../jsx.js';
import type { AnalyzerAgentInput, AnalyzerAgentOutput } from './9.4-analyzer-agent.js';
import type { CreatorAgentInput, CreatorAgentOutput } from './9.4-creator-agent.js';

// Declare variables
const targetFile = useVariable<string>("TARGET_FILE");

// Output references for both agents
const analyzerOutput = useOutput<AnalyzerAgentOutput>('9.4-analyzer-agent');
const creatorOutput = useOutput<CreatorAgentOutput>('9.4-creator-agent');

export default function ConditionalAgentSpawningCommand() {
  return (
    <Command
      name="9.4-conditional-agent-spawning"
      description="Test conditional logic controlling which agent is spawned based on runtime conditions."
    >
      <h1>Conditional Agent Spawning Test</h1>

      <p>
        This test validates that If/Else conditionals can control which agent
        is spawned based on runtime conditions. The file existence check determines
        whether to spawn the Analyzer (file exists) or Creator (file missing).
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify the condition is evaluated at runtime (not compile time)</li>
        <li>Verify only ONE agent is spawned (never both)</li>
        <li>Verify the CORRECT agent is chosen based on the condition result</li>
        <li>Verify agent output is properly handled in both branches</li>
      </ol>

      <h2>Setup: Define Target File</h2>

      <p>
        Set the target file path. For this test, we use package.json which should exist
        in the project root, so the Analyzer agent should be spawned.
      </p>

      <Assign var={targetFile} value="package.json" />

      <h2>Runtime Evaluation Required</h2>

      <p>
        <strong>IMPORTANT:</strong> You must evaluate the following shell condition using
        the Bash tool BEFORE deciding which agent to spawn:
      </p>

      <pre><code className="language-bash">{`[ -f $TARGET_FILE ]`}</code></pre>

      <p>
        Based on the result of this test, execute ONLY ONE of the following branches.
      </p>

      <h2>Conditional Agent Spawn</h2>

      <If test={fileExists(targetFile)}>
        <h3>Branch A: File Exists - Spawn Analyzer</h3>

        <p>
          The file $TARGET_FILE exists. Spawn the Analyzer agent to examine it.
        </p>

        <SpawnAgent<AnalyzerAgentInput, AnalyzerAgentOutput>
          agent="9.4-analyzer-agent"
          model="haiku"
          description="Analyze the existing file"
          input={{ filePath: targetFile, depth: 'shallow' }}
        >
          Analyze the file and return your findings. Include agentType: analyzer in your response.
        </SpawnAgent>

        <h4>Handle Analyzer Output</h4>

        <OnStatus output={analyzerOutput} status="SUCCESS">
          <p>
            <strong>Analyzer completed successfully.</strong>
          </p>
          <ul>
            <li>Analyzed path: {analyzerOutput.field('analyzedPath')}</li>
            <li>Line count: {analyzerOutput.field('lineCount')}</li>
            <li>File type: {analyzerOutput.field('fileType')}</li>
            <li>Summary: {analyzerOutput.field('summary')}</li>
            <li>Agent type: {analyzerOutput.field('agentType')}</li>
          </ul>
        </OnStatus>

        <OnStatus output={analyzerOutput} status="ERROR">
          <p>
            <strong>Analyzer encountered an error:</strong> {analyzerOutput.field('message')}
          </p>
        </OnStatus>
      </If>

      <Else>
        <h3>Branch B: File Missing - Spawn Creator</h3>

        <p>
          The file $TARGET_FILE does not exist. Spawn the Creator agent to plan creation.
        </p>

        <SpawnAgent<CreatorAgentInput, CreatorAgentOutput>
          agent="9.4-creator-agent"
          model="haiku"
          description="Plan file creation for missing file"
          input={{ filePath: targetFile, contentType: 'placeholder' }}
        >
          Report what file would be created. Include agentType: creator in your response.
        </SpawnAgent>

        <h4>Handle Creator Output</h4>

        <OnStatus output={creatorOutput} status="SUCCESS">
          <p>
            <strong>Creator completed successfully.</strong>
          </p>
          <ul>
            <li>Target path: {creatorOutput.field('targetPath')}</li>
            <li>Content type: {creatorOutput.field('contentType')}</li>
            <li>Description: {creatorOutput.field('description')}</li>
            <li>Agent type: {creatorOutput.field('agentType')}</li>
          </ul>
        </OnStatus>

        <OnStatus output={creatorOutput} status="ERROR">
          <p>
            <strong>Creator encountered an error:</strong> {creatorOutput.field('message')}
          </p>
        </OnStatus>
      </Else>

      <h2>Validation</h2>

      <p>After completing the test, report the following in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 9.4
test_name: Conditional Agent Spawning
target_file: [the TARGET_FILE value]
file_exists_result: [TRUE/FALSE - what did the shell test return?]
condition_evaluated_at: [RUNTIME/COMPILE_TIME]
agents_spawned_count: [1/2/0 - how many agents were actually spawned?]
agent_spawned: [analyzer/creator/both/none]
expected_agent: [analyzer - because package.json exists]
agent_output_received: [YES/NO]
agent_type_field: [analyzer/creator - value from agent response]
both_branches_visible: [YES/NO - were both If and Else visible in markdown?]
only_one_branch_executed: [YES/NO - did you execute only one branch?]
output_handled_correctly: [YES/NO - did OnStatus handlers work?]
overall_result: [PASSED/FAILED]
notes: [any observations about conditional agent spawning behavior]`}</code></pre>
    </Command>
  );
}
