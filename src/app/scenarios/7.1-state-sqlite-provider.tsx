/**
 * Scenario 7.1: State Component with SQLite Provider
 *
 * Tests that <State> component generates multiple skills for state management:
 * - State generates `{name}.init` skill for table creation
 * - State generates `{name}.read` skill for querying state
 * - State generates `{name}.write` skill for updating state
 * - State generates `{name}.delete` skill for resetting state
 * - Custom <Operation> generates additional skill
 */
import { State, Operation } from '../../jsx.js';

/**
 * Schema for test state (type-only, used for compile-time validation)
 * The State component parses this from TypeScript AST to generate SQL schema
 */
interface TestState {
  /** Counter value for testing */
  counter: number;
  /** Last update timestamp */
  lastUpdated: string;
  /** Current status */
  status: 'active' | 'inactive' | 'pending';
  /** Optional description */
  description: string;
}

/**
 * State component with SQLite provider
 *
 * This generates multiple skill files:
 * - test-state.init.md - CREATE TABLE with TestState schema
 * - test-state.read.md - SELECT with optional field filter
 * - test-state.write.md - UPDATE single field
 * - test-state.delete.md - Reset to defaults
 * - test-state.increment.md - Custom increment operation
 */
export default function TestStateSQLiteProvider() {
  return (
    <State<TestState>
      name="test-state"
      provider="sqlite"
      config={{ database: ".state/test.db" }}
    >
      {/* Custom operation: increment counter */}
      <Operation name="increment">
        {`UPDATE test-state SET counter = counter + $amount, lastUpdated = datetime('now') WHERE rowid = 1`}
      </Operation>

      {/* Custom operation: set status */}
      <Operation name="set-status">
        {`UPDATE test-state SET status = '$new_status', lastUpdated = datetime('now') WHERE rowid = 1`}
      </Operation>
    </State>
  );
}
