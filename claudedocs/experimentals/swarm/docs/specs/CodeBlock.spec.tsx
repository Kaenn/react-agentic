/**
 * @component CodeBlock
 * @description Renders a fenced code block with optional title and syntax highlighting
 */

import { CodeLanguage } from './enums';

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface CodeBlockProps {
  /**
   * Programming language for syntax highlighting
   * Use CodeLanguage enum for common languages
   * @default CodeLanguage.JavaScript
   */
  language?: CodeLanguage | string;

  /**
   * Optional title displayed above the code block
   * @optional
   */
  title?: string;

  /**
   * Code content
   * @required
   */
  children: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CodeBlock({ language = 'javascript', title, children }: CodeBlockProps) {
  // Implementation renders to markdown fenced code block
}

// =============================================================================
// USAGE EXAMPLES
// =============================================================================

// Example 1: Simple code block
const SimpleCode = () => (
  <CodeBlock>
    {`Task({
  subagent_type: "Explore",
  description: "Find auth files",
  prompt: "Find all authentication files"
})`}
  </CodeBlock>
);

// Example 2: Code with title
const CodeWithTitle = () => (
  <CodeBlock title="Spawn a teammate">
    {`Task({
  team_name: "my-team",
  name: "worker",
  subagent_type: "general-purpose",
  prompt: "Complete assigned tasks",
  run_in_background: true
})`}
  </CodeBlock>
);

// Example 3: Different languages (using enums)
const BashCode = () => (
  <CodeBlock language={CodeLanguage.Bash} title="Check team status">
    {`# View team config
cat ~/.claude/teams/my-team/config.json | jq '.'

# Check inbox
cat ~/.claude/teams/my-team/inboxes/team-lead.json | jq '.'

# List tasks
ls ~/.claude/tasks/my-team/`}
  </CodeBlock>
);

const JsonCode = () => (
  <CodeBlock language={CodeLanguage.JSON} title="Team config structure">
    {`{
  "name": "my-team",
  "description": "Working on feature X",
  "leadAgentId": "team-lead@my-team",
  "members": [
    {
      "agentId": "worker-1@my-team",
      "name": "worker-1",
      "agentType": "general-purpose"
    }
  ]
}`}
  </CodeBlock>
);

const MermaidCode = () => (
  <CodeBlock language={CodeLanguage.Mermaid} title="Workflow diagram">
    {`flowchart LR
    A[Create Team] --> B[Spawn Workers]
    B --> C[Work]
    C --> D[Cleanup]`}
  </CodeBlock>
);

// Example 4: Multiline with complex formatting (using enum)
const ComplexCode = () => (
  <CodeBlock language={CodeLanguage.JavaScript} title="Full workflow example">
    {`// 1. Create team
Teammate({
  operation: "spawnTeam",
  team_name: "code-review",
  description: "Reviewing PR #123"
})

// 2. Spawn specialists in parallel
Task({
  team_name: "code-review",
  name: "security",
  subagent_type: "security-sentinel",
  prompt: \`Review for security vulnerabilities.

Focus on:
- SQL injection
- XSS attacks
- Auth bypass\`,
  run_in_background: true
})

Task({
  team_name: "code-review",
  name: "performance",
  subagent_type: "performance-oracle",
  prompt: "Review for performance issues",
  run_in_background: true
})

// 3. Wait for results and cleanup
// ... monitor inbox ...
Teammate({ operation: "cleanup" })`}
  </CodeBlock>
);

// =============================================================================
// MARKDOWN OUTPUT
// =============================================================================

/**
 * Example 1 renders to:
 *
 * ```markdown
 * ```javascript
 * Task({
 *   subagent_type: "Explore",
 *   description: "Find auth files",
 *   prompt: "Find all authentication files"
 * })
 * ```
 * ```
 */

/**
 * Example 2 renders to:
 *
 * ```markdown
 * **Spawn a teammate:**
 * ```javascript
 * Task({
 *   team_name: "my-team",
 *   name: "worker",
 *   subagent_type: "general-purpose",
 *   prompt: "Complete assigned tasks",
 *   run_in_background: true
 * })
 * ```
 * ```
 */

/**
 * Example 3 (bash) renders to:
 *
 * ```markdown
 * **Check team status:**
 * ```bash
 * # View team config
 * cat ~/.claude/teams/my-team/config.json | jq '.'
 *
 * # Check inbox
 * cat ~/.claude/teams/my-team/inboxes/team-lead.json | jq '.'
 *
 * # List tasks
 * ls ~/.claude/tasks/my-team/
 * ```
 * ```
 */

/**
 * Example 3 (json) renders to:
 *
 * ```markdown
 * **Team config structure:**
 * ```json
 * {
 *   "name": "my-team",
 *   "description": "Working on feature X",
 *   "leadAgentId": "team-lead@my-team",
 *   "members": [
 *     {
 *       "agentId": "worker-1@my-team",
 *       "name": "worker-1",
 *       "agentType": "general-purpose"
 *     }
 *   ]
 * }
 * ```
 * ```
 */

// =============================================================================
// COMMON LANGUAGES
// =============================================================================

/**
 * | Language | Use For |
 * |----------|---------|
 * | javascript | Task, Teammate, TaskCreate calls |
 * | json | Config files, message formats |
 * | bash | Shell commands, file operations |
 * | mermaid | Diagrams (flowchart, sequence) |
 * | typescript | Type definitions |
 * | markdown | Documentation examples |
 */
