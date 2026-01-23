/**
 * Scenario 1.2: Execute a Minimal Command
 *
 * Goal: Confirm that Claude Code recognizes a command file in `.claude/commands/`
 * and can execute it when invoked with the corresponding slash command.
 *
 * Run: node dist/cli/index.js build src/app/scenarios/1.2-minimal-command.tsx
 * Output: .claude/commands/hello-command.md
 */

import { Command } from '../../jsx.js';

export default function HelloCommand() {
  return (
    <Command
      name="hello-command"
      description="A minimal test command to verify Claude Code command recognition. Use when testing command invocation."
    >
      <h1>Hello Command</h1>

      <p>
        You have successfully invoked the hello-command. This confirms that
        Claude Code correctly recognizes and executes commands from the
        .claude/commands/ directory.
      </p>

      <h2>Your Task</h2>

      <p>Please respond with the following confirmation message:</p>

      <ul>
        <li>Say "Command invocation successful!"</li>
        <li>Confirm you received these instructions from the hello-command</li>
        <li>State the current timestamp</li>
      </ul>
    </Command>
  );
}
