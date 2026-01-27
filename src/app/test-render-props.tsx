import { Command, Markdown } from '../jsx.js';

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
          <p>Command name and description are available in the output.</p>
        </>
      )}
    </Command>
  );
}
