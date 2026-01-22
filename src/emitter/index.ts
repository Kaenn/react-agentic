/**
 * Emitter Module - Markdown emission from IR
 *
 * Exports the MarkdownEmitter class and convenience emit function.
 */

export { emit, emitAgent, emitSkill, emitSkillFile, MarkdownEmitter } from './emitter.js';
export { emitSettings, mergeSettings } from './settings.js';
export { emitState, generateMainInitSkill, type StateEmitResult } from './state-emitter.js';
