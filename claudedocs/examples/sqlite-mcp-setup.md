# SQLite MCP Server Setup

SQLite is an embedded database (a single file) - no server needed. The MCP server is a lightweight Node.js process that provides Claude Code access to your SQLite database.

## Quick Start

### 1. Create a database directory

```bash
mkdir -p ~/.local/share/sqlite-mcp
```

### 2. Configure Claude Code

Add to your `~/.claude.json`:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic/mcp-server-sqlite",
        "--db-path",
        "/Users/glenninizan/.local/share/sqlite-mcp/dev.db"
      ]
    }
  }
}
```

### 3. Restart Claude Code

```bash
# Exit and restart Claude Code for MCP changes to take effect
claude
```

### 4. Verify it works

In Claude Code, you should now have access to SQLite tools. Try:
- Creating tables
- Inserting data
- Running queries

## Available MCP Tools

Once configured, Claude Code gains these capabilities:

| Tool | Description |
|------|-------------|
| `read_query` | Execute SELECT queries |
| `write_query` | Execute INSERT/UPDATE/DELETE |
| `create_table` | Create new tables |
| `list_tables` | Show all tables |
| `describe_table` | Show table schema |

## Multiple Databases

You can configure multiple SQLite databases:

```json
{
  "mcpServers": {
    "sqlite-dev": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-sqlite", "--db-path", "~/.local/share/sqlite-mcp/dev.db"]
    },
    "sqlite-test": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-sqlite", "--db-path", "~/.local/share/sqlite-mcp/test.db"]
    }
  }
}
```

## Troubleshooting

### MCP server not appearing

1. Check your `~/.claude.json` syntax (valid JSON?)
2. Ensure the db-path directory exists
3. Restart Claude Code completely

### Permission errors

```bash
# Ensure directory is writable
chmod 755 ~/.local/share/sqlite-mcp
```

### Check MCP status

In Claude Code, run `/mcp` to see connected servers.
