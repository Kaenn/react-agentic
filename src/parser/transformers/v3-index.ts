/**
 * V3 Transformers Module
 *
 * Re-exports all V3 transformer functions and types.
 */

// Types
export {
  type V3TransformContext,
  type V3TransformResult,
  type RuntimeVarInfo,
  type RuntimeFunctionInfo,
  createV3Context,
} from './v3-types.js';

// Runtime variable transformer
export {
  extractRuntimeVarDeclarations,
  getRuntimeVarDecls,
  resolveRuntimeVar,
  parseRuntimeVarRef,
  isRuntimeVarReference,
} from './v3-runtime-var.js';

// Runtime function transformer
export {
  extractRuntimeFnDeclarations,
  getRuntimeFunctionNames,
  getRuntimeImportPaths,
  resolveRuntimeFn,
  isRuntimeFnWrapper,
  markRuntimeFnUsed,
} from './v3-runtime-fn.js';

// Control flow transformers
export {
  transformV3If,
  transformV3Else,
  transformV3Loop,
  transformBreak,
  transformReturn,
  parseConditionExpression,
} from './v3-control.js';

// Runtime call transformer
export {
  transformRuntimeCall,
  isRuntimeFnCall,
} from './v3-runtime-call.js';

// AskUser transformer
export {
  transformAskUser,
} from './v3-ask-user.js';

// V3 SpawnAgent transformer
export {
  transformV3SpawnAgent,
} from './v3-spawner.js';

// Dispatch and document transformation
export {
  transformToV3Block,
  transformV3BlockChildren,
  transformV3Command,
} from './v3-dispatch.js';

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
} from './v3-utils.js';
