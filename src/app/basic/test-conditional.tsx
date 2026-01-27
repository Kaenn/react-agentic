/**
 * Test command for conditional logic
 *
 * Demonstrates:
 * - Basic If with shell test expression
 * - If/Else pair
 * - Nested If within Else
 * - Variable reference in test expression
 */

import { Command, XmlBlock, If, Else, Assign, useVariable, equals, isEmpty } from '../../jsx.js';


export default function TestConditional() {

  const configExists = useVariable("CONFIG_EXISTS");

  const phaseDir = useVariable("PHASE_DIR");

  return (
    <Command name="test-conditional" description="Test conditional logic components">
      <h2>Conditional Logic Test</h2>

      <p>This command tests the If/Else conditional components.</p>

      <XmlBlock name="process">
        <h3>Step 1: Check Configuration</h3>
        <Assign var={configExists} bash={`[ -f .planning/config.json ] && echo "true" || echo "false"`} />

        <If test={equals(configExists, "'true'")}>
          <p>Configuration found. Loading settings from config file.</p>
        </If>
        <Else>
          <p>No configuration found. Using default settings.</p>
        </Else>

        <h3>Step 2: Find Phase Directory</h3>
        <Assign var={phaseDir} bash={`ls -d .planning/phases/\${PHASE}-* 2>/dev/null | head -1`} />

        <If test={isEmpty(phaseDir)}>
          <p>Phase directory not found. Creating new directory.</p>
          <pre><code className="language-bash">mkdir -p .planning/phases/$PHASE-unknown</code></pre>
        </If>
        <Else>
          <p>Using existing phase directory.</p>

          <If test="[ -f $PHASE_DIR/*-CONTEXT.md ]">
            <p>Found context file. Reading prior decisions.</p>
          </If>
        </Else>

        <h3>Step 3: Basic Conditional</h3>
        <If test="[ -d .git ]">
          <p>Git repository detected. Checking status.</p>
          <pre><code className="language-bash">git status</code></pre>
        </If>
      </XmlBlock>
    </Command>
  );
}
