---
phase: 18
plan: 01
name: "IR Nodes & JSX Components"
subsystem: "MCP Configuration"
tags: ["ir", "jsx", "mcp", "foundation"]
dependency-graph:
  requires: []
  provides: ["MCPServerNode", "MCPConfigDocumentNode", "MCPServerProps", "MCPStdioServerProps", "MCPHTTPServerProps"]
  affects: ["18-02", "18-03", "18-04"]
tech-stack:
  added: []
  patterns: ["discriminated-union", "convenience-wrapper"]
key-files:
  created: []
  modified: ["src/ir/nodes.ts", "src/jsx.ts"]
decisions:
  - key: "mcp-transport-types"
    choice: "Support stdio, http, sse in single MCPServerNode"
    rationale: "Matches .claude/settings.json format with union of transport types"
  - key: "convenience-components"
    choice: "MCPStdioServer and MCPHTTPServer wrappers with required props"
    rationale: "Better TypeScript inference - command required for stdio, url required for http"
metrics:
  duration: "~2m"
  completed: "2026-01-22"
---

# Phase 18 Plan 01: IR Nodes & JSX Components Summary

Foundation layer for MCP configuration - IR node types and JSX component stubs.

## What Was Built

### IR Nodes (src/ir/nodes.ts)

**MCPServerNode** - Represents a single MCP server:
- `kind: 'mcpServer'` discriminator
- `type: 'stdio' | 'http' | 'sse'` transport
- Stdio-specific: `command`, `args`
- HTTP/SSE-specific: `url`, `headers`
- Common: `name`, `env`

**MCPConfigDocumentNode** - Document root:
- `kind: 'mcpConfigDocument'`
- `servers: MCPServerNode[]`

Both added to appropriate unions (BlockNode, IRNode).

### JSX Components (src/jsx.ts)

**MCPServerProps** - Generic interface for all transport types:
```typescript
interface MCPServerProps {
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}
```

**MCPStdioServerProps** - Type-safe stdio (command required):
```typescript
interface MCPStdioServerProps {
  name: string;
  command: string;  // Required
  args?: string[];
  env?: Record<string, string>;
}
```

**MCPHTTPServerProps** - Type-safe HTTP/SSE (url required):
```typescript
interface MCPHTTPServerProps {
  name: string;
  url: string;  // Required
  headers?: Record<string, string>;
}
```

Three component stubs with full JSDoc documentation and examples.

## Commits

| Hash | Description |
|------|-------------|
| 4f413f6 | feat(18-01): add MCPServerNode and MCPConfigDocumentNode to IR |
| 258950b | feat(18-01): add MCP server JSX components and props |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Plan 18-02 can proceed immediately:
- MCPServerNode ready for transformation
- MCPConfigDocumentNode ready as document root
- MCPServerProps provides prop types for transformer extraction
- Convenience components (MCPStdioServer, MCPHTTPServer) ready for handling

Known: emitter.ts:238 shows TypeScript error for unhandled MCPServerNode in assertNever - this is expected and will be resolved in 18-03 (emitter plan).
