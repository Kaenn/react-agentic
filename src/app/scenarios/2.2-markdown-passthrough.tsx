/**
 * Scenario 2.2: Markdown Passthrough Content
 *
 * Goal: Confirm that `<Markdown>` components pass through content without
 * transformation, preserving formatting exactly.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/2.2-markdown-passthrough.tsx
 * Output: .claude/skills/markdown-passthrough-test/SKILL.md
 */

import { Skill, Markdown } from '../../jsx.js';

export default function MarkdownPassthroughTestSkill() {
  return (
    <Skill
      name="markdown-passthrough-test"
      description="Test skill to verify Markdown component passes through content without transformation. Use when testing markdown preservation."
    >
      <h1>Markdown Passthrough Content Test</h1>

      <p>
        You have successfully invoked the markdown-passthrough-test skill. This
        skill tests whether the Markdown component preserves formatting exactly
        without transformation.
      </p>

      <h2>Test 1: Code Blocks with Language Tags</h2>

      <Markdown>
{`\`\`\`typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function greet(user: User): string {
  return "Hello, " + user.name + "!";
}
\`\`\``}
      </Markdown>

      <Markdown>
{`\`\`\`bash
#!/bin/bash
echo "Processing files"
ls -la | grep -E "pattern[0-9]+"
\`\`\``}
      </Markdown>

      <h2>Test 2: List Formatting</h2>

      <Markdown>
{`Bullet list:
- First item
- Second item with **bold** and *italic*
- Third item
  - Nested item A
  - Nested item B
    - Deeply nested

Numbered list:
1. Step one
2. Step two
3. Step three
   1. Sub-step 3.1
   2. Sub-step 3.2`}
      </Markdown>

      <h2>Test 3: Special Characters</h2>

      <Markdown>
{`Special characters that must NOT be escaped:
- Dollar sign: $HOME, $USER, $PATH
- Backticks: \`inline code\` and \`\`\`
- Angle brackets: <div>, </span>, <>
- Ampersand: R&D, AT&T
- Asterisks: **bold**, *italic*, a * b * c
- Underscores: __dunder__, _private, snake_case
- Pipes: table | column | separator
- Backslashes: C:\\Users\\path, \\n, \\t`}
      </Markdown>

      <h2>Test 4: Multi-line Content</h2>

      <Markdown>
{`This is line 1.
This is line 2.
This is line 3.

This is a new paragraph after a blank line.

> This is a blockquote
> spanning multiple lines
> with preserved line breaks

| Column A | Column B | Column C |
|----------|----------|----------|
| Value 1  | Value 2  | Value 3  |
| Value 4  | Value 5  | Value 6  |`}
      </Markdown>

      <h2>Validation Instructions</h2>

      <p>
        After analyzing the content above, respond with a YAML block confirming
        each test passed:
      </p>

      <Markdown>
{`\`\`\`yaml
status: SUCCESS
tests:
  code_blocks_with_language_tags:
    typescript_preserved: true/false
    bash_preserved: true/false
    language_tags_visible: true/false
  list_formatting:
    bullet_list_preserved: true/false
    numbered_list_preserved: true/false
    nested_indentation_correct: true/false
  special_characters:
    dollar_signs_not_escaped: true/false
    backticks_preserved: true/false
    angle_brackets_preserved: true/false
    all_special_chars_intact: true/false
  multiline_content:
    line_breaks_preserved: true/false
    blank_lines_preserved: true/false
    blockquote_formatted: true/false
    table_formatted: true/false
markdown_passthrough: PASSED/FAILED
timestamp: "ISO timestamp"
\`\`\``}
      </Markdown>
    </Skill>
  );
}
