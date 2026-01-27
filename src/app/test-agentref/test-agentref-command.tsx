/**
 * Test Command - demonstrates AgentRef with loadFromFile pattern
 *
 * This command shows how to use defineAgent() for type-safe agent references
 * combined with loadFromFile for the GSD "load from file" pattern.
 */
import {
  Command,
  XmlBlock,
  Markdown,
  SpawnAgent,
  useOutput,
  OnStatus,
} from '../../jsx.js';
import {
  TestResearcher,
  type TestResearcherInput,
  type TestResearcherOutput,
} from './test-researcher.js';

export default function TestAgentRefCommand() {
  const researchOutput = useOutput<TestResearcherOutput>("test-researcher");

  return (
    <Command
      name="test:agentref"
      description="Test AgentRef with loadFromFile pattern"
      agent="test-orchestrator"
      allowedTools={['Read', 'Task']}
    >
      <XmlBlock name="objective">
        <p>Demonstrate the AgentRef pattern with loadFromFile.</p>
        <p>This command spawns an agent using the GSD "load from file" pattern.</p>
      </XmlBlock>

      <XmlBlock name="process">
        <h2>Step 1: Spawn Research Agent</h2>
        <p>Using AgentRef with loadFromFile:</p>

        {/* Option 1: AgentRef with loadFromFile={true} - uses AgentRef.path */}
        <SpawnAgent
          agent={TestResearcher}
          loadFromFile
          model="sonnet"
          description="Research the topic"
          input={{
            topic: "{user_topic}",
            depth: "deep",
            context: "Testing AgentRef pattern",
          }}
        >
          Research this topic thoroughly and return your findings.
        </SpawnAgent>

        <h2>Step 2: Handle Results</h2>

        <OnStatus output={researchOutput} status="SUCCESS">
          <p>Research complete with {researchOutput.field('confidence')} confidence.</p>
          <p>Findings available for processing.</p>
        </OnStatus>

        <OnStatus output={researchOutput} status="BLOCKED">
          <p>Research blocked. Need more context.</p>
        </OnStatus>

        <OnStatus output={researchOutput} status="ERROR">
          <p>Research failed. Check error details.</p>
        </OnStatus>
      </XmlBlock>

      <XmlBlock name="success_criteria">
        <ul>
          <li>[ ] Agent spawned with loadFromFile pattern</li>
          <li>[ ] subagent_type is "general-purpose"</li>
          <li>[ ] Prompt includes "First, read..." prefix</li>
        </ul>
      </XmlBlock>
    </Command>
  );
}
