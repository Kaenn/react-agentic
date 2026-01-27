import { Command, XmlBlock, Markdown } from '../../jsx.js';

const AGENT_PATHS = {
  researcher: '/path/to/researcher.md',
} as const;

export default function TestConcatCommand() {
  return (
    <Command
      name="test:concat"
      description="Test string concatenation in Markdown"
    >
      <XmlBlock name="test">
        <p>Before concat test</p>
        <Markdown>{`
\`\`\`
Task(
  prompt="First, read ` + AGENT_PATHS.researcher + ` for your role",
  subagent_type="general-purpose"
)
\`\`\`
`}</Markdown>
        <p>After concat test</p>
      </XmlBlock>
    </Command>
  );
}
