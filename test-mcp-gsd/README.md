# GSD Progress MCP App

A visual progress dashboard for GSD projects using the **MCP Apps** architecture.

## What is MCP Apps?

MCP Apps let MCP servers return interactive HTML interfaces that render directly in the chat. Instead of just text, your tools can display dashboards, forms, charts, and more.

**Supported Hosts:**
- Claude Web (claude.ai) - via Custom Connectors
- Claude Desktop - via Custom Connectors (Pro/Max/Team plans)
- VS Code Insiders
- Goose
- ChatGPT (launching Jan 2026)

See: https://modelcontextprotocol.io/docs/extensions/apps

## Quick Start

```bash
# Install dependencies
npm install

# Build the UI and server
npm run build

# Start the server
npm run serve
```

The server starts on `http://localhost:3001/mcp`.

## Using with Claude Desktop

MCP Apps require **HTTP transport** and **Custom Connectors**, not the stdio config you might be used to.

### Step 1: Start a tunnel

Since Claude Desktop needs to reach your local server, use cloudflared:

```bash
npx cloudflared tunnel --url http://localhost:3001
```

This gives you a public URL like `https://random-name.trycloudflare.com`.

### Step 2: Add as Custom Connector

1. Open Claude Desktop
2. Click your profile → **Settings** → **Connectors**
3. Click **Add custom connector**
4. Paste your tunnel URL: `https://random-name.trycloudflare.com/mcp`
5. Name it "GSD Progress"

### Step 3: Use it

In a Claude conversation, say:
> "Show me project progress"

Claude will call the `show-gsd-progress` tool and render the interactive dashboard.

## Project Structure

```
test-mcp-gsd/
├── package.json          # Dependencies with @modelcontextprotocol/ext-apps
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Bundles HTML+JS into single file
├── server.ts             # MCP server with HTTP transport
├── mcp-app.html          # UI entry point
└── src/
    └── mcp-app.ts        # UI logic using ext-apps SDK
```

## Key Differences from Standard MCP

| Standard MCP | MCP Apps |
|--------------|----------|
| Stdio transport | HTTP transport |
| `@modelcontextprotocol/sdk` only | `@modelcontextprotocol/ext-apps` |
| Returns text/JSON | Returns interactive HTML |
| `gsd://` custom scheme | `ui://` scheme required |
| `mimeType: "text/html"` | `mimeType: RESOURCE_MIME_TYPE` |
| Claude Desktop config JSON | Custom Connectors |

## Server Features

### Tool: `show-gsd-progress`

Returns project state from `.planning/` directory.

**Input:**
- `format`: `"visual"` (interactive dashboard) or `"text"` (terminal output)

**Visual mode returns:**
- `content`: Summary text for LLM
- `structuredContent`: Full data for UI (hidden from LLM)

### Resource: `ui://gsd-progress/dashboard.html`

The bundled HTML/JS UI that renders in the chat.

## UI Features

- **Progress Wheel:** SVG circle showing overall completion %
- **Status Cards:** Current phase, plan, status, last activity
- **Phase List:** Color-coded phases with completion badges
- **Blockers Section:** Visual indicators for active blockers
- **Action Buttons:** Execute Next (sends message to Claude), Refresh (calls tool again)
- **Velocity Stats:** Plans completed, average duration, total time

## Development

### Test UI locally

Open `mcp-app.html` directly in a browser to see demo data (loads after 2s if no MCP connection).

### Test with basic-host

The ext-apps repo includes a test host:

```bash
git clone https://github.com/modelcontextprotocol/ext-apps.git
cd ext-apps/examples/basic-host
npm install
SERVERS='["http://localhost:3001"]' npm start
```

Then open `http://localhost:8080` and call the tool.

## Troubleshooting

### "Tool not found"
- Make sure the server is running: `npm run serve`
- Check the tunnel is active
- Verify Custom Connector URL ends with `/mcp`

### UI shows "Loading..."
- Tool result may not have arrived yet
- Check browser console for errors
- Try refreshing the page

### "CORS error"
- Server includes CORS middleware, should work
- If using a proxy, ensure it passes CORS headers

## References

- [MCP Apps Docs](https://modelcontextprotocol.io/docs/extensions/apps)
- [MCP Apps SDK](https://github.com/modelcontextprotocol/ext-apps)
- [Custom Connectors Help](https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
