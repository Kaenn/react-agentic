/**
 * Release Manager MCP Configuration
 *
 * Configures SQLite database server for release tracking.
 * Build with: node dist/cli/index.js build "src/app/release/release.mcp.tsx"
 * Output: .claude/settings.json (merged)
 *
 * Database Schema:
 * - releases: Tracks version releases with metadata
 * - config: Key-value store for release configuration
 */
import { MCPConfig, MCPStdioServer } from '../../jsx.js';

export default function ReleaseMCPConfig() {
  return (
    <MCPConfig>
      {/* SQLite database server for release tracking */}
      <MCPStdioServer
        name="release-db"
        command="npx"
        args={["-y", "@anthropic/mcp-server-sqlite", "--db-path", "./data/releases.db"]}
        env={{ DEBUG: "false" }}
      />
    </MCPConfig>
  );
}
