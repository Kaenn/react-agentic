/**
 * State Demo Command
 *
 * Demonstrates the state system: useStateRef, ReadState, WriteState
 */
import {
  Command,
  useVariable,
  useStateRef,
  Assign,
  ReadState,
  WriteState,
  If,
  Else,
  Markdown,
  equals,
} from '../jsx.js';

// Define the state schema (compile-time only)
interface ProjectState {
  name: string;
  phase: number;
  config: {
    debug: boolean;
    outputDir: string;
  };
}

export default function StateDemo() {
  // Declare state reference
  const projectState = useStateRef<ProjectState>('projectContext');

  // Variables to store read results
  const currentPhase = useVariable('CURRENT_PHASE');
  const projectName = useVariable('PROJECT_NAME');
  const fullState = useVariable('FULL_STATE');

  return (
    <Command
      name="state-demo"
      description="Demonstrate state system features"
    >
      <Markdown>
{`# State System Demo

This command demonstrates reading and writing typed state.

## Read Operations
`}
      </Markdown>

      {/* Read a specific field */}
      <ReadState state={projectState} into={currentPhase} field="phase" />

      {/* Read another field */}
      <ReadState state={projectState} into={projectName} field="name" />

      {/* Read full state */}
      <ReadState state={projectState} into={fullState} />

      <Markdown>
{`
## Write Operations
`}
      </Markdown>

      {/* Write a single field */}
      <WriteState
        state={projectState}
        field="phase"
        value="2"
      />

      {/* Write nested field */}
      <WriteState
        state={projectState}
        field="config.debug"
        value="true"
      />

      {/* Merge partial update */}
      <WriteState
        state={projectState}
        merge={{ name: 'Updated Project', phase: 3 }}
      />

      <Markdown>
{`
## Conditional State Usage
`}
      </Markdown>

      <Assign var={currentPhase} bash="echo $CURRENT_PHASE" />

      <If test={equals(currentPhase, '"0"')}>
        <Markdown>
{`
Project not started. Initialize state first.
`}
        </Markdown>
      </If>
      <Else>
        <Markdown>
{`
Project is at phase $CURRENT_PHASE.
`}
        </Markdown>
      </Else>
    </Command>
  );
}
