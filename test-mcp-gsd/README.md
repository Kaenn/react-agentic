# GSD Progress MCP App

A visual progress dashboard for GSD projects using the **MCP Apps** architecture.

## What is MCP Apps?

MCP Apps let MCP servers return interactive HTML interfaces that render directly in the chat. Instead of just text, your tools can display dashboards, forms, charts, and more.

**Supported Hosts:**
- Claude Desktop (local stdio transport)
- Claude Web (claude.ai) - via Custom Connectors
- VS Code Insiders
- Goose

See: https://modelcontextprotocol.io/docs/extensions/apps

## Quick Start

```bash
# Install dependencies
npm install

# Build the UI
npm run build
```

## Claude Desktop Configuration (Recommended)

### Config File Location

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Full path on macOS:
```
/Users/<username>/Library/Application Support/Claude/claude_desktop_config.json
```

### Config Content

Add the `gsd-progress` server to your `mcpServers` object:

```json
{
  "mcpServers": {
    "gsd-progress": {
      "command": "bash",
      "args": [
        "-c",
        "export PATH=/Users/<username>/.nvm/versions/node/v22.19.0/bin:$PATH && cd /path/to/test-mcp-gsd && npx tsx server-stdio.ts"
      ]
    }
  }
}
```

**Example with actual paths:**

```json
{
  "mcpServers": {
    "gsd-progress": {
      "command": "bash",
      "args": [
        "-c",
        "export PATH=/Users/glenninizan/.nvm/versions/node/v22.19.0/bin:$PATH && cd /Users/glenninizan/workspace/react-agentic/react-agentic/test-mcp-gsd && npx tsx server-stdio.ts"
      ]
    }
  }
}
```

**Important Notes:**
- The `PATH` export ensures Node.js v22+ is used (required for `node:` imports)
- Adjust the Node path based on your installation (`which node` to find it)
- Adjust the project path to where you cloned this repo

### After Configuration

1. **Fully quit Claude Desktop** (Cmd+Q on macOS)
2. **Restart Claude Desktop**
3. The MCP server will connect automatically on startup

### Usage

In Claude Desktop, ask Claude to show project progress:

- "Show GSD progress"
- "Display project dashboard"
- Or Claude will use the `show-gsd-progress` tool when relevant

The visual dashboard will appear inline in the conversation.

## Alternative: Custom Connectors (HTTP Transport)

For Claude Web or remote access, use HTTP transport with Custom Connectors.

### Step 1: Start the HTTP server

```bash
npm run serve
```

The server starts on `http://localhost:3001/mcp`.

### Step 2: Start a tunnel

```bash
npx cloudflared tunnel --url http://localhost:3001
```

This gives you a public URL like `https://random-name.trycloudflare.com`.

### Step 3: Add as Custom Connector

1. Open Claude Desktop or claude.ai
2. Click your profile → **Settings** → **Connectors**
3. Click **Add custom connector**
4. Paste your tunnel URL: `https://random-name.trycloudflare.com/mcp`
5. Name it "GSD Progress"

## Project Structure

```
test-mcp-gsd/
├── server-stdio.ts       # MCP server (stdio transport for Claude Desktop)
├── server.ts             # MCP server (HTTP transport for Custom Connectors)
├── src/
│   └── mcp-app.ts        # UI client code (bundled into HTML)
├── mcp-app.html          # HTML template with styles
├── dist/
│   └── mcp-app.html      # Built HTML with bundled JS
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## How It Works

1. **Server** registers the `show-gsd-progress` tool and `ui://gsd-progress/dashboard.html` resource
2. **Tool Execution**: Reads `.planning/` files and returns project state as `structuredContent`
3. **UI Resource**: Claude fetches the HTML resource and renders it in an iframe
4. **Client** (`src/mcp-app.ts`): Receives tool result via `ontoolresult` callback and renders the dashboard

## Key Technical Details

### MCP Apps Requirements

| Requirement | Value |
|-------------|-------|
| MIME Type | `text/html;profile=mcp-app` |
| Resource URI | Must use `ui://` scheme |
| Input Schema | Must use Zod schemas (not JSON Schema) |
| SDK Version | `@modelcontextprotocol/sdk` v1.24.0+ |

### Dependencies

```json
{
  "@modelcontextprotocol/ext-apps": "^1.0.1",
  "@modelcontextprotocol/sdk": "^1.25.2",
  "zod": "^4.1.0"
}
```

## UI Features

- **Progress Wheel:** SVG circle showing overall completion %
- **Status Cards:** Current phase, plan, status, last activity
- **Phase List:** Color-coded phases with completion badges
- **Blockers Section:** Visual indicators for active blockers
- **Action Buttons:** Execute Next (sends message to Claude), Refresh (calls tool again)
- **Velocity Stats:** Plans completed, average duration, total time

## Troubleshooting

### "v3Schema.safeParseAsync is not a function"

The MCP SDK expects Zod schemas for `inputSchema`, not JSON Schema objects:

```typescript
// Wrong
inputSchema: { type: "object", properties: {} }

// Correct
import { z } from "zod";
inputSchema: z.object({})
```

### "Cannot find module 'node:path'"

Node.js version is too old. Ensure v22+ is in PATH:

```bash
export PATH=/path/to/node/v22/bin:$PATH
```

### Server not connecting

Check Claude Desktop logs:
- View → Developer → Developer Tools → Console
- Or check `~/Library/Logs/Claude/` for MCP server logs

### UI not rendering

1. Verify the resource returns correct MIME type: `text/html;profile=mcp-app`
2. Check that `ontoolresult` handler is set BEFORE calling `app.connect()` in the client
3. Ensure `dist/mcp-app.html` exists (run `npm run build`)

## Development

```bash
# Build the UI
npm run build

# Test stdio server locally
npx tsx server-stdio.ts

# Start HTTP server (for Custom Connectors)
npm run serve
```

### Test UI locally

Open `mcp-app.html` directly in a browser to see demo data (loads after 2s if no MCP connection).

## References

- [MCP Apps Docs](https://modelcontextprotocol.io/docs/extensions/apps)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [Custom Connectors Help](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
