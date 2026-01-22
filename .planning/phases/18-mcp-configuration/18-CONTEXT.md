# Phase 18: MCP Configuration - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

TSX-based MCP server configuration that compiles to Claude Code `.claude/settings.json` format. Define MCP servers in TSX with full type safety, build generates/updates settings.json mcpServers section.

</domain>

<decisions>
## Implementation Decisions

### Server Type Handling
- Layered approach: Generic `MCPServer` component as base, plus specific wrappers
- Ship `MCPStdioServer` and `MCPSSEServer` as typed convenience components
- Document pattern for users to create custom wrappers
- Strict validation: Error at compile time if invalid prop combinations (e.g., stdio with `url` prop)

### Settings.json Merge Behavior
- TSX wins on conflicts: TSX-defined config always overwrites existing entries with same name
- Leave orphans: Only add/update servers, never auto-remove (user manually cleans up)
- Create minimal file: If settings.json doesn't exist, create with just mcpServers section

### File Organization
- Flexible source structure: Build collects MCPServer from any .tsx in `src/app/mcp/`
- Recommend `src/app/mcp/` as convention (documented, not enforced)
- Explicit directory scanning: Only scan `src/app/mcp/` for MCP configs

### Environment Variables
- Inline object only: `env={{ DEBUG: 'true', API_KEY: process.env.API_KEY }}`
- No special secret handling: Values written as-is, user's responsibility
- Build-time resolution: `process.env.X` resolved at build time to actual value
- Fail on missing: Build errors if referenced process.env variable is undefined

### Claude's Discretion
- Merge granularity details (preserve all vs update mcpServers only)
- Extensibility for future server types beyond stdio/sse
- Exact wrapper component implementation patterns

</decisions>

<specifics>
## Specific Ideas

- Generic MCPServer should work for any type by default
- Specific wrappers (MCPStdioServer, MCPSSEServer) provide better TypeScript inference
- Users should be able to create their own typed wrappers for custom patterns (documented pattern)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-mcp-configuration*
*Context gathered: 2026-01-22*
