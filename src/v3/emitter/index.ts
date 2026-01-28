/**
 * V3 Emitter Module
 *
 * Re-exports V3 emitter functions and utilities.
 */

// Markdown emitter
export {
  V3MarkdownEmitter,
  emitV3,
} from './markdown-emitter.js';

// Runtime emitter (legacy - manual type stripping)
export {
  emitRuntime,
  extractFunctions,
  extractFromImports,
  generateRuntime,
  mergeRuntimeResults,
  isV3File,
  type ExtractedFunction,
  type RuntimeEmitResult,
} from './runtime-emitter.js';

// Esbuild bundler (full npm support)
export {
  // Legacy functions (separate bundling)
  bundleRuntimeFile,
  mergeAndWrapRuntimes,
  extractExportedFunctionNames,
  // New functions (single-entry bundling)
  generateRuntimeEntryPoint,
  bundleSingleEntryRuntime,
  wrapWithCLI,
  // Types
  type BundledRuntime,
  type BundleRuntimeOptions,
  type MergedRuntimeResult,
  type RuntimeFileInfo,
  type SingleEntryBundleOptions,
  type SingleEntryBundleResult,
} from './esbuild-bundler.js';
