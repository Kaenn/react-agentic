/**
 * Emitter Module - Markdown emission from IR
 *
 * Exports the MarkdownEmitter class and convenience emit function.
 */

export { emit, emitAgent, emitSkill, emitSkillFile, MarkdownEmitter } from './emitter.js';
export { emitSettings, mergeSettings } from './settings.js';
export { emitState, generateMainInitSkill, type StateEmitResult } from './state-emitter.js';

// Runtime Emitters
export { emitDocument, RuntimeMarkdownEmitter } from './runtime-markdown-emitter.js';
export {
  emitRuntime,
  generateRuntime,
  mergeRuntimeResults,
  extractFunctions,
  extractConstants,
  extractFromImports,
  isRuntimeFile,
  type ExtractedFunction,
  type ExtractedConstant,
  type RuntimeEmitResult,
  type ExtractFromImportsResult,
} from './runtime-emitter.js';
export {
  bundleRuntimeFile,
  bundleSingleEntryRuntime,
  bundleCodeSplit,
  mergeAndWrapRuntimes,
  extractExportedFunctionNames,
  generateRuntimeEntryPoint,
  generateNamespaceEntry,
  generateDispatcher,
  wrapWithCLI,
  type BundledRuntime,
  type BundleRuntimeOptions,
  type MergedRuntimeResult,
  type RuntimeFileInfo,
  type SingleEntryBundleOptions,
  type SingleEntryBundleResult,
  type CodeSplitBundleOptions,
  type CodeSplitBundleResult,
} from './esbuild-bundler.js';
