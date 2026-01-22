# MCP Server Configuration

Configure MCP (Model Context Protocol) servers using TSX. Build compiles to Claude Code's `.claude/settings.json` format.

## Quick Start

```tsx
// src/app/mcp/servers.mcp.tsx
import { MCPConfig, MCPStdioServer } from 'react-agentic';

export default function Servers() {
  return (
    <MCPConfig>
      <MCPStdioServer
        name="sqlite"
        command="npx"
        args={["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/app.db"]}
      />
    </MCPConfig>
  );
}
```

Build and verify:

```bash
node dist/cli/index.js build "src/app/mcp/*.tsx"
cat .claude/settings.json
```

## Components

### MCPConfig

Wrapper component containing MCP server definitions. Required as root element.

```tsx
<MCPConfig>
  {/* MCPServer, MCPStdioServer, or MCPHTTPServer children */}
</MCPConfig>
```

### MCPStdioServer

Type-safe stdio server definition. Use for local MCP servers.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Server identifier (key in settings.json) |
| `command` | string | Yes | Executable command |
| `args` | string[] | No | Command arguments |
| `env` | object | No | Environment variables |

```tsx
<MCPStdioServer
  name="sqlite"
  command="npx"
  args={["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/app.db"]}
  env={{ DEBUG: "true" }}
/>
```

### MCPHTTPServer

Type-safe HTTP server definition. Use for remote MCP servers.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Server identifier |
| `url` | string | Yes | Remote server URL |
| `headers` | object | No | HTTP headers |

```tsx
<MCPHTTPServer
  name="remote-api"
  url="https://api.example.com/mcp"
  headers={{ "Authorization": "Bearer ${API_KEY}" }}
/>
```

### MCPServer (Generic)

Generic component supporting all transport types. Use when you need explicit type control.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Server identifier |
| `type` | 'stdio' \| 'http' \| 'sse' | Yes | Transport type |
| `command` | string | stdio only | Executable command |
| `args` | string[] | No | Command arguments |
| `url` | string | http/sse only | Remote URL |
| `headers` | object | No | HTTP headers |
| `env` | object | No | Environment variables |

## Output Format

Build produces `.claude/settings.json`:

```json
{
  "mcpServers": {
    "sqlite": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/app.db"],
      "env": { "DEBUG": "true" }
    }
  }
}
```

## Merge Behavior

- **TSX wins on conflicts:** TSX-defined servers overwrite existing entries with same name
- **Other settings preserved:** Only `mcpServers` section is modified
- **Multiple files merge:** All MCP config files combine into single settings.json

## Environment Variables

Environment variables in `env` prop can reference `process.env`:

```tsx
<MCPStdioServer
  name="database"
  command="npx"
  args={["-y", "mcp-server-postgres"]}
  env={{
    DATABASE_URL: process.env.DATABASE_URL,  // Resolved at build time
    DEBUG: "false",                           // Literal value
  }}
/>
```

**Build fails if referenced env var is undefined.**

## File Organization

Recommended structure:

```
src/app/mcp/
  servers.mcp.tsx     # Main MCP servers
  database.mcp.tsx    # Database-related servers
  testing.mcp.tsx     # Testing/dev servers
```

All `.tsx` files in `src/app/mcp/` are processed and merged into single `settings.json`.

## Common Patterns

### SQLite Database

```tsx
<MCPStdioServer
  name="sqlite"
  command="npx"
  args={["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/app.db"]}
/>
```

### Filesystem Access

```tsx
<MCPStdioServer
  name="filesystem"
  command="npx"
  args={["-y", "@anthropic/mcp-server-filesystem", "--root", "."]}
/>
```

### Playwright Browser

```tsx
<MCPStdioServer
  name="playwright"
  command="npx"
  args={["-y", "@anthropic/mcp-server-playwright"]}
/>
```

### Remote API

```tsx
<MCPHTTPServer
  name="api"
  url="https://api.example.com/mcp"
  headers={{ "Authorization": "Bearer ${API_KEY}" }}
/>
```

## Compile-Time Validation

The build will fail with helpful errors for:

- Missing required props (`name`, `command` for stdio, `url` for http)
- Invalid prop combinations (`type="stdio"` with `url` prop)
- Undefined environment variables in `env` prop

## See Also

- [Claude Code MCP Documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
