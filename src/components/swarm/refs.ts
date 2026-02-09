/**
 * Swarm System References
 *
 * Factory functions for creating type-safe references to tasks, workers, and teams.
 */

import { randomUUID } from 'crypto';
import type { ReactNode } from 'react';
import type { AgentType, PluginAgentType, Model } from './enums.js';

// =============================================================================
// TaskRef
// =============================================================================

/**
 * Type-safe reference to a task.
 * Use defineTask() to create instances.
 */
export interface TaskRef {
  /** Human-readable title (maps to TaskCreate.subject) */
  subject: string;
  /** Short label for mermaid diagrams (derived from subject if not provided) */
  name: string;
  /** UUID for cross-file identity resolution */
  __id: string;
  /** Type guard marker */
  readonly __isTaskRef: true;
}

/**
 * Derives a short name from a subject string.
 * Truncates to 15 chars, lowercases, replaces spaces with hyphens.
 */
function deriveNameFromSubject(subject: string): string {
  return subject
    .slice(0, 15)
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Creates a type-safe task reference.
 *
 * @param subject - Human-readable title for the task
 * @param name - Optional short label for mermaid diagrams (derived if not provided)
 *
 * @example
 * // Simple usage (name derived from subject)
 * const Research = defineTask('Research best practices');
 *
 * // Explicit name for cleaner mermaid labels
 * const Research = defineTask('Research best practices', 'research');
 */
export function defineTask(subject: string, name?: string): TaskRef {
  return {
    subject,
    name: name ?? deriveNameFromSubject(subject),
    __id: randomUUID(),
    __isTaskRef: true,
  };
}

// =============================================================================
// WorkerRef
// =============================================================================

/**
 * Type-safe reference to a worker (Claude Code subagent).
 * Use defineWorker() to create instances.
 */
export interface WorkerRef {
  /** Worker identifier */
  name: string;
  /** Claude Code subagent_type */
  type: string;
  /** Model preference */
  model?: string;
  /** UUID for identity resolution */
  __id: string;
  /** Type guard marker */
  readonly __isWorkerRef: true;
}

/**
 * Creates a type-safe worker reference.
 *
 * @param name - Worker identifier
 * @param type - Claude Code subagent_type. Use AgentType/PluginAgentType enums,
 *   a string literal, or an imported Agent component (resolves name at compile time).
 * @param model - Optional model preference (use Model enum)
 *
 * @example
 * const Explorer = defineWorker('explorer', AgentType.Explore, Model.Haiku);
 * const Security = defineWorker('security', PluginAgentType.SecuritySentinel);
 * // Imported Agent — name resolved at compile time:
 * import CodeReviewer from './agents/code-reviewer';
 * const Reviewer = defineWorker('reviewer', CodeReviewer);
 */
export function defineWorker(
  name: string,
  type: AgentType | PluginAgentType | string | ReactNode,
  model?: Model | string
): WorkerRef {
  return {
    name,
    // When type is a ReactNode (imported Agent), the compiler resolves the
    // agent name from the AST at build time. The runtime value is unused.
    type: type as string,
    model,
    __id: randomUUID(),
    __isWorkerRef: true,
  };
}

// =============================================================================
// TeamRef
// =============================================================================

/**
 * Type-safe reference to a team.
 * Use defineTeam() to create instances.
 */
export interface TeamRef {
  /** Team identifier */
  name: string;
  /** Team members */
  members?: WorkerRef[];
  /** UUID for identity resolution */
  __id: string;
  /** Type guard marker */
  readonly __isTeamRef: true;
}

/**
 * Creates a type-safe team reference.
 *
 * @param name - Team identifier
 * @param members - Optional array of WorkerRef members
 *
 * @example
 * const ReviewTeam = defineTeam('pr-review', [Security, Perf]);
 */
export function defineTeam(name: string, members?: WorkerRef[]): TeamRef {
  return {
    name,
    members,
    __id: randomUUID(),
    __isTeamRef: true,
  };
}
