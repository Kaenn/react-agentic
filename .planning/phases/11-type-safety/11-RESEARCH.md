# Phase 11: Type Safety - Research

**Researched:** 2026-01-21
**Domain:** TypeScript generic extraction, cross-file type validation, ts-morph TypeNode API
**Confidence:** HIGH

## Summary

Phase 11 implements compile-time type safety for Agent/SpawnAgent communication. The core challenge is extracting TypeScript interface definitions from Agent files and validating that SpawnAgent usages conform to those interfaces.

Key architectural insight from prior research: **Use TypeNode API (not Type API)** for generic extraction. The TypeScript compiler "interns" types for performance, which loses generic argument information. Accessing AST nodes directly via `TypeReferenceNode.getTypeArguments()` preserves the complete generic syntax.

The phase has two sub-phases:
1. **11-01: Generic type parameter extraction** - Add generic support to Agent and SpawnAgent components
2. **11-02: Cross-file validation** - Validate SpawnAgent input matches Agent's exported interface

**Primary recommendation:** Agent files export a TypeScript interface, SpawnAgent imports that interface as a generic type parameter. Transpiler validates at compile time by comparing SpawnAgent's input props against the Agent's interface properties.

## Standard Stack

No new dependencies needed. Existing ts-morph 27.0.2 provides all required APIs.

### Core APIs
| API | Module | Purpose | Why Standard |
|-----|--------|---------|--------------|
| `TypeReferenceNode.getTypeArguments()` | ts-morph | Extract generic type arguments from AST | Preserves full generic syntax (vs Type API) |
| `sourceFile.getInterface(name)` | ts-morph | Get interface declaration by name | Direct interface lookup |
| `interface.getProperties()` | ts-morph | Get interface property signatures | Extract expected input shape |
| `importDecl.getModuleSpecifierSourceFile()` | ts-morph | Follow import to source file | Cross-file resolution |
| `Node.isTypeReferenceNode(node)` | ts-morph | Type guard for TypeReferenceNode | Safe casting |

### Supporting APIs
| API | Purpose | When to Use |
|-----|---------|-------------|
| `element.getTypeArguments()` | Get generic args from JSX element | SpawnAgent<TInput> extraction |
| `typeNode.getText()` | Get string representation of type | Error messages, debugging |
| `property.getName()` | Get property name from signature | Interface property iteration |
| `property.getType()` | Get property's type for comparison | Type matching |

## Architecture Patterns

### Recommended Project Structure

No new files required. Extend existing modules:

```
src/
├── parser/
│   ├── parser.ts      # Add: extractTypeArguments(), resolveTypeImport()
│   └── transformer.ts # Add: generic handling in transformAgent/transformSpawnAgent
├── ir/
│   └── nodes.ts       # Already has TypeReference (Phase 8)
├── cli/
│   ├── errors.ts      # Add: CrossFileError for multi-location errors
│   └── commands/
│       └── build.ts   # Add: validation pass before emit
└── jsx.ts             # Add: generic type parameters to Agent/SpawnAgent
```

### Pattern 1: TypeReferenceNode for Generic Extraction

**What:** Use AST-level TypeNode instead of resolved Type for generic arguments
**When to use:** Extracting `<TInput>` from `<SpawnAgent<TInput>>` or `<Agent<TInput>>`
**Why:** TypeScript compiler "interns" types, losing generic information. TypeNode preserves it.

```typescript
// Source: https://github.com/dsherret/ts-morph/issues/810
import { TypeReferenceNode, Node } from 'ts-morph';

function extractTypeArguments(
  element: JsxElement | JsxSelfClosingElement
): string[] | undefined {
  const tagNameNode = Node.isJsxElement(element)
    ? element.getOpeningElement().getTagNameNode()
    : element.getTagNameNode();

  // JSX elements with generics: <SpawnAgent<TInput> ... />
  // The type arguments are on the tag name node
  const typeArgs = tagNameNode.getTypeArguments?.();
  if (!typeArgs || typeArgs.length === 0) {
    return undefined;
  }

  return typeArgs.map(arg => arg.getText());
}
```

