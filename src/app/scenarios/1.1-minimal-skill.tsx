/**
 * Scenario 1.1: Execute a Minimal Skill
 *
 * Goal: Confirm that Claude Code recognizes a skill file in `.claude/skills/`
 * and can execute it when invoked with the corresponding slash command.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/1.1-minimal-skill.tsx
 * Output: .claude/skills/hello-test/SKILL.md
 */

import { Skill } from '../../jsx.js';

export default function HelloTestSkill() {
  return (
    <Skill
      name="hello-test"
      description="A minimal test skill to verify Claude Code skill recognition. Use when testing skill invocation."
    >
      <h1>Hello Test Skill</h1>

      <p>
        You have successfully invoked the hello-test skill. This confirms that
        Claude Code correctly recognizes and executes skills from the
        .claude/skills/ directory.
      </p>

      <h2>Your Task</h2>

      <p>Please respond with the following confirmation message:</p>

      <ul>
        <li>Say "Skill invocation successful!"</li>
        <li>Confirm you received these instructions from the hello-test skill</li>
        <li>State the current timestamp</li>
      </ul>
    </Skill>
  );
}
