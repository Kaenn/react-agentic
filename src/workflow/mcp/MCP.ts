/**
 * JSX component stubs for react-agentic - MCP Server Configuration
 *
 * These components are compile-time only - they're transformed by the transpiler
 * and never executed at runtime. They exist to provide TypeScript type checking.
 */

import type { ReactNode } from 'react';

/**
 * Props for the MCPServer component
 * Generic MCP server definition supporting all transport types
 */
export interface MCPServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Transport type */
  type: 'stdio' | 'http' | 'sse';
  /** Stdio: executable command (required when type="stdio") */
  command?: string;
  /** Stdio: command arguments */
  args?: string[];
  /** HTTP/SSE: remote URL (required when type="http" or type="sse") */
  url?: string;
  /** HTTP/SSE: request headers */
  headers?: Record<string, string>;
  /** Environment variables passed to server process */
  env?: Record<string, string>;
}

/**
 * Props for MCPStdioServer convenience component
 * Type-safe stdio server definition
 */
export interface MCPStdioServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Executable command */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Props for MCPHTTPServer convenience component
 * Type-safe HTTP/SSE server definition
 */
export interface MCPHTTPServerProps {
  /** Server name (key in mcpServers object) */
  name: string;
  /** Remote URL */
  url: string;
  /** Request headers */
  headers?: Record<string, string>;
}

/**
 * Props for the MCPConfig component
 */
export interface MCPConfigProps {
  /** MCP server definitions */
  children?: ReactNode;
}

/**
 * MCPServer component - defines an MCP server in settings.json
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Emits to .claude/settings.json mcpServers section.
 *
 * @example Stdio server
 * <MCPServer
 *   name="sqlite"
 *   type="stdio"
 *   command="npx"
 *   args={["-y", "mcp-server-sqlite", "--db-path", "./data/state.db"]}
 *   env={{ DEBUG: "true" }}
 * />
 *
 * @example HTTP server
 * <MCPServer
 *   name="remote-api"
 *   type="http"
 *   url="https://api.example.com/mcp"
 *   headers={{ "Authorization": "Bearer ${API_KEY}" }}
 * />
 */
export function MCPServer(_props: MCPServerProps): null {
  return null;
}

/**
 * MCPStdioServer component - type-safe stdio MCP server definition
 *
 * Convenience wrapper for MCPServer with type="stdio".
 * Provides better TypeScript inference by requiring command prop.
 *
 * @example
 * <MCPStdioServer
 *   name="sqlite"
 *   command="npx"
 *   args={["-y", "mcp-server-sqlite", "--db-path", "./data/state.db"]}
 * />
 */
export function MCPStdioServer(_props: MCPStdioServerProps): null {
  return null;
}

/**
 * MCPHTTPServer component - type-safe HTTP MCP server definition
 *
 * Convenience wrapper for MCPServer with type="http".
 * Provides better TypeScript inference by requiring url prop.
 *
 * @example
 * <MCPHTTPServer
 *   name="remote-api"
 *   url="https://api.example.com/mcp"
 *   headers={{ "Authorization": "Bearer ${API_KEY}" }}
 * />
 */
export function MCPHTTPServer(_props: MCPHTTPServerProps): null {
  return null;
}

/**
 * MCPConfig component - wraps multiple MCP server definitions
 *
 * This is a compile-time component transformed by react-agentic.
 * It's never executed at runtime. Produces settings.json mcpServers section.
 *
 * @example
 * <MCPConfig>
 *   <MCPStdioServer
 *     name="sqlite"
 *     command="npx"
 *     args={["-y", "mcp-server-sqlite", "--db-path", "./data/state.db"]}
 *   />
 *   <MCPHTTPServer
 *     name="remote-api"
 *     url="https://api.example.com/mcp"
 *   />
 * </MCPConfig>
 */
export function MCPConfig(_props: MCPConfigProps): null {
  return null;
}
