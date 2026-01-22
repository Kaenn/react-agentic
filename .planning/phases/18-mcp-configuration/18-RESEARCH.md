# Phase 18: MCP Configuration - Research

**Researched:** 2026-01-22
**Domain:** MCP Server Configuration / JSON Generation / Claude Code Settings
**Confidence:** HIGH

## Summary

Phase 18 adds TSX-based MCP server configuration that compiles to Claude Code's `settings.json` format. This is a JSON-output feature (unlike previous markdown-output phases), requiring a new emitter pattern and merge-aware file writing.

Research identified:
1. Claude Code uses `.claude/settings.json` for project-scoped MCP configuration (not `.mcp.json` as that's for CLI-added servers)
2. Two transport types: `stdio` (local process) and `http`/`sse` (remote servers)
3. The existing `FileAdapter` pattern provides a model for JSON read/write with merge semantics
4. The Skill multi-file output pattern shows how to handle non-markdown build outputs

**Primary recommendation:** Create `MCPServerNode` IR type, new JSON emitter function, and settings.json merge logic that reads existing content, updates only `mcpServers`, and preserves all other settings.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js fs/promises | native | File I/O for settings.json | Already used throughout codebase |
| JSON | native | Parse/stringify settings | No external dependency needed |
| ts-morph | existing | Parse MCPServer JSX elements | Already used for all parsing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| path | native | Path resolution for settings.json | Already used in build.ts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native JSON | jsonc-parser | Handles JSON with comments, but settings.json is standard JSON |
| Manual merge | deep-merge lib | More features but overkill for flat mcpServers merge |

**Installation:**
No new dependencies required - uses existing codebase patterns.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/mcp/           # MCP configuration TSX files
│   ├── sqlite.mcp.tsx
│   └── playwright.mcp.tsx
├── ir/
│   └── nodes.ts       # Add MCPServerNode type
├── parser/
│   └── transformer.ts # Add MCPServer transformation
├── emitter/
│   ├── emitter.ts     # Existing markdown emitter
│   └── settings.ts    # NEW: JSON settings emitter
└── cli/
    └── commands/
        └── build.ts   # Handle MCP config files
```

### Pattern 1: MCPServerNode IR Type
**What:** Discriminated union member for MCP server configuration
**When to use:** For all MCPServer component transformations
**Example:**
```typescript
// Source: Follows existing IR pattern from nodes.ts
export interface MCPServerNode {
  kind: 'mcpServer';
  name: string;
  type: 'stdio' | 'http' | 'sse';
  // Stdio-specific
  command?: string;
  args?: string[];
  // HTTP/SSE-specific
  url?: string;
  headers?: Record<string, string>;
  // Common
  env?: Record<string, string>;
}

export interface MCPConfigDocumentNode {
  kind: 'mcpConfigDocument';
  servers: MCPServerNode[];
}
```

### Pattern 2: Settings.json Merge Strategy
**What:** Read-modify-write pattern preserving existing settings
**When to use:** When writing to settings.json
**Example:**
```typescript
// Source: Follows FileAdapter pattern from file-adapter.ts
async function mergeSettings(
  settingsPath: string,
  servers: Record<string, MCPServerConfig>
): Promise<void> {
  let existing: Record<string, unknown> = {};

  // Read existing if present
  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    existing = JSON.parse(content);
  } catch {
    // File doesn't exist - create fresh
  }

  // Merge only mcpServers section
  existing.mcpServers = {
    ...(existing.mcpServers as Record<string, unknown> || {}),
    ...servers,
  };

  // Write back with pretty formatting
  await fs.writeFile(settingsPath, JSON.stringify(existing, null, 2), 'utf-8');
}
```

### Pattern 3: Build Routing by File Location
**What:** Route MCP config files differently from commands/agents/skills
**When to use:** When processing `src/app/mcp/*.tsx` files
**Example:**
```typescript
// Source: Follows existing routing pattern in build.ts
if (doc.kind === 'mcpConfigDocument') {
  // Collect all servers, merge into settings.json at end
  mcpResults.push(...doc.servers);
} else if (doc.kind === 'agentDocument') {
  // Existing agent handling
}

// After processing all files:
if (mcpResults.length > 0) {
  await mergeSettings('.claude/settings.json', mcpServersToConfig(mcpResults));
}
```

### Anti-Patterns to Avoid
- **Full file replacement:** Never replace entire settings.json - only update mcpServers section
- **Orphan cleanup:** Don't auto-remove servers not in TSX - user may have CLI-added servers
- **Type coercion:** Don't allow `type="stdio"` with `url` prop - validate at transform time

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON pretty-print | Custom formatter | `JSON.stringify(obj, null, 2)` | Standard, handles all edge cases |
| Deep merge | Manual recursion | Shallow merge for mcpServers | Only need one-level merge |
| File exists check | fs.existsSync | try/catch on read | Async-safe, already used in FileAdapter |
| Path construction | String concatenation | `path.join()` | Cross-platform path handling |

**Key insight:** The settings.json mcpServers structure is flat (server names are top-level keys), so deep merge is unnecessary. Simple object spread handles the merge.

## Common Pitfalls

### Pitfall 1: SSE vs HTTP Type Confusion
**What goes wrong:** Using "sse" type when "http" is the current standard
**Why it happens:** SSE was the original remote transport, HTTP replaced it
**How to avoid:** Document that `type="sse"` is deprecated, recommend `type="http"` for remote servers
**Warning signs:** MCP server fails to connect with SSE type

### Pitfall 2: Environment Variable Resolution
**What goes wrong:** Writing `process.env.API_KEY` as string instead of resolved value
**Why it happens:** TSX expressions can be misinterpreted as literal strings
**How to avoid:** Context specifies "Build-time resolution: `process.env.X` resolved at build time to actual value. Fail on missing."
**Warning signs:** Settings.json contains "process.env.API_KEY" string literal

### Pitfall 3: Clobbering User Settings
**What goes wrong:** Overwriting permissions, model, or other settings
**Why it happens:** Writing entire settings object instead of merging
**How to avoid:** Read existing, merge only mcpServers, write back
**Warning signs:** User's permission rules disappear after build

### Pitfall 4: Invalid Prop Combinations
**What goes wrong:** Allowing `<MCPServer type="stdio" url="..." />`
**Why it happens:** Missing compile-time validation
**How to avoid:** Transformer validates: stdio requires command/args, http/sse requires url
**Warning signs:** Generated config has conflicting properties

### Pitfall 5: Relative Paths in Args
**What goes wrong:** Relative paths break when Claude Code runs from different directory
**Why it happens:** User specifies `--db-path ./data/db.sqlite` without absolute path
**How to avoid:** Document that paths in args should be absolute or use `${cwd}` placeholder
**Warning signs:** MCP server can't find database/config files

## Code Examples

Verified patterns from official sources and existing codebase:

### Claude Code settings.json mcpServers Format
```json
// Source: https://code.claude.com/docs/en/mcp
{
  "mcpServers": {
    "sqlite": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-server-sqlite", "--db-path", "/abs/path/to/db.sqlite"],
      "env": {
        "DEBUG": "true"
      }
    },
    "remote-api": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

### TSX Component Signature (Following Existing Patterns)
```typescript
// Source: Follows CommandProps/AgentProps pattern from jsx.ts
export interface MCPServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Transport type */
  type: 'stdio' | 'http' | 'sse';
  /** Stdio: executable command */
  command?: string;
  /** Stdio: command arguments */
  args?: string[];
  /** HTTP/SSE: remote URL */
  url?: string;
  /** HTTP/SSE: request headers */
  headers?: Record<string, string>;
  /** Environment variables */
  env?: Record<string, string>;
}
```

### Transformer Validation Pattern
```typescript
// Source: Follows existing validation in transformSkill/transformAgent
private transformMCPServer(node: JsxElement | JsxSelfClosingElement): MCPServerNode {
  const openingElement = Node.isJsxElement(node)
    ? node.getOpeningElement()
    : node;

  const name = getAttributeValue(openingElement, 'name');
  const type = getAttributeValue(openingElement, 'type') as 'stdio' | 'http' | 'sse';

  if (!name) {
    throw this.createError('MCPServer requires name prop', openingElement);
  }
  if (!type) {
    throw this.createError('MCPServer requires type prop', openingElement);
  }

  // Validate prop combinations
  if (type === 'stdio') {
    const command = getAttributeValue(openingElement, 'command');
    if (!command) {
      throw this.createError('MCPServer type="stdio" requires command prop', openingElement);
    }
    const url = getAttributeValue(openingElement, 'url');
    if (url) {
      throw this.createError('MCPServer type="stdio" cannot have url prop', openingElement);
    }
  } else {
    const url = getAttributeValue(openingElement, 'url');
    if (!url) {
      throw this.createError(`MCPServer type="${type}" requires url prop`, openingElement);
    }
  }

  // ... extract remaining props
}
```

### Convenience Wrappers Pattern
```typescript
// Source: Context decision - "Ship MCPStdioServer and MCPSSEServer as typed convenience components"
export interface MCPStdioServerProps {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPHTTPServerProps {
  name: string;
  url: string;
  headers?: Record<string, string>;
}

// Internally just set type and delegate to MCPServer
export function MCPStdioServer(props: MCPStdioServerProps): null { return null; }
export function MCPHTTPServer(props: MCPHTTPServerProps): null { return null; }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SSE transport | HTTP transport | MCP spec 2025 | SSE deprecated, use HTTP for remote servers |
| ~/.claude.json mcpServers | .claude/settings.json | Claude Code 2025 | Project-scoped config is now standard |
| Manual JSON editing | CLI `claude mcp add` | Claude Code 2025 | Users can choose TSX or CLI |

**Deprecated/outdated:**
- `type="sse"`: Still works but HTTP is preferred for remote servers
- `~/.claude.json` for project servers: Use `.claude/settings.json` for project-scoped config

## Open Questions

Things that couldn't be fully resolved:

1. **Headers in HTTP transport**
   - What we know: HTTP type supports `headers` for auth tokens
   - What's unclear: Whether headers should support `${VAR}` expansion at runtime or build time
   - Recommendation: Support `${VAR}` syntax in output (Claude Code expands these at runtime)

2. **Multiple MCP config files**
   - What we know: Context says "scan `src/app/mcp/` for MCP configs"
   - What's unclear: Order of processing when multiple files define same server name
   - Recommendation: Last-write-wins (alphabetical file order), document this

3. **Validation of command/args at build time**
   - What we know: We can validate prop presence
   - What's unclear: Should we validate command exists on filesystem?
   - Recommendation: Don't validate at build time - may run on different machine

## Sources

### Primary (HIGH confidence)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp) - Complete schema, transport types, all properties
- [Claude Code Settings Documentation](https://code.claude.com/docs/en/settings) - Settings.json structure and precedence
- Existing codebase: `src/ir/nodes.ts`, `src/parser/transformer.ts`, `src/emitter/emitter.ts` - Patterns to follow

### Secondary (MEDIUM confidence)
- [MCP Protocol Local Servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers) - stdio/SSE transport details
- [Scott Spence MCP Config Guide](https://scottspence.com/posts/configuring-mcp-tools-in-claude-code) - Real-world usage patterns

### Tertiary (LOW confidence)
- None - all critical claims verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, follows existing patterns
- Architecture: HIGH - Modeled after existing Skill/State patterns in codebase
- Pitfalls: HIGH - Based on official Claude Code documentation and Context decisions

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable feature, Claude Code settings format unlikely to change)
