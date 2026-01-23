/**
 * Scenario 2.1: XmlBlock Structured Sections
 *
 * Goal: Confirm that `<XmlBlock>` components render as proper XML-style sections
 * that Claude can parse as structured instructions.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/2.1-xmlblock-sections.tsx
 * Output: .claude/skills/xmlblock-test/SKILL.md
 */

import { Skill, XmlBlock } from '../../jsx.js';

export default function XmlBlockTestSkill() {
  return (
    <Skill
      name="xmlblock-test"
      description="Test skill to verify XmlBlock renders as structured XML sections. Use when testing XmlBlock parsing."
    >
      <h1>XmlBlock Structured Sections Test</h1>

      <p>
        You have successfully invoked the xmlblock-test skill. This skill tests
        whether XmlBlock components render correctly and are interpreted as
        structured sections.
      </p>

      <XmlBlock name="objective">
        Your objective is to analyze this skill's structure and confirm that you
        can identify each XmlBlock section as a distinct logical unit. You should
        be able to see this text wrapped in objective tags.
      </XmlBlock>

      <XmlBlock name="constraints">
        <ul>
          <li>You must respond in a structured format</li>
          <li>You must reference each XmlBlock section by name</li>
          <li>You must confirm the nesting is preserved</li>
        </ul>
      </XmlBlock>

      <XmlBlock name="output-format">
        <p>Please respond with a YAML block containing:</p>
        <pre><code className="language-yaml">{`status: SUCCESS
sections_found:
  - name: objective
    content_preview: "first 20 chars of content..."
  - name: constraints
    content_preview: "first 20 chars of content..."
  - name: output-format
    content_preview: "first 20 chars of content..."
nested_content_preserved: true/false
xmlblock_rendering: PASSED/FAILED
timestamp: "ISO timestamp"`}</code></pre>
      </XmlBlock>

      <h2>Validation Instructions</h2>

      <p>
        After analyzing the structure above, confirm the following:
      </p>

      <ol>
        <li>Each XmlBlock rendered as &lt;tagname&gt;content&lt;/tagname&gt;</li>
        <li>You interpreted each section as structured instructions</li>
        <li>Multiple XmlBlocks were treated as separate logical sections</li>
        <li>Nested content (lists, paragraphs) within XmlBlock was preserved</li>
      </ol>
    </Skill>
  );
}
