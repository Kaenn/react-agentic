import {
  Command,
  ExecutionContext,
  SuccessCriteria,
  OfferNext,
  XmlSection,
  DeviationRules,
  CommitRules,
  WaveExecution,
  CheckpointHandling
} from '../../jsx.js';

export default function TestSemanticComponents() {
  return (
    <Command name="test-semantic-components" description="Verify semantic component XML output">
      <h2>Test 1: ExecutionContext with Default Prefix</h2>
      <ExecutionContext paths={["workflow.md", "config.json", "deep/nested/file.tsx"]} />

      <h2>Test 2: ExecutionContext with Custom Prefix</h2>
      <ExecutionContext paths={["file.md", "another.ts"]} prefix="#" />

      <h2>Test 3: SuccessCriteria - String Items (Unchecked)</h2>
      <SuccessCriteria items={["Build passes", "Tests pass", "Lint succeeds"]} />

      <h2>Test 4: SuccessCriteria - Object Items (Mixed Checked)</h2>
      <SuccessCriteria items={[
        { text: "Completed item", checked: true },
        { text: "Pending item", checked: false },
        { text: "Another completed", checked: true }
      ]} />

      <h2>Test 5: OfferNext with Full Routes</h2>
      <OfferNext routes={[
        { name: "Continue", path: "/next", description: "Proceed to next step" },
        { name: "Back", path: "/previous", description: "Return to previous step" },
        { name: "Cancel", path: "/cancel" }
      ]} />

      <h2>Test 6: XmlSection with Dynamic Name</h2>
      <XmlSection name="custom_section">
        <p>Content inside custom XML section</p>
        <p>Multiple paragraphs supported</p>
      </XmlSection>

      <h2>Test 7: DeviationRules Wrapper</h2>
      <DeviationRules>
        <p>Rules for deviation handling</p>
        <List items={["Rule 1: Auto-fix bugs", "Rule 2: Ask for architecture"]} />
      </DeviationRules>

      <h2>Test 8: CommitRules Wrapper</h2>
      <CommitRules>
        <p>Rules for creating commits</p>
        <p>Atomic commits per task</p>
      </CommitRules>

      <h2>Test 9: WaveExecution Wrapper</h2>
      <WaveExecution>
        <p>Wave execution instructions</p>
        <p>Execute in dependency order</p>
      </WaveExecution>

      <h2>Test 10: CheckpointHandling Wrapper</h2>
      <CheckpointHandling>
        <p>Checkpoint handling rules</p>
        <List items={["Stop at checkpoints", "Return structured state"]} ordered />
      </CheckpointHandling>
    </Command>
  );
}
