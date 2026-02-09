/**
 * OAuth Pipeline Example
 *
 * Demonstrates basic TaskPipeline usage with autoChain for sequential tasks.
 * This is a minimal example showing how to orchestrate a 6-step implementation workflow.
 */
import {
  Command,
  defineTask,
  TaskDef,
  TaskPipeline,
} from '../../index.js';

// Define tasks with explicit names for clean mermaid labels
const Research = defineTask('Research OAuth providers', 'research');
const SelectProvider = defineTask('Select OAuth provider', 'select');
const DesignFlow = defineTask('Design auth flow', 'design');
const ImplementAuth = defineTask('Implement authentication', 'implement');
const AddTests = defineTask('Add integration tests', 'test');
const Documentation = defineTask('Update documentation', 'docs');

export default () => (
  <Command name="oauth-pipeline" description="Implement OAuth2 authentication">
    <h1>OAuth2 Implementation Pipeline</h1>

    <p>
      This pipeline guides the implementation of OAuth2 authentication
      through research, design, implementation, and documentation phases.
    </p>

    <TaskPipeline title="OAuth Implementation" autoChain>
      <TaskDef
        task={Research}
        prompt="Research OAuth2 providers (Google, GitHub, Auth0). Compare features, pricing, and integration complexity."
        activeForm="Researching OAuth providers..."
      />
      <TaskDef
        task={SelectProvider}
        prompt="Based on research, select the best provider for our use case. Document decision rationale."
        activeForm="Selecting provider..."
      />
      <TaskDef
        task={DesignFlow}
        prompt="Design the authentication flow including login, callback, token refresh, and logout."
        activeForm="Designing auth flow..."
      />
      <TaskDef
        task={ImplementAuth}
        prompt="Implement the OAuth2 integration following the designed flow."
        activeForm="Implementing OAuth..."
      />
      <TaskDef
        task={AddTests}
        prompt="Write integration tests for the auth flow including edge cases."
        activeForm="Writing tests..."
      />
      <TaskDef
        task={Documentation}
        prompt="Update API docs and add authentication guide for developers."
        activeForm="Updating docs..."
      />
    </TaskPipeline>
  </Command>
);
