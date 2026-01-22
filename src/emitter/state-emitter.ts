/**
 * State Emitter
 *
 * Generates multiple skill files from a StateDocumentNode.
 * Uses provider templates for storage-specific code generation.
 */

import type { StateDocumentNode } from '../ir/nodes.js';
import { getProviderAsync, type GeneratedSkill, type ProviderContext } from '../providers/index.js';

/**
 * Result of emitting a State component
 */
export interface StateEmitResult {
  /** All generated skill files */
  skills: GeneratedSkill[];
  /** State name (for main init tracking) */
  stateName: string;
}

/**
 * Emit a StateDocumentNode to multiple skill files
 *
 * Generates:
 * - {state}.init.md - Schema/table creation
 * - {state}.read.md - Read state with optional field filter
 * - {state}.write.md - Update state field
 * - {state}.delete.md - Reset state to defaults
 * - {state}.{operation}.md - Custom operations
 *
 * @param doc - The state document node from transformer
 * @returns Array of generated skill files and state name
 */
export async function emitState(doc: StateDocumentNode): Promise<StateEmitResult> {
  const { state } = doc;

  // Get provider template (async to ensure provider is loaded)
  const provider = await getProviderAsync(state.provider);

  // Build provider context
  const ctx: ProviderContext = {
    stateName: state.name,
    database: state.config.database,
    schema: state.schema
  };

  const skills: GeneratedSkill[] = [];

  // Generate CRUD skills
  skills.push(provider.generateInit(ctx));
  skills.push(provider.generateRead(ctx));
  skills.push(provider.generateWrite(ctx));
  skills.push(provider.generateDelete(ctx));

  // Generate custom operations
  for (const operation of state.operations) {
    skills.push(provider.generateOperation(ctx, operation));
  }

  return { skills, stateName: state.name };
}

/**
 * Generate a main init skill that invokes all state init skills
 *
 * This skill allows initializing all state tables with a single command.
 *
 * @param stateNames - Array of state names that have been generated
 * @returns Generated skill for init:all
 */
export function generateMainInitSkill(stateNames: string[]): GeneratedSkill {
  const invocations = stateNames.map(name => `# Initialize ${name} state
echo "Initializing ${name}..."
# Note: Claude will invoke /${name}:init skill`).join('\n\n');

  const skillList = stateNames.map(name => `- \`/${name}:init\``).join('\n');

  const content = `---
name: init.all
description: Initialize all state tables. Run once to set up all state storage.
allowed-tools:
  - Bash(sqlite3:*)
  - Bash(mkdir:*)
---

# Initialize All State

Initialize all registered state tables in the project.

## State Skills

This skill orchestrates the following init skills:

${skillList}

## Usage

Run this skill once when setting up a new project or after adding new state definitions.

## Process

The following state tables will be initialized:

${invocations}

**Note:** This skill should invoke each state's init skill in sequence. Claude should run each \`/{state}:init\` skill listed above.
`;

  return {
    filename: 'init.all.md',
    content
  };
}
