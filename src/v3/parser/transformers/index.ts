/**
 * V3 Transformers Module
 *
 * Re-exports all V3 transformer functions and types.
 */

// Types
export {
  type V3TransformContext,
  type V3TransformResult,
  type ScriptVarInfo,
  type RuntimeFunctionInfo,
  createV3Context,
} from './types.js';

// Script variable transformer
export {
  extractScriptVarDeclarations,
  getScriptVarDecls,
  resolveScriptVar,
  parseScriptVarRef,
  isScriptVarReference,
} from './script-var.js';

// Runtime function transformer
export {
  extractRuntimeFnDeclarations,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
  resolveRuntimeFn,
  isRuntimeFnWrapper,
  markRuntimeFnUsed,
} from './runtime-fn.js';

// Control flow transformers
export {
  transformV3If,
  transformV3Else,
  transformV3Loop,
  transformBreak,
  transformReturn,
  parseConditionExpression,
} from './control.js';

// Runtime call transformer
export {
  transformRuntimeCall,
  isRuntimeFnCall,
} from './runtime-call.js';

// AskUser transformer
export {
  transformAskUser,
} from './ask-user.js';

// V3 SpawnAgent transformer
export {
  transformV3SpawnAgent,
} from './spawner.js';

// Dispatch and document transformation
export {
  transformToV3Block,
  transformV3BlockChildren,
  transformV3Command,
} from './dispatch.js';

// Utilities
export {
  getAttributeValue,
  getAttributeExpression,
  getAttributeObject,
  getAttributeArray,
  getElementName,
  isCustomComponent,
  extractText,
  extractJsonValue,
} from './utils.js';
