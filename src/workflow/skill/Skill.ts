/**
 * JSX component stubs for react-agentic - Skill components
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Props for the Skill component
 */
export interface SkillProps {
  /** Skill name (directory name, lowercase-hyphenated) */
  name: string;
  /** What the skill does and when to use it */
  description: string;
  /** Prevent Claude from auto-invoking (default: false) */
  disableModelInvocation?: boolean;
  /** Hide from slash-command menu (default: true) */
  userInvocable?: boolean;
  /** Tools allowed without permission prompt */
  allowedTools?: string[];
  /** Argument placeholder hint (e.g., "[filename]") */
  argumentHint?: string;
  /** Model override for skill execution */
  model?: string;
  /** Run in subagent context */
  context?: 'fork';
  /** Subagent type when context='fork' */
  agent?: string;
  /** Skill body content */
  children?: ReactNode;
}

/**
 * Props for the SkillFile component
 */
export interface SkillFileProps {
  /** Output filename (e.g., "reference.md", "examples/basic.md") */
  name: string;
  /** File content */
  children?: ReactNode;
}

/**
 * Props for the SkillStatic component
 */
export interface SkillStaticProps {
  /** Source path relative to TSX file */
  src: string;
  /** Destination path relative to skill directory (defaults to src) */
  dest?: string;
}

/**
 * Skill component - creates a Claude Code skill with SKILL.md and supporting files
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Produces a skill directory at .claude/skills/{name}/.
 *
 * @example
 * <Skill
 *   name="deploy"
 *   description="Deploy the application to production. Use when deploying or releasing code."
 *   disableModelInvocation={true}
 *   allowedTools={['Read', 'Bash(git:*)']}
 *   argumentHint="[environment]"
 * >
 *   <h1>Deploy</h1>
 *   <p>Deploy $ARGUMENTS to the target environment.</p>
 *
 *   <SkillFile name="reference.md">
 *     <p>API reference documentation...</p>
 *   </SkillFile>
 *
 *   <SkillStatic src="scripts/deploy.sh" />
 * </Skill>
 */
export function Skill(_props: SkillProps): null {
  return null;
}

/**
 * SkillFile component - defines a generated file within a skill
 *
 * This is a compile-time component. Must be a child of Skill.
 * Generates a file at .claude/skills/{skill-name}/{name}.
 *
 * @example
 * <SkillFile name="reference.md">
 *   <h1>API Reference</h1>
 *   <p>Detailed documentation...</p>
 * </SkillFile>
 *
 * @example nested path
 * <SkillFile name="examples/basic.md">
 *   <h1>Basic Example</h1>
 * </SkillFile>
 */
export function SkillFile(_props: SkillFileProps): null {
  return null;
}

/**
 * SkillStatic component - copies a static file into a skill
 *
 * This is a compile-time component. Must be a child of Skill.
 * Copies file from src (relative to TSX) to skill directory.
 *
 * @example
 * <SkillStatic src="scripts/deploy.sh" />
 * // Copies to .claude/skills/{skill-name}/scripts/deploy.sh
 *
 * @example with destination override
 * <SkillStatic src="../shared/validate.sh" dest="scripts/validate.sh" />
 * // Copies to .claude/skills/{skill-name}/scripts/validate.sh
 */
export function SkillStatic(_props: SkillStaticProps): null {
  return null;
}
