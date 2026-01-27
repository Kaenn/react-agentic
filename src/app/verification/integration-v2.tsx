/**
 * v2.0 Integration Test
 *
 * Purpose: Demonstrate ALL v2.0 features working together in a single command
 *
 * Includes:
 * - Phase 21: Table, List (structured props)
 * - Phase 22: ExecutionContext, SuccessCriteria, OfferNext, XmlSection
 * - Phase 23: Render props context access, If/Else, Loop, Step
 *
 * Run: node dist/cli/index.js build src/app/verification/integration-v2.tsx
 * Output: .claude/commands/integration-v2.md
 */

import {
  Command,
  Table,
  List,
  ExecutionContext,
  SuccessCriteria,
  OfferNext,
  XmlSection,
  If,
  Else,
  Loop,
  Step,
  useVariable,
  fileExists,
} from '../../jsx.js';

// Module-level variable declarations
const mode = useVariable<string>("MODE");
const tasks = useVariable<string[]>("TASKS");

export default function IntegrationV2() {
  return (
    <Command name="integration-v2" description="Demonstrate all v2.0 features in one command">
      {(ctx) => (
        <>
          <h1>v2.0 Feature Integration Test</h1>

          <p>
            This command demonstrates all v2.0 TSX syntax improvements working together.
            It combines structured props, semantic components, and context access patterns.
          </p>

          <p>Command: {ctx.name}</p>
          <p>Output path: {ctx.outputPath}</p>

          <ExecutionContext paths={[
            "docs/getting-started.md",
            "docs/command.md",
            "docs/agent.md",
            ".planning/PROJECT.md",
          ]} />

          <Step name="Gather Information" number={1}>
            <p>Collect project metadata and configuration:</p>

            <Table
              headers={["Field", "Source", "Required"]}
              rows={[
                ["Name", "package.json", "Yes"],
                ["Version", "package.json", "Yes"],
                ["Description", "package.json", "Yes"],
                ["Config", ".env", "No"],
                ["Documentation", "README.md", "No"],
              ]}
              align={["left", "left", "center"]}
            />

            <p>Required fields must be present for build to succeed.</p>
          </Step>

          <Step name="Conditional Processing" number={2} variant="bold">
            <p>Check for configuration and apply appropriate settings:</p>

            <If test="[ -f config.json ]">
              <p>Configuration file found - using custom settings</p>

              <List items={[
                "Load config.json",
                "Validate schema against config.schema.json",
                "Apply custom settings to build process",
                "Log configuration source",
              ]} />
            </If>

            <Else>
              <p>No configuration file - using defaults</p>

              <List ordered items={[
                "Initialize default configuration",
                "Generate config template",
                "Proceed with standard build",
              ]} />
            </Else>
          </Step>

          <Step name="Process Tasks" number={3} variant="xml">
            <p>Execute each task in the task list:</p>

            <Loop items={tasks} as="task">
              <p>Executing task: {task}</p>

              <If test="[ -n ${task} ]">
                <p>Task is valid, proceeding with execution</p>
              </If>
            </Loop>

            <p>Fallback: If no tasks specified, run default task:</p>

            <Loop items={["compile", "test", "bundle"]} as="defaultTask">
              <p>Running default task: {defaultTask}</p>
            </Loop>
          </Step>

          <Step name="Verify Results" number={4}>
            <p>Confirm all success criteria are met:</p>

            <SuccessCriteria items={[
              "All tasks completed without errors",
              "Build artifacts generated in dist/",
              "No TypeScript errors",
              "All tests passed",
              { text: "Performance benchmarks met", checked: false },
              { text: "Documentation updated", checked: false },
            ]} />
          </Step>

          <XmlSection name="guidelines">
            <p>Follow these guidelines during execution:</p>

            <List items={[
              "Use absolute file paths for all operations",
              "Log each step for debugging",
              "Clean up temporary files after completion",
              "Document any deviations from expected behavior",
            ]} />
          </XmlSection>

          <XmlSection name="troubleshooting">
            <h3>Common Issues</h3>

            <Table
              headers={["Issue", "Cause", "Solution"]}
              rows={[
                ["Build fails", "Missing dependencies", "Run npm install"],
                ["Type errors", "Outdated TypeScript", "Update to latest TS version"],
                ["Tests timeout", "Async issues", "Increase timeout in config"],
              ]}
            />
          </XmlSection>

          <OfferNext routes={[
            {
              name: "Deploy",
              path: "/deploy",
              description: "Deploy the built artifacts to production",
            },
            {
              name: "Test",
              path: "/run-tests",
              description: "Run the full test suite with coverage",
            },
            {
              name: "Rollback",
              path: "/rollback",
            },
            {
              name: "Clean",
              path: "/clean",
              description: "Remove build artifacts and temporary files",
            },
          ]} />
        </>
      )}
    </Command>
  );
}
