/**
 * Migration Workflow Example
 *
 * Demonstrates advanced Workflow usage with:
 * - Team with 3 workers (Planner, Executor, Validator)
 * - 4-task pipeline (Plan -> Backup -> Migrate -> Validate)
 * - Graceful shutdown sequence
 *
 * This is a full orchestration example showing all swarm components together.
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
      <Team team={MigrationTeam} description="Database migration specialists">
        <Teammate
          worker={Planner}
          description="Plans migration strategy"
          prompt="Analyze the current database schema and target schema. Create a detailed migration plan including rollback procedures. Send the plan to team-lead when ready for review."
        />
        <Teammate
          worker={Executor}
          description="Executes migration scripts"
          prompt="Wait for plan approval from team-lead. Execute migration scripts in the specified order. Report progress after each major step. Notify team-lead immediately if any errors occur."
        />
        <Teammate
          worker={Validator}
          description="Validates data integrity"
          prompt="After migration completes, validate data integrity by comparing row counts, checking foreign key relationships, and verifying critical business data. Report any discrepancies to team-lead."
        />
      </Team>

      <TaskPipeline title="Migration Steps" autoChain>
        <TaskDef
          task={PlanMigration}
          description="Analyze schemas and create detailed migration plan with rollback procedures."
          activeForm="Planning migration..."
        />
        <TaskDef
          task={BackupData}
          description="Create full backup of existing database before any changes."
          activeForm="Backing up data..."
        />
        <TaskDef
          task={RunMigration}
          description="Execute migration scripts in order with checkpoints."
          activeForm="Running migration..."
        />
        <TaskDef
          task={ValidateData}
          description="Verify data integrity and run validation queries."
          activeForm="Validating data..."
        />
      </TaskPipeline>

      <ShutdownSequence
        workers={[Planner, Executor, Validator]}
        reason="Migration workflow complete"
      />
    </Workflow>
  </Command>
);
