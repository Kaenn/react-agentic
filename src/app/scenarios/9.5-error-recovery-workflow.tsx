/**
 * Scenario 9.5: Error Recovery Workflow
 *
 * Goal: Confirm that OnStatus ERROR handlers can implement retry or recovery logic.
 *
 * Success Criteria:
 * - Agent failure triggers ERROR handler
 * - ERROR handler receives error context
 * - Recovery logic (retry/fallback) is executed
 * - Workflow can recover and complete successfully
 *
 * Run: node dist/cli/index.js build src/app/scenarios/9.5-error-recovery-workflow.tsx
 * Output: .claude/commands/9.5-error-recovery-workflow.md
 */

import { Command, SpawnAgent, useOutput, OnStatus, useVariable, Assign } from '../../jsx.js';
import type { FailingAgentInput, FailingAgentOutput } from './9.5-failing-agent.js';
import type { RecoveryAgentInput, RecoveryAgentOutput } from './9.5-recovery-agent.js';

export default function ErrorRecoveryWorkflowCommand() {
  // Variables for workflow state
  const taskDescription = useVariable('TASK_DESCRIPTION');
  const attemptCount = useVariable('ATTEMPT_COUNT');
  const errorDetails = useVariable('ERROR_DETAILS');
  const workflowStatus = useVariable('WORKFLOW_STATUS');

  // Output refs for both agents
  const primaryOutput = useOutput<FailingAgentOutput>('9.5-failing-agent');
  const recoveryOutput = useOutput<RecoveryAgentOutput>('9.5-recovery-agent');

  return (
    <Command
      name="9.5-error-recovery-workflow"
      description="Test command for error recovery workflows. Spawns a failing agent and uses ERROR handler to spawn recovery agent."
    >
      <h1>Error Recovery Workflow Test</h1>

      <p>
        This command tests that OnStatus ERROR handlers can implement recovery logic.
        The workflow spawns an agent that fails, catches the error, and spawns a
        fallback agent to complete the task.
      </p>

      <h2>Test Objectives</h2>

      <ol>
        <li>Verify agent failure correctly triggers the ERROR handler</li>
        <li>Verify ERROR handler receives error context (errorDetails, errorCode)</li>
        <li>Verify recovery logic (spawning fallback agent) executes from ERROR handler</li>
        <li>Verify the workflow can recover and complete successfully</li>
      </ol>

      <h2>Step 1: Initialize Workflow Variables</h2>

      <p>Set up the workflow state tracking variables:</p>

      <Assign var={taskDescription} value="Process data using primary method" />
      <Assign var={attemptCount} value="1" />
      <Assign var={workflowStatus} value="STARTING" />

      <h2>Step 2: Spawn Primary Agent (Will Fail)</h2>

      <p>
        Execute the following Task() call to spawn the primary agent.
        <strong>This agent is designed to fail</strong> to test error recovery:
      </p>

      <SpawnAgent
        agent="9.5-failing-agent"
        model="haiku"
        description="Spawn primary agent that will fail"
        prompt="Process the task 'Process data using primary method' (attempt 1). Return ERROR status to trigger recovery workflow."
      />

      <h2>Step 3: Handle Agent Status</h2>

      <p>
        After the primary agent returns, evaluate its status and execute the
        appropriate handler. The ERROR handler contains recovery logic.
      </p>

      <OnStatus output={primaryOutput} status="SUCCESS">
        <h3>SUCCESS Handler (Unexpected Path)</h3>

        <p>
          <strong>NOTE:</strong> This handler should NOT be triggered because the
          primary agent is designed to always fail.
        </p>

        <p>If you see this, the test may have an issue with the agent configuration.</p>

        <Assign var={workflowStatus} value="UNEXPECTED_SUCCESS" />

        <p>Record: PRIMARY_SUCCESS=true (this is unexpected)</p>
      </OnStatus>

      <OnStatus output={primaryOutput} status="ERROR">
        <h3>ERROR Handler Triggered - Recovery Logic</h3>

        <p>
          <strong>The primary agent failed as expected!</strong> This ERROR handler
          will now implement recovery logic by spawning a fallback agent.
        </p>

        <h4>Error Context Received:</h4>

        <ul>
          <li>Error Details: {primaryOutput.field('errorDetails')}</li>
          <li>Error Code: {primaryOutput.field('errorCode')}</li>
          <li>Attempted Task: {primaryOutput.field('attemptedTask')}</li>
          <li>Attempt Number: {primaryOutput.field('attemptNumber')}</li>
        </ul>

        <Assign var={errorDetails} bash={`echo "Primary agent failed with: ${primaryOutput.field('errorCode')}"`} />
        <Assign var={workflowStatus} value="RECOVERING" />

        <h4>Recovery Action: Spawn Fallback Agent</h4>

        <p>
          Execute the recovery Task() call to spawn the fallback agent.
          Pass the error context so the recovery agent understands what failed:
        </p>

        <SpawnAgent<RecoveryAgentOutput>
          agent="9.5-recovery-agent"
          model="haiku"
          description="Spawn recovery agent after primary failure"
          prompt={`You are being spawned as the RECOVERY agent after the primary agent failed.

Your input:
originalTask: Process data using primary method
previousError: Primary agent encountered simulated failure
previousAttempts: 1

IMPORTANT: Return SUCCESS status to complete the recovery workflow.
Follow your agent instructions exactly.`}
        />

        <h4>Handle Recovery Agent Status</h4>

        <OnStatus output={recoveryOutput} status="SUCCESS">
          <h5>Recovery SUCCESS!</h5>

          <p>
            <strong>The recovery agent completed successfully!</strong>
            The error recovery workflow has been validated.
          </p>

          <ul>
            <li>Recovery Complete: {recoveryOutput.field('recoveryComplete')}</li>
            <li>Recovered Task: {recoveryOutput.field('recoveredTask')}</li>
            <li>Recovery Summary: {recoveryOutput.field('recoverySummary')}</li>
            <li>Total Attempts: {recoveryOutput.field('totalAttempts')}</li>
          </ul>

          <Assign var={workflowStatus} value="RECOVERED" />

          <p>Record: RECOVERY_SUCCESS=true</p>
        </OnStatus>

        <OnStatus output={recoveryOutput} status="ERROR">
          <h5>Recovery Failed</h5>

          <p>The recovery agent also failed. This should not happen in this test.</p>

          <Assign var={workflowStatus} value="RECOVERY_FAILED" />

          <p>Record: RECOVERY_SUCCESS=false</p>
        </OnStatus>
      </OnStatus>

      <h2>Step 4: Validation Report</h2>

      <p>After completing the error recovery workflow, report the results in YAML format:</p>

      <pre><code className="language-yaml">{`test_id: 9.5
test_name: Error Recovery Workflow
primary_agent_status: [SUCCESS/ERROR - what status did primary agent return?]
error_handler_triggered: [YES/NO - did the ERROR OnStatus handler execute?]
error_context_received: [YES/NO - were errorDetails and errorCode available?]
recovery_agent_spawned: [YES/NO - was the fallback agent spawned from ERROR handler?]
recovery_agent_status: [SUCCESS/ERROR/NOT_SPAWNED]
workflow_final_status: [RECOVERED/FAILED/UNEXPECTED_SUCCESS]
overall_result: [PASSED/FAILED]
notes: [observations about the error recovery workflow]`}</code></pre>

      <h2>Expected Flow</h2>

      <pre><code className="language-text">{`1. Primary agent spawned → Returns ERROR
2. ERROR handler triggered → Receives error context
3. Recovery logic executes → Fallback agent spawned
4. Recovery agent returns → SUCCESS
5. Workflow completes → Status: RECOVERED`}</code></pre>
    </Command>
  );
}
