/**
 * TypeScript Type Stripping Module
 *
 * Strips TypeScript type annotations from function source code for runtime emission.
 * Used when extracting functions that will run as plain JavaScript in Node.js.
 */

// ============================================================================
// Type Stripping Functions
// ============================================================================

/**
 * Find the index of the function body opening brace
 * Handles nested braces in type annotations (e.g., Promise<{ foo: string }>)
 */
function findFunctionBodyStart(funcText: string): number {
  // Find the last ) that's part of the parameter list
  // Then skip the return type (which may contain nested braces)
  // Then find the { that starts the function body

  // Strategy: Find "function name(" or "(" and track brace/paren depth
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return -1;

  let pos = funcMatch.index! + funcMatch[0].length;
  let parenDepth = 1;

  // Find the closing ) of the parameter list
  while (pos < funcText.length && parenDepth > 0) {
    const char = funcText[pos];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    pos++;
  }

  // Now pos is just after the closing )
  // Skip whitespace and optional return type annotation to find the {
  // Return type starts with : and can contain nested <> {} []
  let inReturnType = false;
  let braceDepth = 0;
  let angleDepth = 0;
  let bracketDepth = 0;

  while (pos < funcText.length) {
    const char = funcText[pos];

    if (!inReturnType && char === ':') {
      // Start of return type annotation
      inReturnType = true;
      pos++;
      continue;
    }

    if (inReturnType) {
      // Track nested brackets in return type
      if (char === '<') angleDepth++;
      else if (char === '>') angleDepth--;
      else if (char === '[') bracketDepth++;
      else if (char === ']') bracketDepth--;
      else if (char === '{') {
        if (angleDepth === 0 && bracketDepth === 0) {
          // Found the function body opening brace
          return pos;
        }
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      }
    } else if (char === '{') {
      // Found the function body opening brace (no return type)
      return pos;
    }

    pos++;
  }

  return -1;
}

/**
 * Find the position of the closing paren of the parameter list
 */
function findParamListEnd(funcText: string): number {
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return -1;

  let pos = funcMatch.index! + funcMatch[0].length;
  let parenDepth = 1;

  while (pos < funcText.length && parenDepth > 0) {
    const char = funcText[pos];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth--;
    pos++;
  }

  return pos - 1; // Position of the closing )
}

/**
 * Strip type annotations from variable declarations in code
 * Uses a state machine to handle complex types with nested braces/brackets
 */
function stripVariableTypeAnnotations(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    // Look for const/let/var followed by identifier and colon
    const declMatch = code.slice(i).match(/^(const|let|var)\s+(\w+)\s*:/);
    if (declMatch) {
      // Found a typed variable declaration
      const keyword = declMatch[1];
      const name = declMatch[2];

      // Skip past the match
      let j = i + declMatch[0].length;

      // Skip the type annotation - track depth of {}, [], <>
      let depth = 0;
      while (j < code.length) {
        const char = code[j];
        if (char === '{' || char === '[' || char === '<') {
          depth++;
        } else if (char === '}' || char === ']' || char === '>') {
          depth--;
        } else if (depth === 0 && (char === '=' || char === ';' || char === '\n')) {
          // End of type annotation
          break;
        }
        j++;
      }

      // Output the declaration without the type
      result += keyword + ' ' + name;

      // Continue from where we left off
      i = j;
      continue;
    }

    // No match, copy character as-is
    result += code[i];
    i++;
  }

  return result;
}

/**
 * Strip type assertions from code
 * Handles: value as Type, <Type>value
 */
function stripTypeAssertions(code: string): string {
  // Strip "as Type" assertions - handle nested generics
  let result = code;

  // Strip " as Type" or " as Type<...>"
  // Match "as" followed by type identifier and optional generic args
  result = result.replace(/\s+as\s+\w+(?:<[^>]+>)?/g, '');

  // Strip angle bracket assertions: <Type>value or <Type<...>>value
  result = result.replace(/<\w+(?:<[^>]+>)?>/g, '');

  return result;
}

/**
 * Strip arrow function type annotations from code
 * Handles: (param: Type): ReturnType => ... → (param) => ...
 */
