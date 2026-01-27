/**
 * Test: Render Props Pattern
 *
 * Demonstrates the render props pattern for accessing command context.
 * The {(ctx) => ...} pattern provides access to command metadata
 * that can be interpolated into the output.
 *
 * v2.0 Features Demonstrated:
 * - Render props pattern: {(ctx) => ...} for context access
 * - Context interpolation: ctx.name, ctx.description, ctx.outputPath, ctx.sourcePath
 * - Table component: Display context values in structured format
 * - List component: Enumerate features
 * - ExecutionContext: Reference documentation
 *
 * Run: node dist/cli/index.js build src/app/test-render-props.tsx
 * Output: .claude/commands/test-render-props.md
 */

import { Command, Markdown, Table, List, ExecutionContext } from '../jsx.js';

export default function TestRenderProps() {
  return (
    <Command name="test-render-props" description="Test render props pattern">
      {(ctx) => (
        <>
          <h1>Render Props Test</h1>

          <Markdown>
This command uses the render props pattern to access context.
The context parameter `ctx` gives access to command metadata.
          </Markdown>

          <h2>Context Values</h2>

          <Table
            headers={["Property", "Value"]}
            rows={[
              ["name", ctx.name],
              ["description", ctx.description],
              ["outputPath", ctx.outputPath],
              ["sourcePath", ctx.sourcePath],
            ]}
          />

          <h2>Features Demonstrated</h2>

          <List items={[
            "Render props pattern {(ctx) => ...}",
            "Context interpolation in content",
            "Table component with context values",
            "List component for feature enumeration",
          ]} />

          <ExecutionContext paths={["docs/semantic-components.md"]} />
        </>
      )}
    </Command>
  );
}
