/**
 * Example: RuntimeFn.Call with RuntimeVar Arguments
 *
 * Demonstrates proper handling of:
 * - RuntimeVar references in args (ctx.phaseId)
 * - Nested property access (ctx.config.settings.mode)
 * - Ternary expressions (ctx.flag ? 'a' : 'b')
 * - Comparison expressions (status === 'PASSED')
 * - Logical expressions (flagA || flagB)
 */

import {
  Command,
  useRuntimeVar,
  runtimeFn,
  If,
  Else,
} from '../jsx.js';

// Type definitions
interface ProjectContext {
  projectId: string;
  projectName: string;
  config: {
    settings: {
      mode: 'development' | 'production';
      verbose: boolean;
    };
  };
  flags: {
    dryRun: boolean;
    force: boolean;
  };
}

interface TaskStatus {
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  message?: string;
}

interface BuildArgs {
  projectId: string;
  projectName: string;
  mode: string;
  verbose: boolean;
  shouldForce: boolean;
  isPassed: boolean;
}

interface BuildResult {
  success: boolean;
  output?: string;
  error?: string;
}

// Runtime function
async function buildProject(args: BuildArgs): Promise<BuildResult> {
  console.log(`Building project ${args.projectId} (${args.projectName})`);
  console.log(`Mode: ${args.mode}, Verbose: ${args.verbose}`);
  console.log(`Force: ${args.shouldForce}, Previous passed: ${args.isPassed}`);

  // Simulate build
  return {
    success: true,
    output: `Built ${args.projectName} in ${args.mode} mode`,
  };
}

const Build = runtimeFn(buildProject);

export default (
  <Command name="example-runtime-args" description="Example showing RuntimeVar args handling">
    {() => {
      const ctx = useRuntimeVar<ProjectContext>('CTX');
      const taskStatus = useRuntimeVar<TaskStatus>('TASK_STATUS');
      const result = useRuntimeVar<BuildResult>('RESULT');

      return (
        <>
          <h2>RuntimeFn.Call with RuntimeVar Arguments</h2>

          This example demonstrates how RuntimeVar references are properly
          handled in RuntimeFn.Call arguments:

          - **Simple reference**: `ctx.projectId` → CTX.projectId
          - **Nested access**: `ctx.config.settings.mode` → CTX.config.settings.mode
          - **Ternary**: `ctx.flags.dryRun ? 'dry' : 'live'` → descriptive text
          - **Comparison**: `taskStatus.status === 'PASSED'` → descriptive text
          - **Logical OR**: `ctx.flags.dryRun || ctx.flags.force` → descriptive text

          <h3>Execute Build</h3>

          <Build.Call
            args={{
              // Simple RuntimeVar reference
              projectId: ctx.projectId,
              projectName: ctx.projectName,

              // Nested property access
              mode: ctx.config.settings.mode,
              verbose: ctx.config.settings.verbose,

              // Logical OR expression
              shouldForce: ctx.flags.dryRun || ctx.flags.force,

              // Comparison expression
              isPassed: taskStatus.status === 'PASSED',
            }}
            output={result}
          />

          <If condition={result.success}>
            **Build succeeded!**

            Output: The build completed successfully.
          </If>
          <Else>
            **Build failed**

            Check the error message for details.
          </Else>
        </>
      );
    }}
  </Command>
);
