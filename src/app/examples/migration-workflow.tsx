/**
 * Migration Workflow Example
 *
 * Demonstrates advanced Workflow usage with:
 * - Team with 3 workers (Planner, Executor, Validator)
 * - 4-task pipeline (Plan -> Backup -> Migrate -> Validate)
 * - Graceful shutdown sequence
 *
 * Follows Claude Code swarm lifecycle:
 * 1. Create Team → 2. Create Tasks → 3. Spawn Teammates → 4. Work → 5. Shutdown
 *
 * Workers explicitly claim and complete tasks via TaskList/TaskUpdate.
 */
import {
  Command,
  defineTask,
  defineWorker,
  defineTeam,
  AgentType,
  PluginAgentType,
  TaskDef,
  TaskPipeline,
  Team,
  Teammate,
  Prompt,
  ShutdownSequence,
  Workflow,
} from '../../index.js';

// Define tasks for the migration pipeline
const PlanMigration = defineTask('Plan database migration', 'plan');
const BackupData = defineTask('Backup existing data', 'backup');
const RunMigration = defineTask('Execute migration scripts', 'migrate');
const ValidateData = defineTask('Validate migrated data', 'validate');

// Define workers with their specializations
const Planner = defineWorker('planner', AgentType.Plan);
const Executor = defineWorker('executor', AgentType.GeneralPurpose);
const Validator = defineWorker('validator', PluginAgentType.SecuritySentinel);

// Define the team
const MigrationTeam = defineTeam('db-migration', [Planner, Executor, Validator]);

export default () => (
  <Command name="migration-workflow" description="Database migration workflow with team coordination">
    <h1>Database Migration Workflow</h1>

    <p>
      This workflow orchestrates a database migration using a team of specialized
      agents. The planner creates the migration strategy, the executor runs the
      migration, and the validator ensures data integrity.
    </p>

    <Workflow name="Database Migration" team={MigrationTeam} description="Coordinated database migration with validation">
      {/* STEP 1: Create tasks BEFORE spawning teammates */}
      <TaskPipeline title="Migration Steps" autoChain>
        <TaskDef
          task={PlanMigration}
          prompt="Analyze schemas and create detailed migration plan with rollback procedures."
          activeForm="Planning migration..."
        />
        <TaskDef
          task={BackupData}
          prompt="Create full backup of existing database before any changes."
          activeForm="Backing up data..."
        />
        <TaskDef
          task={RunMigration}
          prompt="Execute migration scripts in order with checkpoints."
          activeForm="Running migration..."
        />
        <TaskDef
          task={ValidateData}
          prompt="Verify data integrity and run validation queries."
          activeForm="Validating data..."
        />
      </TaskPipeline>

      {/* STEP 2: Spawn teammates AFTER tasks exist */}
      <Team team={MigrationTeam} description="Database migration specialists">
        <Teammate worker={Planner} description="Plans migration strategy">
          <Prompt>
            <p>You are the migration planner. Your job:</p>
            <ol>
              <li>Call TaskList() to see available tasks</li>
              <li>Claim task #1 (Plan database migration): TaskUpdate(&#123; taskId: "1", owner: "planner", status: "in_progress" &#125;)</li>
              <li>Analyze the current database schema and target schema</li>
              <li>Create a detailed migration plan including rollback procedures</li>
              <li>Mark complete: TaskUpdate(&#123; taskId: "1", status: "completed" &#125;)</li>
              <li>Send the plan to team-lead: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "Plan complete. [summary]" &#125;)</li>
            </ol>
            <p>Wait for team-lead acknowledgment before exiting.</p>
          </Prompt>
        </Teammate>

        <Teammate worker={Executor} description="Executes migration scripts">
          <Prompt>
            <p>You are the migration executor. Your job:</p>
            <ol>
              <li>Call TaskList() to monitor task status</li>
              <li>Wait for task #2 (Backup) to unblock (when task #1 completes)</li>
              <li>Claim task #2: TaskUpdate(&#123; taskId: "2", owner: "executor", status: "in_progress" &#125;)</li>
              <li>Create full backup of existing database</li>
              <li>Mark complete: TaskUpdate(&#123; taskId: "2", status: "completed" &#125;)</li>
              <li>Wait for task #3 (Migrate) to unblock</li>
              <li>Claim task #3: TaskUpdate(&#123; taskId: "3", owner: "executor", status: "in_progress" &#125;)</li>
              <li>Execute migration scripts in order with checkpoints</li>
              <li>Report progress to team-lead after each major step</li>
              <li>Mark complete: TaskUpdate(&#123; taskId: "3", status: "completed" &#125;)</li>
              <li>Notify team-lead: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "Migration complete" &#125;)</li>
            </ol>
            <p>If any errors occur, notify team-lead immediately.</p>
          </Prompt>
        </Teammate>

        <Teammate worker={Validator} description="Validates data integrity">
          <Prompt>
            <p>You are the data validator. Your job:</p>
            <ol>
              <li>Call TaskList() to monitor task status</li>
              <li>Wait for task #4 (Validate) to unblock (when task #3 completes)</li>
              <li>Claim task #4: TaskUpdate(&#123; taskId: "4", owner: "validator", status: "in_progress" &#125;)</li>
              <li>Validate data integrity:
                <ul>
                  <li>Compare row counts between old and new schemas</li>
                  <li>Check foreign key relationships</li>
                  <li>Verify critical business data</li>
                </ul>
              </li>
              <li>Mark complete: TaskUpdate(&#123; taskId: "4", status: "completed" &#125;)</li>
              <li>Send findings to team-lead: Teammate(&#123; operation: "write", target_agent_id: "team-lead", value: "Validation [PASSED/FAILED]: [details]" &#125;)</li>
            </ol>
            <p>Report any discrepancies immediately.</p>
          </Prompt>
        </Teammate>
      </Team>

      <ShutdownSequence
        workers={[Planner, Executor, Validator]}
        reason="Migration workflow complete"
      />
    </Workflow>
  </Command>
);
