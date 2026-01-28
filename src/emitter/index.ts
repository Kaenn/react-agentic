/**
 * Emitter Module - Markdown emission from IR
 *
 * Exports the MarkdownEmitter class and convenience emit function.
 */

export { emit, emitAgent, emitSkill, emitSkillFile, MarkdownEmitter } from './emitter.js';
export { emitSettings, mergeSettings } from './settings.js';
export { emitState, generateMainInitSkill, type StateEmitResult } from './state-emitter.js';

// V3 Emitters
export { emitV3, V3MarkdownEmitter } from './v3-markdown-emitter.js';
export {
  emitRuntime,
  generateRuntime,
  mergeRuntimeResults,
  extractFunctions,
  extractConstants,
  extractFromImports,
  isV3File,
  type ExtractedFunction,
  type ExtractedConstant,
  type RuntimeEmitResult,
  type ExtractFromImportsResult,
} from './v3-runtime-emitter.js';
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
} from './v3-esbuild-bundler.js';