### Pattern 2: Agent Interface Export

**What:** Agent file exports TypeScript interface that SpawnAgent imports
**When to use:** Defining Agent's input contract
**Example:**

```tsx
// agents/researcher.tsx
export interface ResearcherInput {
  phase: string;
  description: string;
  requirements?: string;
}

export default function Researcher() {
  return (
    <Agent<ResearcherInput>
      name="gsd-researcher"
      description="Research phase requirements"
      tools="Read Grep Glob WebSearch"
    >
      {/* Agent body */}
    </Agent>
  );
}
```

### Pattern 3: SpawnAgent Type Import and Validation

**What:** SpawnAgent imports Agent's interface, transpiler validates match
**When to use:** Command spawning an Agent with typed input

```tsx
// commands/plan-phase.tsx
import { ResearcherInput } from '../agents/researcher';

export default function PlanPhase() {
  return (
    <Command name="plan" description="Plan a phase">
      <SpawnAgent<ResearcherInput>
        agent="gsd-researcher"
        model="{model}"
        description="Research phase"
        prompt={`Phase: {phase}\nDescription: {description}`}
      />
    </Command>
  );
}
```

### Pattern 4: Interface Property Extraction

**What:** Extract property names and types from an interface
**When to use:** Validating SpawnAgent prompt contains required placeholders

```typescript
function extractInterfaceProperties(
  sourceFile: SourceFile,
  interfaceName: string
): Map<string, { required: boolean; type: string }> {
  const iface = sourceFile.getInterface(interfaceName);
  if (!iface) {
    throw new Error(`Interface '${interfaceName}' not found`);
  }

  const properties = new Map();
  for (const prop of iface.getProperties()) {
    properties.set(prop.getName(), {
      required: !prop.hasQuestionToken(),
      type: prop.getType().getText(),
    });
  }
  return properties;
}
```

### Pattern 5: Cross-File Error with Dual Locations

**What:** Error messages that reference both Command and Agent files
**When to use:** VALID-03 - showing where mismatch occurs in both files

```typescript
// Extend existing TranspileError
export interface CrossFileLocation {
  command: SourceLocation;  // Where SpawnAgent is used
  agent: SourceLocation;    // Where interface is defined
}

export class CrossFileError extends TranspileError {
  readonly agentLocation: SourceLocation | undefined;

  constructor(
    message: string,
    commandLocation: SourceLocation,
    agentLocation?: SourceLocation,
    sourceCode?: string
  ) {
    super(message, commandLocation, sourceCode);
    this.name = 'CrossFileError';
    this.agentLocation = agentLocation;
  }
}

function formatCrossFileError(error: CrossFileError): string {
  const parts: string[] = [];

  // Command location (primary)
  parts.push(formatTranspileError(error));

  // Agent location (secondary)
  if (error.agentLocation) {
    const { file, line, column } = error.agentLocation;
    parts.push('');
    parts.push(`${pc.dim('Agent interface defined at:')} ${pc.cyan(file)}:${pc.dim(String(line))}:${pc.dim(String(column))}`);
  }

  return parts.join('\n');
}
```

### Anti-Patterns to Avoid

- **Using Type API for generics:** `getType().getTypeArguments()` loses generic info due to type interning
- **Runtime type checking:** We validate at compile time only; output is untyped markdown
- **Resolving @ references:** Must preserve verbatim per GSD pattern
- **Dynamic agent references:** `agent={getAgent()}` cannot be resolved at compile time

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Generic extraction | Manual AST traversal | `TypeReferenceNode.getTypeArguments()` | Handles all TSX generic syntax |
| Import resolution | Path manipulation | `getModuleSpecifierSourceFile()` | Handles all import patterns |
| Interface properties | Manual property iteration | `interface.getProperties()` | Handles inheritance, generics |
| File existence check | `fs.existsSync` | ts-morph project resolution | Project tracks all source files |
| Type comparison | String equality | TypeScript type compatibility | Handles structural typing |

