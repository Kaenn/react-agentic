/**
 * @component TaskPool
 * @description Defines a pool of independent tasks for swarm processing
 */

import {
  TaskRef,
  defineTask,
  resetTaskIds,
  createTaskPool,
  createFileReviewPool,
  TaskPoolResult,
  createTaskPoolWithDeps,
  createFileReviewPoolWithDeps,
  TaskPoolWithDeps,
  combine,
  allOf,
  dependencyGroup,
  atLeast,
  mapToTasks,
  batchTasks
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export {
  TaskRef,
  defineTask,
  createTaskPool,
  createFileReviewPool,
  TaskPoolResult,
  createTaskPoolWithDeps,
  createFileReviewPoolWithDeps,
  TaskPoolWithDeps,
  combine,
  allOf,
  dependencyGroup,
  atLeast,
  mapToTasks,
  batchTasks
};

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface TaskPoolTask {
  /**
   * Task reference - use createTaskPool() for type-safe refs
   * @optional
   */
  task?: TaskRef;

  /**
   * Task name - auto-generates ID
   * @optional if task is provided
   */
  name?: string;

  /**
   * Brief title for the task
   * @required if task is not provided
   */
  subject?: string;

  /**
   * Detailed description of what needs to be done
   * @required
   */
  description: string;

  /**
   * Text shown in spinner when task is in_progress
   * @optional
   */
  activeForm?: string;
}

interface TaskPoolProps {
  /**
   * Title for the task pool section
   * @default "Task Pool (Independent Tasks)"
   */
  title?: string;

  /**
   * Array of task definitions
   * All tasks are independent (no dependencies)
   * Can use TaskRef from createTaskPool() or inline definitions
   * @required
   */
  tasks: TaskPoolTask[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskPool({ title, tasks }: TaskPoolProps) {
  // Implementation renders to markdown with table
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using createFileReviewPool helper (RECOMMENDED for file reviews)
// -----------------------------------------------------------------------------

const filePool = createFileReviewPool([
  'app/models/user.rb',
  'app/models/payment.rb',
  'app/controllers/api_controller.rb',
  'app/services/notification_service.rb'
]);

// Access individual tasks by name
const userTask = filePool.byName['app-models-user-rb'];

const FileReviewPoolExample = () => (
  <TaskPool
    title="File Review Tasks"
    tasks={filePool.tasks.map((task) => ({
      task,
      description: `Review for security and code quality`
    }))}
  />
);

// -----------------------------------------------------------------------------
// Pattern 2: Using createTaskPool for custom pools
// -----------------------------------------------------------------------------

const modulePool = createTaskPool([
  { name: 'auth', subject: 'Review authentication module' },
  { name: 'payment', subject: 'Review payment module' },
  { name: 'notification', subject: 'Review notification module' },
  { name: 'logging', subject: 'Review logging module' }
]);

// Type-safe access to specific tasks
const { auth, payment, notification, logging } = modulePool.byName;

const ModulePoolExample = () => (
  <TaskPool
    title="Module Review Tasks"
    tasks={[
      {
        task: auth,
        description: 'Check for security vulnerabilities and proper session handling',
        activeForm: 'Reviewing auth...'
      },
      {
        task: payment,
        description: 'Verify PCI compliance and secure transaction handling',
        activeForm: 'Reviewing payments...'
      },
      {
        task: notification,
        description: 'Check rate limiting and template injection risks',
        activeForm: 'Reviewing notifications...'
      },
      {
        task: logging,
        description: 'Ensure no PII leakage in logs',
        activeForm: 'Reviewing logs...'
      }
    ]}
  />
);

// -----------------------------------------------------------------------------
// Pattern 3: Dynamic pool from props
// -----------------------------------------------------------------------------

const DynamicPool = ({ files }: { files: string[] }) => {
  const pool = createFileReviewPool(files, 'Audit');

  return (
    <TaskPool
      title="Dynamic File Audit"
      tasks={pool.tasks.map((task) => ({
        task,
        description: `Audit for code quality and security issues`,
        activeForm: `Auditing...`
      }))}
    />
  );
};

// Usage:
// <DynamicPool files={['user.rb', 'payment.rb', 'api.rb']} />

// -----------------------------------------------------------------------------
// Pattern 4: Pool with computed dependencies
// -----------------------------------------------------------------------------

const reviewPool = createTaskPoolWithDeps([
  { name: 'security-1', subject: 'Security review: user.rb' },
  { name: 'security-2', subject: 'Security review: payment.rb' },
  { name: 'perf-1', subject: 'Performance review: user.rb' },
  { name: 'perf-2', subject: 'Performance review: payment.rb' }
]);

// Task that waits for ALL pool tasks
const Integration = defineTask('integration', 'Integration testing');

// Task that waits for first 2 tasks
const QuickCheck = defineTask('quick-check', 'Quick validation');

// Task that waits for only security reviews
const SecuritySummary = defineTask('security-summary', 'Security summary');

const ComputedDepsExample = () => (
  <>
    <TaskPool
      title="Review Pool"
      tasks={reviewPool.tasks.map((task) => ({
        task,
        description: 'Perform review'
      }))}
    />

    {/* Wait for ALL tasks in pool */}
    <TaskDef
      task={Integration}
      description="Run after all reviews complete"
      blockedBy={reviewPool.all()}
    />

    {/* Wait for first 2 tasks */}
    <TaskDef
      task={QuickCheck}
      description="Quick check after first 2 reviews"
      blockedBy={reviewPool.first(2)}
    />

    {/* Wait for filtered tasks */}
    <TaskDef
      task={SecuritySummary}
      description="Summarize security findings"
      blockedBy={reviewPool.filter((t) => t.name.startsWith('security-'))}
    />
  </>
);

// -----------------------------------------------------------------------------
// Pattern 5: Combining dependencies from multiple pools
// -----------------------------------------------------------------------------

const frontendPool = createFileReviewPoolWithDeps(['app.tsx', 'index.tsx'], 'Frontend');
const backendPool = createFileReviewPoolWithDeps(['api.py', 'server.py'], 'Backend');

const Deploy = defineTask('deploy', 'Deploy to production');

const CombinedDepsExample = () => (
  <>
    <TaskPool
      title="Frontend Reviews"
      tasks={frontendPool.tasks.map((t) => ({ task: t, description: 'Review' }))}
    />
    <TaskPool
      title="Backend Reviews"
      tasks={backendPool.tasks.map((t) => ({ task: t, description: 'Review' }))}
    />

    {/* Deploy waits for ALL frontend AND backend reviews */}
    <TaskDef
      task={Deploy}
      description="Deploy after all reviews"
      blockedBy={allOf(frontendPool, backendPool)}
    />
  </>
);

// -----------------------------------------------------------------------------
// Pattern 6: Named dependency groups
// -----------------------------------------------------------------------------

const criticalPath = dependencyGroup('Critical Path', [
  reviewPool.byName['security-1'],
  reviewPool.byName['security-2']
]);

const NamedGroupExample = () => (
  <TaskDef
    task={SecuritySummary}
    description="Requires critical path"
    blockedBy={criticalPath.tasks}
  />
);

// -----------------------------------------------------------------------------
// Pattern 7: Using mapToTasks for custom mapping
// -----------------------------------------------------------------------------

const files = ['user.rb', 'payment.rb', 'api.rb'];

const MappedPool = () => {
  const tasks = mapToTasks(files, (file, index) => ({
    name: `review-${index + 1}`,
    subject: `Review ${file}`
  }));

  return (
    <TaskPool
      title="Mapped Reviews"
      tasks={tasks.map((task) => ({
        task,
        description: `Security and quality review`
      }))}
    />
  );
};

// -----------------------------------------------------------------------------
// Pattern 8: Using batchTasks for related tasks
// -----------------------------------------------------------------------------

const { tasks: batchedTasks, refs } = batchTasks('audit', [
  { suffix: 'security', subject: 'Security Audit' },
  { suffix: 'performance', subject: 'Performance Audit' },
  { suffix: 'accessibility', subject: 'Accessibility Audit' }
]);

const BatchExample = () => (
  <>
    <TaskPool
      title="Audit Tasks"
      tasks={batchedTasks.map((task) => ({
        task,
        description: 'Comprehensive audit'
      }))}
    />

    {/* Access specific tasks by suffix */}
    <TaskDef
      task={defineTask('summary', 'Audit Summary')}
      description="Summarize all audits"
      blockedBy={[refs.security, refs.performance, refs.accessibility]}
    />
  </>
);

// -----------------------------------------------------------------------------
// Pattern 9: Inline tasks (simple, no refs needed)
// -----------------------------------------------------------------------------

const SimplePool = () => (
  <TaskPool
    tasks={[
      { name: 'task-1', subject: 'Review user.rb', description: 'Review for security' },
      { name: 'task-2', subject: 'Review payment.rb', description: 'Review for security' },
      { name: 'task-3', subject: 'Review api.rb', description: 'Review for security' }
    ]}
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Pattern 1 (createFileReviewPool) renders to:
 *
 * ```markdown
 * ### File Review Tasks
 *
 * | ID | Name | Subject | Description |
 * |----|------|---------|-------------|
 * | 1 | app-models-user-rb | Review app/models/user.rb | Review for security and code quality |
 * | 2 | app-models-payment-rb | Review app/models/payment.rb | Review for security and code quality |
 * | 3 | app-controllers-api_controller-rb | Review app/controllers/api_controller.rb | Review for security and code quality |
 * | 4 | app-services-notification_service-rb | Review app/services/notification_service.rb | Review for security and code quality |
 *
 * ```javascript
 * // Create independent task pool (auto-generated IDs)
 * TaskCreate({ subject: "Review app/models/user.rb", ... })        // id: 1
 * TaskCreate({ subject: "Review app/models/payment.rb", ... })     // id: 2
 * TaskCreate({ subject: "Review app/controllers/api_controller.rb", ... }) // id: 3
 * TaskCreate({ subject: "Review app/services/notification_service.rb", ... }) // id: 4
 *
 * // No dependencies - workers can claim any task
 * ```
 * ```
 */

/**
 * Pattern 2 (createTaskPool with named tasks) renders to:
 *
 * ```markdown
 * ### Module Review Tasks
 *
 * | ID | Name | Subject | Description |
 * |----|------|---------|-------------|
 * | 1 | auth | Review authentication module | Check for security vulnerabilities... |
 * | 2 | payment | Review payment module | Verify PCI compliance... |
 * | 3 | notification | Review notification module | Check rate limiting... |
 * | 4 | logging | Review logging module | Ensure no PII leakage... |
 *
 * ```javascript
 * // Access tasks by name for type-safe references
 * const { auth, payment, notification, logging } = modulePool.byName;
 *
 * // auth.id === "1"
 * // payment.id === "2"
 * // etc.
 * ```
 * ```
 */

/**
 * How createTaskPool/createFileReviewPool work:
 *
 * const pool = createTaskPool([
 *   { name: 'auth', subject: 'Review auth' },
 *   { name: 'payment', subject: 'Review payment' }
 * ]);
 *
 * pool.tasks[0].id === "1"
 * pool.tasks[0].name === "auth"
 *
 * pool.byName.auth.id === "1"
 * pool.byName.payment.id === "2"
 *
 * Benefits:
 * - Auto-generated IDs (no manual management)
 * - Type-safe access via byName
 * - IDE autocomplete for task names
 * - Easy iteration with pool.tasks
 */
