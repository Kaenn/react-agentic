---
phase: 18
plan: 02
name: "Transformer"
subsystem: "MCP Configuration"
tags: ["transformer", "mcp", "validation"]
dependency-graph:
  requires: ["18-01"]
  provides: ["transformMCPServer", "transformMCPConfig", "extractArrayAttribute", "extractObjectAttribute"]
  affects: ["18-03", "18-04"]
tech-stack:
  added: []
  patterns: ["compile-time-validation", "env-resolution"]
key-files:
  created: []
  modified: ["src/parser/transformer.ts", "src/jsx.ts"]
decisions:
  - key: "mcpconfig-wrapper"
    choice: "MCPConfig wrapper component for multiple server definitions"
    rationale: "Follows existing patterns (Command, Agent, Skill all have single-root documents)"
  - key: "type-specific-validation"
    choice: "Validate prop combinations based on transport type at compile time"
    rationale: "Fail-fast approach catches invalid configurations before runtime"
  - key: "process-env-resolution"
    choice: "Resolve process.env.X at build time with error on undefined"
    rationale: "Ensures all environment variables are defined when building config"
metrics:
  duration: "~3m"
  completed: "2026-01-22"
---

# Phase 18 Plan 02: Transformer Summary

Transformer logic to parse MCP server JSX elements into IR nodes with compile-time validation.

## What Was Built

### transformMCPServer (src/parser/transformer.ts)

Transforms MCPServer, MCPStdioServer, and MCPHTTPServer JSX elements:

1. **Type determination:**
   - MCPStdioServer -> type="stdio" (implicit)
   - MCPHTTPServer -> type="http" (implicit)
   - MCPServer -> requires explicit type prop

2. **Compile-time validation:**
   - stdio: requires command, disallows url/headers
   - http/sse: requires url, disallows command/args

3. **Prop extraction:**
   - Arrays via `extractArrayAttribute` (args)
   - Objects via `extractObjectAttribute` (env, headers)
   - process.env.X resolved at build time

### transformMCPConfig (src/parser/transformer.ts)

Wraps multiple MCPServer elements into MCPConfigDocumentNode:
- Validates at least one server present
- Only allows MCP server elements as children
- Produces `kind: 'mcpConfigDocument'` with `servers: MCPServerNode[]`

### MCPConfig JSX Component (src/jsx.ts)

Added MCPConfig component and MCPConfigProps interface for the wrapper document.

## Commits

| Hash | Description |
|------|-------------|
| 119e887 | feat(18-02): add MCP transformer with validation |

## Validation Tests Passed

| Test | Description |
|------|-------------|
| stdio with url | Rejects url prop on stdio type |
| http with command | Rejects command prop on http type |
| MCPServer missing type | Requires type prop on generic MCPServer |
| http missing url | Requires url prop on http type |
| stdio missing command | Requires command prop on stdio type |
| stdio with headers | Rejects headers prop on stdio type |
| http with args | Rejects args prop on http type |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 18-03 can proceed immediately:
- MCPServerNode ready for emission
- MCPConfigDocumentNode ready for JSON settings output
- All validation passes at transform time

Known: TypeScript errors in build.ts (lines 228, 232) are expected - build command doesn't handle MCPConfigDocumentNode yet. This will be resolved in plan 18-04.
