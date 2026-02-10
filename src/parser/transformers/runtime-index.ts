/**
 * Runtime Transformers Module
 *
 * Re-exports all runtime transformer functions and types.
 */

// Types
export {
  type RuntimeTransformResult,
  type RuntimeVarInfo,
  type RuntimeFunctionInfo,
  type LocalComponentInfo,
  createRuntimeContext,
} from './runtime-types.js';

// Local component transformer
export {
  extractLocalComponentDeclarations,
  extractExternalComponentDeclarations,
  transformLocalComponent,
} from './runtime-component.js';

// Runtime variable transformer
export {
  extractRuntimeVarDeclarations,
  getRuntimeVarDecls,
  resolveRuntimeVar,
  parseRuntimeVarRef,
  isRuntimeVarReference,
} from './runtime-var.js';

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
  transformRuntimeIf,
  transformRuntimeElse,
  transformRuntimeLoop,
  transformBreak,
  transformReturn,
  parseConditionExpression,
} from './runtime-control.js';

// Runtime call transformer
export {
  transformRuntimeCall,
  isRuntimeFnCall,
} from './runtime-call.js';

// AskUser transformer
export {
  transformAskUser,
} from './runtime-ask-user.js';

// SpawnAgent transformer
export {
  transformRuntimeSpawnAgent,
} from './runtime-spawner.js';

// Dispatch and document transformation
export {
  transformToRuntimeBlock,
  transformRuntimeBlockChildren,
  transformRuntimeCommand,
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
} from './runtime-utils.js';