**Key insight:** ts-morph wraps TypeScript's full type system. Use it rather than reimplementing.

## Common Pitfalls

### Pitfall 1: Type Interning Loses Generic Arguments

**What goes wrong:** `getType().getTypeArguments()` returns fewer args than expected
**Why it happens:** TypeScript compiler "interns" types for performance
**How to avoid:** Use `TypeReferenceNode.getTypeArguments()` instead of `Type.getTypeArguments()`
**Warning signs:** Missing type arguments, unexpected `[]` results

### Pitfall 2: Import Resolution Returns Undefined

**What goes wrong:** `getModuleSpecifierSourceFile()` returns undefined
**Why it happens:** File not added to ts-morph project, or resolution fails
**How to avoid:**
1. Ensure agent files are added to project before commands
2. Use absolute paths or verify relative path resolution
3. Check `isModuleSpecifierRelative()` before resolution
**Warning signs:** "Cannot resolve import" errors

### Pitfall 3: Interface Not Exported

**What goes wrong:** `getInterface()` returns undefined even though interface exists
**Why it happens:** Interface not exported, or exported with different name
**How to avoid:**
1. Use `getExportedDeclarations().get(name)` for exported items
2. Fall back to `getInterface()` for internal interfaces
**Warning signs:** "Interface not found" for existing interfaces

### Pitfall 4: Circular Import Detection Incomplete

**What goes wrong:** Stack overflow or infinite loop during resolution
**Why it happens:** Command imports Agent, Agent could theoretically import Command
**How to avoid:** Track visited files during resolution (existing pattern in resolveComponentImport)
**Warning signs:** Maximum call stack exceeded

### Pitfall 5: Type-Only Imports Not Handled

**What goes wrong:** Type import doesn't resolve to source file
**Why it happens:** `import type { X }` handled differently in some cases
**How to avoid:** Handle both `import { X }` and `import type { X }` patterns
**Warning signs:** Type imports work in tests but fail with `import type`

### Pitfall 6: Prompt Placeholders Don't Match Interface

**What goes wrong:** SpawnAgent prompt uses `{foo}` but interface expects `bar`
**Why it happens:** Placeholder names are arbitrary strings in GSD format
**How to avoid:**
1. Extract `{placeholder}` patterns from prompt string
2. Compare against interface property names
3. Report missing required properties
**Warning signs:** "Missing required property 'bar' in prompt"

## Code Examples

### Example 1: Extract Generic Type from JSX Element

```typescript
// Source: ts-morph TypeReferenceNode pattern
import { Node, JsxElement, JsxSelfClosingElement } from 'ts-morph';

/**
 * Extract generic type arguments from a JSX element
 * For <SpawnAgent<ResearcherInput>> returns ['ResearcherInput']
 */
function extractGenericTypeArgs(
  element: JsxElement | JsxSelfClosingElement
): string[] | undefined {
  // Get the tag name node (where generics are attached)
  const tagNode = Node.isJsxElement(element)
    ? element.getOpeningElement().getTagNameNode()
    : element.getTagNameNode();

  // Check if tag has type arguments
  const parent = tagNode.getParent();
  if (!Node.isJsxOpeningElement(parent) && !Node.isJsxSelfClosingElement(parent)) {
    return undefined;
  }

  // Get type arguments from the expression
  // JSX: <Component<T>> has type args on the identifier
  const typeArgs = tagNode.getChildrenOfKind(SyntaxKind.TypeReference);
  if (typeArgs.length === 0) {
    return undefined;
  }

  return typeArgs.map(arg => arg.getText());
}
```

### Example 2: Resolve Type Import to Source File

