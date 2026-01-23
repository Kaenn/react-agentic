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
  Markdown,
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
      <Markdown>
{`# useStateRef Declaration Test

This command validates that \`useStateRef()\` correctly creates state references.

## Test Criteria

1. **State Reference Created**: useStateRef returns a StateRef object
2. **Key Property Accessible**: The key property contains the state identifier
3. **Type Parameter**: TypeScript generics provide compile-time type safety
4. **Multiple Coexistence**: Multiple useStateRef calls can coexist

## Validation Instructions

When Claude runs this command, it should:

1. Confirm that state references were created for:
   - project-context (ProjectState schema)
   - user-preferences (UserPreferences schema)
   - session-data (SessionState schema)

2. Verify the state-read skill calls reference the correct keys

3. Report the state keys used in each ReadState operation

## State Operations

### Test 1: First State Reference (project-context)
`}
      </Markdown>

      {/* Read from first state - demonstrates key property is accessible */}
      <ReadState state={projectState} into={projectName} field="name" />

      <Markdown>
{`
### Test 2: Second State Reference (user-preferences)
`}
      </Markdown>

      {/* Read from second state - demonstrates multiple refs coexist */}
      <ReadState state={userPrefs} into={userTheme} field="theme" />

      <Markdown>
{`
### Test 3: Third State Reference (session-data)
`}
      </Markdown>

      {/* Read from third state - demonstrates three refs working */}
      <ReadState state={sessionState} into={sessionUserId} field="userId" />

      <Markdown>
{`
### Test 4: Full State Read (demonstrates key without field)
`}
      </Markdown>

      {/* Read full state without field - shows key is used directly */}
      <ReadState state={projectState} into={readResult} />

      <Markdown>
{`
### Test 5: Write Operation (confirms key accessible for writes)
`}
      </Markdown>

      {/* Write to state - confirms key property works for writes */}
      <WriteState
        state={userPrefs}
        field="theme"
        value="dark"
      />

      <Markdown>
{`
## Expected Output Format

After running this command, report your findings in this YAML format:

\`\`\`yaml
status: SUCCESS
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
message: "All useStateRef criteria validated successfully"
\`\`\`

**IMPORTANT**: Execute the state-read skill calls shown above. If the state files don't exist, that's expected - the test validates that the correct keys are being referenced, not that data exists.
`}
      </Markdown>
    </Command>
  );
}
