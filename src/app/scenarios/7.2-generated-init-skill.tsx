/**
 * Scenario 7.2: Generated Init Skill
 *
 * Tests that the generated init skill creates the state table with correct schema:
 * - Init skill is invocable as `/{name}.init`
 * - Claude creates the SQLite table
 * - Column types match TypeScript types (number → INTEGER, string → TEXT)
 * - Default values are applied from schema
 */
import { State, Operation } from '../../jsx.js';

/**
 * Schema for init test - includes various TypeScript types to validate SQL mapping
 */
interface InitTestSchema {
  /** Counter value - should map to INTEGER */
  count: number;
  /** Name field - should map to TEXT */
  name: string;
  /** Active flag - should map to INTEGER (0/1) */
  isActive: boolean;
  /** Score with decimal - should map to REAL */
  score: number;
  /** Optional notes - should map to TEXT, nullable */
  notes?: string;
}

/**
 * State component for testing init skill generation
 *
 * This generates init skill that should:
 * - Create table `init-test-state` in SQLite
 * - Map TypeScript types to SQL types correctly
 * - Set up default values for required fields
 */
export default function GeneratedInitSkillTest() {
  return (
    <State<InitTestSchema>
      name="init-test-state"
      provider="sqlite"
      config={{ database: ".state/init-test.db" }}
    >
      {/* Custom operation to verify table structure */}
      <Operation name="verify-schema">
        {`SELECT name, type FROM pragma_table_info('init-test-state')`}
      </Operation>
    </State>
  );
}