```typescript
// Source: ts-morph imports documentation
import { SourceFile, ImportDeclaration } from 'ts-morph';

/**
 * Find and resolve an import for a type name
 */
function resolveTypeImport(
  sourceFile: SourceFile,
  typeName: string
): { sourceFile: SourceFile; interfaceName: string } | undefined {
  // Find import that imports this type
  for (const importDecl of sourceFile.getImportDeclarations()) {
    // Check named imports
    for (const namedImport of importDecl.getNamedImports()) {
      if (namedImport.getName() === typeName) {
        const resolved = importDecl.getModuleSpecifierSourceFile();
        if (!resolved) {
          return undefined;
        }
        // Handle aliased imports: import { X as Y }
        const originalName = namedImport.getAliasNode()?.getText() ?? typeName;
        return { sourceFile: resolved, interfaceName: originalName };
      }
    }
  }
  return undefined;
}
```

### Example 3: Validate SpawnAgent Against Agent Interface

```typescript
/**
 * Validate SpawnAgent prompt contains all required interface properties
 */
function validateSpawnAgentInput(
  spawnAgentNode: Node,
  promptText: string,
  agentInterface: InterfaceDeclaration,
  commandFile: SourceFile,
  agentFile: SourceFile
): void {
  // Extract {placeholder} patterns from prompt
  const placeholders = new Set(
    [...promptText.matchAll(/\{(\w+)\}/g)].map(m => m[1])
  );

  // Get required properties from interface
  const requiredProps: string[] = [];
  for (const prop of agentInterface.getProperties()) {
    if (!prop.hasQuestionToken()) {
      requiredProps.push(prop.getName());
    }
  }

  // Check for missing required properties
  const missing = requiredProps.filter(p => !placeholders.has(p));
  if (missing.length > 0) {
    throw new CrossFileError(
      `SpawnAgent prompt missing required properties: ${missing.join(', ')}`,
      getNodeLocation(spawnAgentNode),
      {
        file: agentFile.getFilePath(),
        line: agentInterface.getStartLineNumber(),
        column: 1,
      }
    );
  }
}
```

### Example 4: Agent File Existence Validation

```typescript
/**
 * Validate that referenced Agent file exists
 * VALID-01: Transpiler validates referenced Agent file exists
 */
function validateAgentFileExists(
  project: Project,
  agentName: string,
  spawnAgentNode: Node
): SourceFile {
  // Agent files live in specific locations
  const possiblePaths = [
    `src/app/agents/${agentName}.tsx`,
    `src/agents/${agentName}.tsx`,
    `agents/${agentName}.tsx`,
  ];

  for (const agentPath of possiblePaths) {
    const sourceFile = project.getSourceFile(agentPath);
    if (sourceFile) {
      return sourceFile;
    }
  }

  // Try adding the file if it exists on disk
  for (const agentPath of possiblePaths) {
    try {
      return project.addSourceFileAtPath(agentPath);
    } catch {
      // File doesn't exist at this path
    }
  }

  throw new TranspileError(
    `Agent file not found: ${agentName}. Searched: ${possiblePaths.join(', ')}`,
    getNodeLocation(spawnAgentNode)
  );
}
```

### Example 5: JSX Type Props Update

```typescript
// jsx.ts - Updated types for generic support

/**
 * Props for Agent component with optional generic type parameter
 */
export interface AgentProps<TInput = unknown> {
  name: string;
  description: string;
  tools?: string;
  color?: string;
  folder?: string;
  children?: ReactNode;
  // TInput is used at compile time only for type checking
}

/**
 * Props for SpawnAgent component with generic input type
 */
export interface SpawnAgentProps<TInput = unknown> {
  agent: string;
  model: string;
  description: string;
  prompt: string;
  // TInput enables compile-time validation of prompt placeholders
}

/**
 * Agent component with generic type parameter
 * @example
 * export interface MyInput { phase: string; goal: string; }
 * <Agent<MyInput> name="my-agent" description="...">
 */
export function Agent<TInput = unknown>(_props: AgentProps<TInput>): null {
  return null;
}

/**
 * SpawnAgent component with generic type parameter
 * @example
 * import { MyInput } from '../agents/my-agent';
 * <SpawnAgent<MyInput> agent="my-agent" prompt="{phase} - {goal}" />
 */
export function SpawnAgent<TInput = unknown>(_props: SpawnAgentProps<TInput>): null {
  return null;
}
```

