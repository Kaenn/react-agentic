/**
 * MCP Configuration Emitter - MCP configuration to Claude Code .mcp.json
 *
 * Converts MCPConfigDocumentNode to JSON format and handles
 * merging with existing .mcp.json content.
 *
 * Output: .mcp.json in project root (project-level MCP configuration)
 * Format: { "mcpServers": { "name": { command, args, env } } }
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { MCPServerNode, MCPConfigDocumentNode } from '../ir/nodes.js';

/**
 * MCP server configuration format for settings.json
 */
interface MCPServerConfig {
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

/**
 * Convert MCPServerNode to .mcp.json config format
 *
 * Note: For stdio servers (the default), we omit the `type` field
 * to match Claude Code's expected format.
 */
function serverNodeToConfig(node: MCPServerNode): MCPServerConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {};

  // Stdio-specific (type field omitted - stdio is the default)
  if (node.command) config.command = node.command;
  if (node.args && node.args.length > 0) config.args = node.args;

  // HTTP/SSE-specific - these need the type field
  if (node.type === 'http' || node.type === 'sse') {
    config.type = node.type;
  }
  if (node.url) config.url = node.url;
  if (node.headers && Object.keys(node.headers).length > 0) {
    config.headers = node.headers;
  }

  // Common
  if (node.env && Object.keys(node.env).length > 0) {
    config.env = node.env;
  }

  return config as MCPServerConfig;
}

/**
 * Convert MCPConfigDocumentNode to mcpServers object
 *
 * @param doc - MCP config document from transformer
 * @returns mcpServers object keyed by server name
 */
export function emitSettings(
  doc: MCPConfigDocumentNode
): Record<string, MCPServerConfig> {
  const servers: Record<string, MCPServerConfig> = {};

  for (const server of doc.servers) {
    servers[server.name] = serverNodeToConfig(server);
  }

  return servers;
}

/**
 * Merge MCP servers into existing .mcp.json
 *
 * Read-modify-write pattern:
 * 1. Read existing .mcp.json (or start fresh)
 * 2. Update only mcpServers section
 * 3. Write back with pretty formatting
 *
 * @param mcpPath - Path to .mcp.json (typically in project root)
 * @param servers - New mcpServers to merge
 */
export async function mergeSettings(
  mcpPath: string,
  servers: Record<string, MCPServerConfig>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existing: Record<string, any> = {};

  // Read existing .mcp.json if present
  try {
    const content = await readFile(mcpPath, 'utf-8');
    existing = JSON.parse(content);
  } catch (error) {
    // File doesn't exist or invalid JSON - start fresh
    // Only mcpServers section will be created
  }

  // Merge mcpServers section (TSX wins on conflicts)
  existing.mcpServers = {
    ...(existing.mcpServers || {}),
    ...servers,
  };

  // Ensure directory exists (for nested paths, no-op for project root)
  const dir = path.dirname(mcpPath);
  if (dir && dir !== '.') {
    await mkdir(dir, { recursive: true });
  }

  // Write back with pretty formatting (2-space indent)
  await writeFile(mcpPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}