function stripArrowFunctionTypes(code: string): string {
  let result = '';
  let i = 0;

  while (i < code.length) {
    // Look for arrow function patterns: (params) or (params): ReturnType followed by =>
    // Pattern: = (params): ReturnType =>   or   = (params) =>
    const arrowMatch = code.slice(i).match(/^=\s*\(/);
    if (arrowMatch) {
      result += '= (';
      i += arrowMatch[0].length;

      // Parse parameter list, stripping types
      let parenDepth = 1;
      let inType = false;
      let paramChars = '';

      while (i < code.length && parenDepth > 0) {
        const char = code[i];

        if (char === '(') {
          parenDepth++;
          if (!inType) paramChars += char;
        } else if (char === ')') {
          parenDepth--;
          if (parenDepth > 0 && !inType) paramChars += char;
        } else if (char === ':' && parenDepth === 1) {
          // Start of type annotation for this param
          inType = true;
        } else if (char === ',' && parenDepth === 1) {
          // End of param, reset type tracking
          inType = false;
          paramChars += char;
        } else if (!inType) {
          paramChars += char;
        }

        i++;
      }

      result += paramChars + ')';

      // Now check for return type annotation: ): ReturnType =>
      // Skip whitespace
      while (i < code.length && /\s/.test(code[i])) {
        i++;
      }

      // Check for return type annotation
      if (code[i] === ':') {
        i++; // Skip the colon
        // Skip the return type - track depth for nested types like { a: b }
        let depth = 0;
        while (i < code.length) {
          const char = code[i];
          if (char === '{' || char === '<' || char === '(' || char === '[') {
            depth++;
          } else if (char === '}' || char === '>' || char === ')' || char === ']') {
            depth--;
          } else if (depth === 0 && code.slice(i, i + 2) === '=>') {
            // Found the arrow, stop skipping
            break;
          }
          i++;
        }
      }

      // Add space before arrow if needed
      if (result[result.length - 1] !== ' ') {
        result += ' ';
      }

      continue;
    }

    // No match, copy character as-is
    result += code[i];
    i++;
  }

  return result;
}

/**
 * Strip TypeScript type annotations from function source code
 *
 * Handles:
 * - Function parameter types
 * - Return type annotations
 * - Variable declarations in body
 * - Type assertions (as Type)
 * - Arrow function type annotations
 *
 * @param funcText - Full function source code
 * @returns Function source with types removed
 */
export function stripTypesFromFunction(funcText: string): string {
  const bodyStart = findFunctionBodyStart(funcText);
  if (bodyStart === -1) return funcText;

  const paramListEnd = findParamListEnd(funcText);
  if (paramListEnd === -1) return funcText;

  // Match the function declaration to get prefix
  const funcMatch = funcText.match(/(?:async\s+)?function\s+\w+\s*\(/);
  if (!funcMatch) return funcText;

  // Extract parts:
  // - prefix: "async function name(" or "function name("
  // - params: everything between ( and ) of parameter list
  // - body: from the opening { of function body to the end
  const prefix = funcText.slice(0, funcMatch.index! + funcMatch[0].length);
  const params = funcText.slice(funcMatch.index! + funcMatch[0].length, paramListEnd);
  let body = funcText.slice(bodyStart);

  // Remove 'export' keyword from prefix
  let cleanPrefix = prefix.replace(/^export\s+/, '');

  // Remove generic type parameters on function: function name<T>( -> function name(
  cleanPrefix = cleanPrefix.replace(/function\s+(\w+)\s*<[^>]+>\s*\(/, 'function $1(');

  // Extract just parameter names from params string
  // Handle complex types like { foo: string } by tracking brace depth
  const paramNames: string[] = [];
  let depth = 0;
  let current = '';
  let inName = true;

  for (const char of params) {
    if (char === '{' || char === '<' || char === '(') {
      depth++;
      if (!inName) continue;
    } else if (char === '}' || char === '>' || char === ')') {
      depth--;
      if (!inName) continue;
    } else if (char === ':' && depth === 0) {
      inName = false;
      continue;
    } else if (char === ',' && depth === 0) {
      if (current.trim()) paramNames.push(current.trim());
      current = '';
      inName = true;
      continue;
    }

    if (inName) {
      current += char;
    }
  }
  if (current.trim()) paramNames.push(current.trim());

  // Build clean signature: prefix + stripped params + )
  const cleanSignature = cleanPrefix + paramNames.join(', ') + ')';

  // Strip type annotations from variable declarations in the body
  // Uses a state machine to handle complex types with nested braces/brackets
  body = stripVariableTypeAnnotations(body);

  // Strip type assertions: value as Type  ->  value
  // Must be careful to handle nested generics
  body = stripTypeAssertions(body);

  // Strip arrow function type annotations: (param: Type): ReturnType => ...
  body = stripArrowFunctionTypes(body);

  return cleanSignature + ' ' + body;
}
