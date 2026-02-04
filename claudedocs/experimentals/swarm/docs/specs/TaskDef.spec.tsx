/**
 * @component TaskDef
 * @description Defines a task in the shared task queue
 */

import {
  TaskStatus,
  TaskRef,
  defineTask,
  resetTaskIds,
  createTaskRef
} from './enums';

// =============================================================================
// RE-EXPORTS (for convenience)
// =============================================================================

export { TaskStatus, TaskRef, defineTask, resetTaskIds, createTaskRef };

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface TaskDefProps {
  /**
   * Task reference - use defineTask() to create
   * Auto-generates ID and provides type-safe references
   * @optional - if not provided, use name/subject directly
   */
  task?: TaskRef;

  /**
   * Task name - used as identifier for references
   * Auto-generates numeric ID internally
   * @optional if task prop is provided
   */
  name?: string;

  /**
   * Brief title for the task
   * @optional if task prop is provided
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

  /**
   * Tasks that must complete before this task can start
   * Accepts TaskRef objects for type-safe references
   * @optional
   */
  blockedBy?: TaskRef[];

  /**
   * @deprecated Use blockedBy with TaskRef instead
   * List of task IDs as strings
   */
  blockedByIds?: string[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TaskDef({ id, subject, description, activeForm, blockedBy }: TaskDefProps) {
  // Implementation renders to markdown string
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// -----------------------------------------------------------------------------
// Pattern 1: Using defineTask() for type-safe references (RECOMMENDED)
// -----------------------------------------------------------------------------

// Define tasks with auto-generated IDs
const Research = defineTask('Research OAuth providers', 'research');
const Plan = defineTask('Create implementation plan', 'plan');
const Implement = defineTask('Implement OAuth', 'implement');
const Test = defineTask('Write tests', 'test');
const Review = defineTask('Final review', 'review');

// Use TaskRef in blockedBy for type-safe dependencies
const TypeSafeExample = () => (
  <>
    <TaskDef
      task={Research}
      description="Research OAuth2 best practices and compare Google, GitHub, and Auth0"
      activeForm="Researching OAuth..."
    />

    <TaskDef
      task={Plan}
      description="Design OAuth implementation based on research findings"
      activeForm="Planning..."
      blockedBy={[Research]} // Type-safe reference!
    />

    <TaskDef
      task={Implement}
      description="Build OAuth endpoints according to plan"
      activeForm="Implementing..."
      blockedBy={[Plan]}
    />

    <TaskDef
      task={Test}
      description="Write and run comprehensive tests"
      activeForm="Testing..."
      blockedBy={[Implement]}
    />

    <TaskDef
      task={Review}
      description="Final security and quality review"
      activeForm="Reviewing..."
      blockedBy={[Test]}
    />
  </>
);

// -----------------------------------------------------------------------------
// Pattern 2: Multiple dependencies with type-safe refs
// -----------------------------------------------------------------------------

const Frontend = defineTask('Implement frontend', 'frontend');
const Backend = defineTask('Implement backend', 'backend');
const Database = defineTask('Setup database', 'database');
const Integration = defineTask('Integration testing', 'integration');

const MultipleDepsExample = () => (
  <>
    <TaskDef task={Frontend} description="Build React components" />
    <TaskDef task={Backend} description="Build API endpoints" />
    <TaskDef task={Database} description="Setup PostgreSQL" />

    {/* Integration depends on ALL three completing */}
    <TaskDef
      task={Integration}
      description="Run full integration test suite"
      activeForm="Running integration tests..."
      blockedBy={[Frontend, Backend, Database]}
    />
  </>
);

// -----------------------------------------------------------------------------
// Pattern 3: Simple inline (auto-ID, no references needed)
// -----------------------------------------------------------------------------

const SimpleTask = () => (
  <TaskDef
    name="review-auth"
    subject="Review authentication code"
    description="Review all files in app/services/auth/ for security issues"
  />
);

// -----------------------------------------------------------------------------
// Pattern 4: Legacy string IDs (deprecated but still supported)
// -----------------------------------------------------------------------------

const LegacyTask = () => (
  <TaskDef
    name="legacy-task"
    subject="Legacy task"
    description="Using string IDs (deprecated)"
    blockedByIds={['1', '2']} // Deprecated - use blockedBy with TaskRef
  />
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Pattern 1 (TypeSafeExample) renders to:
 *
 * ```markdown
 * - **#1 Research OAuth providers** (`research`)
 *   - Description: Research OAuth2 best practices and compare Google, GitHub, and Auth0
 *   - Active Form: "Researching OAuth..."
 *
 * ```javascript
 * TaskCreate({
 *   subject: "Research OAuth providers",
 *   description: "Research OAuth2 best practices and compare Google, GitHub, and Auth0",
 *   activeForm: "Researching OAuth..."
 * })
 * ```
 *
 * - **#2 Create implementation plan** (`plan`)
 *   - Description: Design OAuth implementation based on research findings
 *   - Active Form: "Planning..."
 *   - Blocked By: #1 (research)
 *
 * ```javascript
 * TaskCreate({
 *   subject: "Create implementation plan",
 *   description: "Design OAuth implementation based on research findings",
 *   activeForm: "Planning..."
 * })
 *
 * TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
 * ```
 *
 * [... continues for Implement, Test, Review ...]
 * ```
 */

/**
 * Pattern 2 (MultipleDepsExample) - Multiple dependencies render to:
 *
 * ```markdown
 * - **#4 Integration testing** (`integration`)
 *   - Description: Run full integration test suite
 *   - Active Form: "Running integration tests..."
 *   - Blocked By: #1 (frontend), #2 (backend), #3 (database)
 *
 * ```javascript
 * TaskCreate({
 *   subject: "Integration testing",
 *   description: "Run full integration test suite",
 *   activeForm: "Running integration tests..."
 * })
 *
 * TaskUpdate({ taskId: "4", addBlockedBy: ["1", "2", "3"] })
 * ```
 * ```
 */

/**
 * The blockedBy resolution:
 *
 * When you write:
 *   blockedBy={[Frontend, Backend, Database]}
 *
 * It resolves to:
 *   blockedBy: ["1", "2", "3"]  // Using the auto-generated IDs
 *
 * This gives you:
 * - Type safety (can't reference non-existent tasks)
 * - Refactoring support (rename task, references update)
 * - Clear dependency visualization
 */
