/**
 * Scenario 7.5: Custom Operation Skill
 *
 * Tests that <Operation> inside State generates custom SQL operation skills:
 * - Operation skill is invocable as `/{state-name}.{operation}`
 * - SQL template is correctly parameterized
 * - $variable placeholders become skill arguments
 * - Claude executes the SQL correctly
 */
import { State, Operation } from '../../jsx.js';

/**
 * Schema for task tracking state
 */
interface TaskState {
  /** Task identifier */
  taskId: string;
  /** Task title */
  title: string;
  /** Priority level (1-5) */
  priority: number;
  /** Completion percentage (0-100) */
  progress: number;
  /** Task status */
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  /** Assigned user */
  assignee: string;
  /** Last modification timestamp */
  lastModified: string;
}

/**
 * State component with multiple custom operations to test:
 * - Single $variable placeholder
 * - Multiple $variable placeholders
 * - Computed SQL expressions
 * - String vs numeric arguments
 */
export default function CustomOperationSkillTest() {
  return (
    <State<TaskState>
      name="task-state"
      provider="sqlite"
      config={{ database: ".state/task-test.db" }}
    >
      {/* Test 1: Single variable placeholder - string argument */}
      <Operation name="assign">
        {`UPDATE task-state SET assignee = '$user', lastModified = datetime('now') WHERE rowid = 1`}
      </Operation>

      {/* Test 2: Single variable placeholder - numeric argument */}
      <Operation name="set-priority">
        {`UPDATE task-state SET priority = $level, lastModified = datetime('now') WHERE rowid = 1`}
      </Operation>

      {/* Test 3: Multiple variable placeholders */}
      <Operation name="update-progress">
        {`UPDATE task-state SET progress = $percent, status = '$new_status', lastModified = datetime('now') WHERE rowid = 1`}
      </Operation>

      {/* Test 4: Computed expression with variable */}
      <Operation name="increment-progress">
        {`UPDATE task-state SET progress = MIN(100, progress + $amount), lastModified = datetime('now') WHERE rowid = 1`}
      </Operation>

      {/* Test 5: Variable in WHERE clause */}
      <Operation name="complete-if-done">
        {`UPDATE task-state SET status = 'completed', lastModified = datetime('now') WHERE rowid = 1 AND progress >= $threshold`}
      </Operation>
    </State>
  );
}
