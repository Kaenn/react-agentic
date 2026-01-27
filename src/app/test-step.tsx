import { Command, Step, Markdown } from '../jsx.js';

export default function TestStep() {
  return (
    <Command name="test-step" description="Test Step component variants">
      <h1>Step Component Test</h1>

      <Markdown>
## Heading Variant (default)
      </Markdown>

      <Step number={1} name="Setup Environment">
        <p>Install dependencies and configure your development environment.</p>
      </Step>

      <Step number={2} name="Configure Settings">
        <p>Update the configuration file with your settings.</p>
      </Step>

      <Markdown>
## Bold Variant
      </Markdown>

      <Step number={3} name="Build Project" variant="bold">
        <p>Run the build command to compile the project.</p>
      </Step>

      <Step number={4} name="Run Tests" variant="bold">
        <p>Execute the test suite to verify functionality.</p>
      </Step>

      <Markdown>
## XML Variant
      </Markdown>

      <Step number={5} name="Deploy" variant="xml">
        <p>Deploy the application to production.</p>
      </Step>

      <Markdown>
## Sub-steps (using string number)
      </Markdown>

      <Step number="1.1" name="Install Node.js">
        <p>Download and install Node.js from nodejs.org.</p>
      </Step>

      <Step number="1.2" name="Install npm packages">
        <p>Run npm install in the project directory.</p>
      </Step>
    </Command>
  );
}
