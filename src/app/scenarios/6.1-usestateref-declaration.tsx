/**
 * Scenario 6.1: useStateRef Declaration
 *
 * Tests that useStateRef() creates a state reference with:
 * - State reference object returned
 * - Accessible key property
 * - Type parameter for compile-time type safety
 * - Multiple state references can coexist
 */
import {
  Command,
  useVariable,
  useStateRef,
  Assign,
  ReadState,
  WriteState,
  XmlBlock,
  If,
  notEmpty,
} from '../../jsx.js';

// Define typed schemas (compile-time only)
interface ProjectState {
  name: string;
  version: string;
  phase: number;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
}

interface SessionState {
  lastAccess: string;
  userId: string;
}

export default function UseStateRefDeclaration() {
  // Criterion 1: useStateRef creates a state reference
  const projectState = useStateRef<ProjectState>('project-context');

  // Criterion 4: Multiple state references can coexist
  const userPrefs = useStateRef<UserPreferences>('user-preferences');
  const sessionState = useStateRef<SessionState>('session-data');

  // Variables for reading state
  const projectName = useVariable('PROJECT_NAME');
  const userTheme = useVariable('USER_THEME');
  const sessionUserId = useVariable('SESSION_USER_ID');
  const readResult = useVariable('READ_RESULT');

  return (
    <Command
      name="6.1-usestateref-declaration"
      description="Test useStateRef hook for state reference declaration"
    >
      <h1>useStateRef Declaration Test</h1>

      <p>This command validates that <code>useStateRef()</code> correctly creates state references.</p>

      <h2>Test Criteria</h2>

      <ol>
        <li><strong>State Reference Created</strong>: useStateRef returns a StateRef object</li>
        <li><strong>Key Property Accessible</strong>: The key property contains the state identifier</li>
        <li><strong>Type Parameter</strong>: TypeScript generics provide compile-time type safety</li>
        <li><strong>Multiple Coexistence</strong>: Multiple useStateRef calls can coexist</li>
      </ol>

      <h2>Validation Instructions</h2>

      <p>When Claude runs this command, it should:</p>

      <ol>
        <li>
          Confirm that state references were created for:
          <ul>
            <li>project-context (ProjectState schema)</li>
            <li>user-preferences (UserPreferences schema)</li>
            <li>session-data (SessionState schema)</li>
          </ul>
        </li>
        <li>Verify the state-read skill calls reference the correct keys</li>
        <li>Report the state keys used in each ReadState operation</li>
      </ol>

      <h2>State Operations</h2>

      <h3>Test 1: First State Reference (project-context)</h3>

      {/* Read from first state - demonstrates key property is accessible */}
      <ReadState state={projectState} into={projectName} field="name" />

      <h3>Test 2: Second State Reference (user-preferences)</h3>

      {/* Read from second state - demonstrates multiple refs coexist */}
      <ReadState state={userPrefs} into={userTheme} field="theme" />

      <h3>Test 3: Third State Reference (session-data)</h3>

      {/* Read from third state - demonstrates three refs working */}
      <ReadState state={sessionState} into={sessionUserId} field="userId" />

      <h3>Test 4: Full State Read (demonstrates key without field)</h3>

      {/* Read full state without field - shows key is used directly */}
      <ReadState state={projectState} into={readResult} />

      <h3>Test 5: Write Operation (confirms key accessible for writes)</h3>

      {/* Write to state - confirms key property works for writes */}
      <WriteState
        state={userPrefs}
        field="theme"
        value="dark"
      />

      <h2>Expected Output Format</h2>

      <p>After running this command, report your findings in this YAML format:</p>

      <XmlBlock name="expected-output">
{`status: SUCCESS
test_results:
  state_reference_created: true  # StateRef objects returned from useStateRef
  key_property_accessible: true  # key property used in state-read/write calls
  type_parameter_works: true     # No TypeScript errors (compile-time check)
  multiple_refs_coexist: true    # All 3 state references work independently
state_keys_found:
  - project-context
  - user-preferences
  - session-data
operations_executed:
  - "state-read project-context --field name"
  - "state-read user-preferences --field theme"
  - "state-read session-data --field userId"
  - "state-read project-context (full)"
  - "state-write user-preferences --field theme --value dark"
message: "All useStateRef criteria validated successfully"`}
      </XmlBlock>

      <p>
        <strong>IMPORTANT</strong>: Execute the state-read skill calls shown above. If the state files don't exist, that's expected - the test validates that the correct keys are being referenced, not that data exists.
      </p>
    </Command>
  );
}
