/**
 * Swarm System
 *
 * Type-safe references for orchestrating Claude Code agents.
 */

// Enums
export { AgentType, PluginAgentType, Model } from './enums.js';

// Refs + Factories
export { defineTask, defineWorker, defineTeam } from './refs.js';
export type { TaskRef, WorkerRef, TeamRef } from './refs.js';

// Guards
export { isTaskRef, isWorkerRef, isTeamRef } from './guards.js';
