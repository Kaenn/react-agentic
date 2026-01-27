/**
 * Verification Test: Step Component Variants
 *
 * Purpose: Verify Step component emits all three variants correctly
 *
 * Run: node dist/cli/index.js build src/app/verification/test-step.tsx
 * Output: .claude/commands/test-step.md
 */

import { Command, Step } from '../../jsx.js';

export default function TestStep() {
  return (
    <Command name="test-step" description="Verify Step component variants">
      <h1>Step Component Variant Tests</h1>

      <p>
        This test validates that the Step component emits all three variants
        (heading, bold, xml) with correct formatting and numbering.
      </p>

      <h2>Variant 1: Default (Heading)</h2>

      <p>Default variant should emit as Markdown heading:</p>

      <Step name="Initialize" number={1}>
        <p>Set up the environment</p>
        <p>Install dependencies</p>
      </Step>

      <Step name="Execute" number={2}>
        <p>Run the main task</p>
        <p>Collect results</p>
      </Step>

      <Step name="Finalize" number={3}>
        <p>Clean up temporary files</p>
      </Step>

      <h2>Variant 2: Bold</h2>

      <p>Bold variant should emit as bold markdown text:</p>

      <Step name="Setup" number={1} variant="bold">
        <p>Bold step content goes here</p>
        <p>This should appear after bold step marker</p>
      </Step>

      <Step name="Process" number={2} variant="bold">
        <p>Processing with bold variant</p>
      </Step>

      <h2>Variant 3: XML</h2>

      <p>XML variant should emit as step element:</p>

      <Step name="Configure" number={1} variant="xml">
        <p>XML wrapped step content</p>
        <p>Multiple paragraphs in XML step</p>
      </Step>

      <Step name="Deploy" number={2} variant="xml">
        <p>Deployment steps in XML format</p>
      </Step>

      <h2>Mixed Variants in Sequence</h2>

      <p>Different variants can be used in the same command:</p>

      <Step name="First Task" number={1} variant="heading">
        <p>Heading style step</p>
      </Step>

      <Step name="Second Task" number={2} variant="bold">
        <p>Bold style step</p>
      </Step>

      <Step name="Third Task" number={3} variant="xml">
        <p>XML style step</p>
      </Step>

      <h2>Expected Output Patterns</h2>

      <ul>
        <li>Heading variant: <code>### Step N: Name</code></li>
        <li>Bold variant: <code>**Step N: Name**</code></li>
        <li>XML variant: <code>&lt;step number="N" name="Name"&gt;</code></li>
        <li>Children should follow the step marker</li>
      </ul>

      <h2>Validation</h2>

      <p>Check the generated markdown for:</p>

      <ol>
        <li>Heading variant produces level 3 headings</li>
        <li>Bold variant produces bold text markers</li>
        <li>XML variant produces step elements with number and name attributes</li>
        <li>Step numbers are preserved correctly</li>
        <li>Step names are preserved correctly</li>
        <li>Children content appears after the step marker</li>
      </ol>
    </Command>
  );
}
