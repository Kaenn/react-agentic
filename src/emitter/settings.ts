/**
 * Settings.json Emitter - MCP configuration to Claude Code settings
 *
 * Converts MCPConfigDocumentNode to JSON format and handles
 * merging with existing settings.json content.
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
 * Convert MCPServerNode to settings.json config format
 */
function serverNodeToConfig(node: MCPServerNode): MCPServerConfig {
  const config: MCPServerConfig = {
    type: node.type,
  };

  // Stdio-specific
  if (node.command) config.command = node.command;
  if (node.args && node.args.length > 0) config.args = node.args;

  // HTTP/SSE-specific
  if (node.url) config.url = node.url;
  if (node.headers && Object.keys(node.headers).length > 0) {
    config.headers = node.headers;
  }

  // Common
  if (node.env && Object.keys(node.env).length > 0) {
    config.env = node.env;
  }

  return config;
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
 * Merge MCP servers into existing settings.json
 *
 * Read-modify-write pattern:
 * 1. Read existing settings.json (or start fresh)
 * 2. Update only mcpServers section
 * 3. Write back with pretty formatting
 *
 * @param settingsPath - Path to settings.json
 * @param servers - New mcpServers to merge
 */
export async function mergeSettings(
  settingsPath: string,
  servers: Record<string, MCPServerConfig>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let existing: Record<string, any> = {};

  // Read existing settings if present
  try {
    const content = await readFile(settingsPath, 'utf-8');
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

  // Ensure directory exists
  const dir = path.dirname(settingsPath);
  await mkdir(dir, { recursive: true });

  // Write back with pretty formatting (2-space indent)
  await writeFile(settingsPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
}
