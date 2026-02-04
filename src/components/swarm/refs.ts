/**
 * Swarm System References
 *
 * Factory functions for creating type-safe references to tasks, workers, and teams.
 */

import type { AgentType, PluginAgentType, Model } from './enums.js';

// TaskRef - minimal interface with subject only
export interface TaskRef {
  subject: string;
  readonly __isTaskRef: true;
}

export function defineTask(subject: string): TaskRef {
  return {
    subject,
    __isTaskRef: true,
  };
}

// WorkerRef - maps to Claude Code subagent_type
export interface WorkerRef {
  name: string;
  type: string;
  model?: string;
  readonly __isWorkerRef: true;
}

export function defineWorker(
  name: string,
  type: AgentType | PluginAgentType | string,
  model?: Model | string
): WorkerRef {
  return {
    name,
    type,
    model,
    __isWorkerRef: true,
  };
}

// TeamRef - tracks team membership
export interface TeamRef {
  name: string;
  members?: WorkerRef[];
  readonly __isTeamRef: true;
}

export function defineTeam(name: string, members?: WorkerRef[]): TeamRef {
  return {
    name,
    members,
    __isTeamRef: true,
  };
}
