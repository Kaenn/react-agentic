/**
 * Scenario 8.1: MCPStdioServer Configuration
 *
 * Goal: Confirm that <MCPStdioServer> generates correct settings.json
 * entry for stdio-based MCP servers.
 *
 * Success Criteria:
 * - Settings.json includes the MCP server entry
 * - Command and args are correctly specified
 * - Environment variables are included
 * - Server type is "stdio"
 */
import { MCPConfig, MCPStdioServer } from '../../jsx.js';

export default function TestMCPStdioServer() {
  return (
    <MCPConfig>
      {/* Test server with full configuration - uses real MCP filesystem server */}
      <MCPStdioServer
        name="test-fs-server"
        command="npx"
        args={["-y", "@modelcontextprotocol/server-filesystem", "."]}
        env={{
          DEBUG: "true",
          MCP_LOG_LEVEL: "info"
        }}
      />
    </MCPConfig>
  );
}
