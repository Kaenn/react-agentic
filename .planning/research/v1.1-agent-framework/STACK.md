# Stack Research: Agent Framework (v1.1)

**Project:** react-agentic v1.1 (Agent Framework)
**Researched:** 2026-01-21
**Overall confidence:** HIGH

## Executive Summary

The existing stack is sufficient for implementing typed Agent components and SpawnAgent communication. **No new dependencies required.** The current ts-morph ^27.0.2 and TypeScript 5.9.3 provide all APIs needed for type extraction from generic components.

The key insight: extracting types from `Agent<InputType, OutputType>` requires working with **TypeNode** objects rather than **Type** objects to avoid TypeScript's type interning optimization.

---

## Recommended Stack Changes

### Summary: NO CHANGES REQUIRED

| Technology | Current | Required | Action |
|------------|---------|----------|--------|
| ts-morph | ^27.0.2 | ^27.0.2 | Keep |
| TypeScript | ^5.9.3 | ^5.9.3 | Keep |
| Commander.js | ^14.0.2 | ^14.0.2 | Keep |
| Chokidar | ^5.0.0 | ^5.0.0 | Keep |
| globby | ^16.1.0 | ^16.1.0 | Keep |
| gray-matter | ^4.0.3 | ^4.0.3 | Keep |
| picocolors | ^1.1.1 | ^1.1.1 | Keep |

**Rationale:** All dependencies are at their latest versions. ts-morph 27.0.2 (released October 2025) provides complete TypeScript Compiler API access for type extraction.

---

## ts-morph API Features for Agent Framework

### 1. Type Extraction from Generic Components (CORE REQUIREMENT)

The Agent component will use generic props like `Agent<Input, Output>`. ts-morph provides the necessary APIs.

#### RECOMMENDED APPROACH: TypeNode-Based Extraction

```typescript
import { Node, TypeReferenceNode } from 'ts-morph';

// For <Agent<MyInput, MyOutput>>
function extractGenericTypeArgs(
  element: JsxSelfClosingElement | JsxOpeningElement
): { inputType: string; outputType: string } | null {

  // Get the tag name node which has type arguments
  const tagNameNode = element.getTagNameNode();

  // For generic JSX: <Agent<T, U>>, the type arguments are on the element
  const typeArgs = element.getTypeArguments(); // TypeNode[]

  if (typeArgs.length >= 2) {
    return {
      inputType: typeArgs[0].getText(),   // "MyInput"
      outputType: typeArgs[1].getText(),  // "MyOutput"
    };
  }
  return null;
}
```

**Why TypeNode over Type:** The TypeScript compiler "interns" types for performance. Using `getType().getText()` can simplify `Component<string, number>` to just the resolved primitive. Using `getTypeArguments()` on the node preserves the original generic structure.

#### Verified API Methods (ts-morph 27.0.2)

| Method | Purpose | Availability |
|--------|---------|--------------|
| `element.getTypeArguments()` | Get generic type args from JSX | YES |
| `typeNode.getText()` | Serialize type to string | YES |
| `Node.isTypeReferenceNode()` | Check for generic usage | YES |
| `typeAlias.getTypeNodeOrThrow()` | Get type definition node | YES |

### 2. Interface/Type Definition Resolution

```typescript
// Extract interface definition from source file
function getInterfaceDefinition(
  sourceFile: SourceFile,
  typeName: string
): string | null {
  // Try interface first
  const iface = sourceFile.getInterface(typeName);
  if (iface) {
    return iface.getText();
  }

  // Try type alias
  const typeAlias = sourceFile.getTypeAlias(typeName);
  if (typeAlias) {
    return typeAlias.getText();
  }

  return null;
}
```

### 3. Cross-File Type Import Resolution

The existing `resolveComponentImport()` pattern in parser.ts applies directly to type imports:

```typescript
// Already implemented in parser.ts - same pattern works for types
function resolveTypeImport(
  typeName: string,
  sourceFile: SourceFile
): SourceFile | null {
  const importDecl = sourceFile.getImportDeclaration((decl) => {
    const namedImports = decl.getNamedImports();
    return namedImports.some((ni) => ni.getName() === typeName);
  });

  if (!importDecl) return null;
  return importDecl.getModuleSpecifierSourceFile() ?? null;
}
```

**Confidence: HIGH** - These patterns are verified in official ts-morph documentation and existing codebase implementation.

---

## TypeScript Patterns for Generic Agent Component

### Pattern 1: Generic Component with Input/Output Types

```typescript
// Agent.tsx - Component definition
interface AgentProps<TInput, TOutput> {
  name: string;
  description: string;
  // Type markers (not runtime values)
  // Enables: <Agent<MyInput, MyOutput> ...>
}

// The generic parameters are extracted at transpile time
export function Agent<TInput, TOutput>(
  props: AgentProps<TInput, TOutput>
): JSX.Element {
  return <>{props.children}</>;
}
```

### Pattern 2: Interface Export for Cross-File Typing

```typescript
// agents/researcher.tsx
export interface ResearcherInput {
  topic: string;
  depth: 'shallow' | 'deep';
}

export interface ResearcherOutput {
  findings: string[];
  confidence: number;
}

export function Researcher() {
  return (
    <Agent<ResearcherInput, ResearcherOutput>
      name="researcher"
      description="Research agent"
    >
      {/* Agent content */}
    </Agent>
  );
}
```

```typescript
// commands/analyze.tsx
import { ResearcherInput, ResearcherOutput } from '../agents/researcher';

export function AnalyzeCommand() {
  return (
    <Command name="analyze" description="Analysis command">
      <SpawnAgent<ResearcherInput, ResearcherOutput>
        agent="./agents/researcher"
      />
    </Command>
  );
}
```