## Edge Cases

### Edge Case 1: Optional Properties in Interface

```typescript
interface AgentInput {
  required: string;
  optional?: string;
}
```
Optional properties should NOT trigger validation errors if missing from prompt.

### Edge Case 2: Nested Type References

```typescript
interface Outer { inner: InnerType; }
// SpawnAgent<Outer> - need to handle nested types
```
For v1.1, support only flat interfaces. Nested types deferred to v1.2.

### Edge Case 3: Generic Type with Defaults

```typescript
<SpawnAgent<SomeInput>>  // Explicit type
<SpawnAgent>             // No type (falls back to unknown)
```
Both should work - validation only runs when type argument provided.

### Edge Case 4: Re-exported Types

```typescript
// types.ts
export interface Input { ... }

// agent.tsx
export { Input } from './types';
```
Follow re-exports to find original declaration.

### Edge Case 5: Agent Without Exported Interface

```typescript
// Old-style agent without type export
export default function OldAgent() {
  return <Agent name="old" description="Legacy" />;
}
```
Should work without validation - graceful degradation.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No type safety | Compile-time interface validation | Phase 11 | Catches contract mismatches at build time |
| Implicit Agent contracts | Explicit TypeScript interfaces | Phase 11 | Self-documenting Agent requirements |
| Runtime errors from GSD | Build-time errors from transpiler | Phase 11 | Faster feedback loop |

## Open Questions

### Question 1: JSX Generic Syntax Support in ts-morph

**What we know:** TypeScript supports `<Component<T>>` syntax
**What's unclear:** Does ts-morph expose type arguments on JSX tag nodes?
**Recommendation:** Prototype extraction pattern early in 11-01. May need to access underlying TypeScript AST if ts-morph doesn't expose directly.

### Question 2: Validation Strictness Level

**What we know:** We can validate required vs optional properties
**What's unclear:** Should we warn about extra placeholders not in interface?
**Recommendation:** Strict for missing required, warning-only for extra placeholders (allows runtime-only context).

### Question 3: Agent Name to File Path Mapping

**What we know:** `agent="gsd-researcher"` needs to map to a file
**What's unclear:** How to reliably find Agent file from name?
**Options:**
1. Convention-based: `agents/{name}.tsx`
2. Registry approach: scan all Agent files at build start
3. Explicit import: require import statement alongside type import
**Recommendation:** Start with convention-based, add registry if needed.

## Sources

### Primary (HIGH confidence)
- [ts-morph Type Parameters](https://ts-morph.com/details/type-parameters) - Official documentation for `getTypeParameters()`
- [ts-morph Issue #810](https://github.com/dsherret/ts-morph/issues/810) - TypeReferenceNode solution for generic extraction
- [ts-morph Imports](https://ts-morph.com/details/imports) - Module specifier resolution
- [ts-morph Diagnostics](https://ts-morph.com/setup/diagnostics) - Error location extraction

### Secondary (MEDIUM confidence)
- [ts-morph Issue #910](https://github.com/dsherret/ts-morph/issues/910) - Type parameter extraction challenges
- [TypeScript Compiler API Wiki](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API) - Underlying API patterns

### Codebase (HIGH confidence)
- `/Users/glenninizan/workspace/react-agentic/src/parser/parser.ts` - Existing import resolution patterns
- `/Users/glenninizan/workspace/react-agentic/src/cli/errors.ts` - Existing error formatting
- `/Users/glenninizan/workspace/react-agentic/src/ir/nodes.ts` - TypeReference node (Phase 8)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, ts-morph APIs verified
- Generic extraction: MEDIUM - TypeReferenceNode pattern documented but needs prototype
- Cross-file validation: HIGH - Extends existing resolveComponentImport pattern
- Error formatting: HIGH - Extends existing TranspileError pattern

**Research date:** 2026-01-21
**Valid until:** Stable until Phase 11 completion
