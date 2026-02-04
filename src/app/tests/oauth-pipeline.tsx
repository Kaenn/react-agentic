/**
 * Test fixture for TaskDef and TaskPipeline components
 */
import {
  Command,
  defineTask,
  TaskDef,
  TaskPipeline,
} from '../../index.js';

// Define tasks using defineTask factory
const Research = defineTask('Research OAuth providers', 'research');
const Plan = defineTask('Create implementation plan', 'plan');
const Implement = defineTask('Build OAuth2 integration', 'implement');

export default () => (
  <Command name="oauth" description="Implement OAuth2 authentication">
    <h1>OAuth Implementation Pipeline</h1>

    <TaskPipeline title="OAuth Implementation" autoChain>
      <TaskDef
        task={Research}
        description="Research OAuth2 providers and select the best option"
        activeForm="Researching..."
      />
      <TaskDef
        task={Plan}
        description="Create detailed implementation plan based on research"
        activeForm="Planning..."
      />
      <TaskDef
        task={Implement}
        description="Build the OAuth2 integration following the plan"
        activeForm="Building..."
      />
    </TaskPipeline>
  </Command>
);
