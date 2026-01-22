/**
 * Playwright MCP Server Configuration
 */
import { MCPConfig, MCPStdioServer } from '../../jsx.js';

export default function PlaywrightServer() {
  return (
    <MCPConfig>
      <MCPStdioServer
        name="playwright"
        command="npx"
        args={["-y", "@anthropic/mcp-server-playwright"]}
      />
    </MCPConfig>
  );
}
