# TSX to MD/YAML Generation Using TypeScript Compiler API

## Concept

Leverage the TypeScript Compiler API to parse TSX files, extract structured information (components, props, function signatures, types), and generate Markdown or YAML documentation automatically.

## Why TypeScript Compiler API?

**Full Type Awareness** — Unlike Babel, the TypeScript compiler resolves and understands types. You get access to inferred types, generics, interfaces, and union types, not just syntax.

**Native TSX Support** — No additional plugins required. The compiler handles JSX/TSX as first-class syntax.

**Single Source of Truth** — Types defined in code become documentation. No manual sync between code and docs.

## Key Capabilities

- Extract function/component names, parameters, and return types
- Resolve complex types (interfaces, generics, unions)
- Detect optional props and default values
- Traverse JSX structure and attributes

## Recommended Stack

| Tool | Purpose |
|------|---------|
| **ts-morph** | Simplified wrapper around TypeScript Compiler API |
| **TypeScript** | Type checking and AST generation |
| **js-yaml** | YAML output generation |

## Use Cases

- Component library documentation
- API reference generation
- Design system prop tables
- Schema generation for CMS or static site generators

## Trade-offs

| Pros | Cons |
|------|------|
| Type-safe extraction | Steeper learning curve than regex-based solutions |
| Handles complex types | Requires TypeScript project setup |
| Maintainable and scalable | Slower than simple text parsing |