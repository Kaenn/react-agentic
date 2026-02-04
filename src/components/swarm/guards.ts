/**
 * Swarm System Type Guards
 *
 * Runtime type guards for discriminating between ref types.
 */

import type { TaskRef, WorkerRef, TeamRef } from './refs.js';

export function isTaskRef(value: unknown): value is TaskRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isTaskRef' in value &&
    (value as TaskRef).__isTaskRef === true
  );
}

export function isWorkerRef(value: unknown): value is WorkerRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isWorkerRef' in value &&
    (value as WorkerRef).__isWorkerRef === true
  );
}

export function isTeamRef(value: unknown): value is TeamRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__isTeamRef' in value &&
    (value as TeamRef).__isTeamRef === true
  );
}
