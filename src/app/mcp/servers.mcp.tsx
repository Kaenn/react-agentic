/**
 * Example MCP Server Configuration
 *
 * This file demonstrates how to configure MCP servers using TSX.
 * Build with: node dist/cli/index.js build "src/app/mcp/*.tsx"
 * Output: .claude/settings.json (merged)
 */
import {
  MCPConfig,
  MCPStdioServer,
  MCPHTTPServer,
} from '../../jsx.js';

export default function Servers() {
  return (
    <MCPConfig>
      {/* SQLite database server - stdio transport */}
      <MCPStdioServer
        name="sqlite"
        command="npx"
        args={["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/app.db"]}
        env={{ DEBUG: "false" }}
      />

      {/* Filesystem server - provides read/write access to project files */}
      <MCPStdioServer
        name="filesystem"
        command="npx"
        args={["-y", "@anthropic/mcp-server-filesystem", "--root", "."]}
      />

      {/* Example HTTP server (commented - uncomment to use)
      <MCPHTTPServer
        name="remote-api"
        url="https://api.example.com/mcp"
        headers={{ "Authorization": "Bearer ${API_KEY}" }}
      />
      */}
    </MCPConfig>
  );
}