### Pattern 3: Arrow Function Generic Syntax in .tsx

```typescript
// Note: Trailing comma needed for arrow functions in .tsx files
// to distinguish from JSX
const Agent = <TInput, TOutput>(props: AgentProps<TInput, TOutput>) => {
  // ...
};

// Or use function declaration (no trailing comma needed)
function Agent<TInput, TOutput>(props: AgentProps<TInput, TOutput>) {
  // ...
}
```

**Confidence: HIGH** - Standard TypeScript generic patterns, verified in official TypeScript documentation.

---

## What NOT to Add

### 1. NO Runtime Type Libraries (zod, io-ts, etc.)

**Rationale:** react-agentic is a compile-time transpiler. Types exist only during build, not runtime.

- Adding zod would be unnecessary complexity
- Runtime validation overhead for no benefit
- Semantic mismatch (this isn't a runtime validation system)

### 2. NO Additional AST Libraries

**Rationale:** ts-morph already wraps the TypeScript Compiler API completely.

| Library | Why Not |
|---------|---------|
| `@typescript-eslint/parser` | Redundant, ts-morph handles JSX |
| `recast` | Not needed, not modifying original source |
| `typescript` (direct) | ts-morph re-exports via `ts` namespace |

### 3. NO Code Generation Libraries

**Rationale:** IR → Markdown emission is simple string templating.

| Library | Why Not |
|---------|---------|
| `handlebars` | Overkill for markdown generation |
| `ejs` | Same reasoning |
| `ts-morph codegen` | We generate markdown, not TypeScript |

### 4. NO Schema Definition Libraries

**Rationale:** JSON Schema or similar are for runtime validation. Type information is embedded in TSX source.

---

## Implementation Strategy

### Type Extraction Flow

```
1. Parse Agent<TInput, TOutput> JSX element
   └─> element.getTypeArguments() → [TypeNode, TypeNode]

2. Extract type argument text
   └─> typeNode.getText() → "ResearcherInput", "ResearcherOutput"

3. Resolve type definitions (if interface/type alias)
   └─> Follow imports to source file
   └─> Extract interface/type text

4. Emit to markdown
   └─> Include type signatures in structured return format
```

### Key ts-morph Methods Summary

| Method | Use Case |
|--------|----------|
| `JsxElement.getTypeArguments()` | Extract `<T, U>` from JSX |
| `TypeNode.getText()` | Serialize type to string |
| `SourceFile.getInterface(name)` | Get interface declaration |
| `SourceFile.getTypeAlias(name)` | Get type alias declaration |
| `ImportDeclaration.getModuleSpecifierSourceFile()` | Follow imports |
| `Node.isTypeReferenceNode()` | Check node type |

---

## tsconfig.json Compatibility

Current configuration is compatible. No changes needed:

```json
{
  "compilerOptions": {
    "jsx": "preserve",           // Required for JSX parsing
    "strict": true,              // Ensures type information available
    "declaration": true,         // Enables .d.ts for type extraction
    "declarationMap": true       // Source mapping for types
  }
}
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Type interning obscures generics | LOW | HIGH | Use TypeNode API, not Type API |
| Import resolution fails | LOW | MEDIUM | Already implemented and tested |
| Complex union types | MEDIUM | MEDIUM | Limit v1.1 to simple interface types |
| Circular type references | LOW | LOW | Existing circular import detection applies |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| No new dependencies | HIGH | All required APIs exist in current stack |
| ts-morph type extraction | HIGH | Verified in official docs and GitHub issues |
| Generic component patterns | HIGH | Standard TypeScript patterns |
| Cross-file resolution | HIGH | Already implemented in parser.ts |

---

## Sources

### Official Documentation (HIGH confidence)
- [ts-morph Types Documentation](https://ts-morph.com/details/types)
- [ts-morph Type Parameters](https://ts-morph.com/details/type-parameters)
- [ts-morph Imports](https://ts-morph.com/details/imports)
- [ts-morph Compiler Nodes](https://ts-morph.com/navigation/compiler-nodes)
- [TypeScript 5.9 Release Notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-9/)

### GitHub Issues (MEDIUM confidence)
- [ts-morph #910 - Type parameter extraction](https://github.com/dsherret/ts-morph/issues/910) - Confirms TypeNode approach
- [ts-morph #810 - Parse generic type](https://github.com/dsherret/ts-morph/issues/810) - Shows getTypeArguments usage
- [ts-morph #631 - getTypeArguments behavior](https://github.com/dsherret/ts-morph/issues/631) - Type interning documentation

### Community Resources (MEDIUM confidence)
- [TypeScript Generics in React Components](https://dev.to/jonathanguo/typescript-generics-in-react-components-a-complete-guide-1e88)
- [Total TypeScript - PropsFrom helper](https://www.totaltypescript.com/tips/write-your-own-propsfrom-helper-to-extract-props-from-any-react-component)
- [Generic React Components in TypeScript](https://www.benmvp.com/blog/generic-react-components-typescript/)

### Package Verification
- ts-morph 27.0.2: [npm registry](https://www.npmjs.com/package/ts-morph) - verified latest
- TypeScript 5.9.3: [npm registry](https://www.npmjs.com/package/typescript) - verified latest

---

## Summary

**Stack decision: NO CHANGES REQUIRED**

The existing ts-morph ^27.0.2 and TypeScript 5.9.3 stack provides all capabilities needed:

1. **Generic type extraction** via `getTypeArguments()` on JSX elements
2. **Cross-file type resolution** via existing import resolution infrastructure
3. **Interface/type definition extraction** via `getInterface()` / `getTypeAlias()`
4. **Type serialization** via `getText()` for markdown emission

Implementation requires only new code using existing ts-morph APIs - no dependency changes.
