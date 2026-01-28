/**
 * GSD Progress MCP App Server
 *
 * Uses the MCP Apps architecture with HTTP transport for Claude Desktop.
 * See: https://modelcontextprotocol.io/docs/extensions/apps
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import cors from "cors";
import express from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

console.log("Starting GSD Progress MCP App Server...");

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types for parsed data
interface PhaseStatus {
  number: number;
  name: string;
  milestone: string;
  plansComplete: string;
  status: "Complete" | "In Progress" | "Not Started";
  completed?: string;
}

interface ProjectState {
  projectName: string;
  coreValue: string;
  currentPhase: number;
  currentPhaseName: string;
  currentPlan: string;
  status: string;
  lastActivity: string;
  progressBar: string;
  nextAction: string;
  blockers: string[];
  phases: PhaseStatus[];
  milestones: string[];
  velocity: {
    totalPlans: number;
    avgDuration: string;
    totalTime: string;
  };
  completion: number;
}

// Find planning directory - check multiple locations
function findPlanningDir(): string {
  const candidates: string[] = [];

  // 1. Environment variable (highest priority)
  if (process.env.GSD_PLANNING_DIR) {
    candidates.push(process.env.GSD_PLANNING_DIR);
  }

  // 2. Relative to script location
  candidates.push(path.join(__dirname, "..", ".planning"));
  candidates.push(path.join(__dirname, ".planning"));

  // 3. Relative to CWD
  const cwd = process.cwd();
  candidates.push(path.join(cwd, ".planning"));
  candidates.push(path.join(cwd, "..", ".planning"));

  // 4. Hardcoded fallback for this project
  candidates.push("/Users/glenninizan/workspace/react-agentic/react-agentic/.planning");

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.log(`Found .planning at: ${candidate}`);
      return candidate;
    }
  }

  throw new Error(`Could not find .planning directory. Searched: ${candidates.join(", ")}`);
}

// Parse STATE.md
function parseStateMd(content: string): Partial<ProjectState> {
  const lines = content.split("\n");
  const result: Partial<ProjectState> = {
    blockers: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Phase:")) {
      const match = line.match(/Phase:\s*(\d+)\s*\(([^)]+)\)/);
      if (match) {
        result.currentPhase = parseInt(match[1], 10);
        result.currentPhaseName = match[2];
      }
    }
    if (line.startsWith("Plan:")) {
      result.currentPlan = line.replace("Plan:", "").trim();
    }
    if (line.startsWith("Status:")) {
      result.status = line.replace("Status:", "").trim();
    }
    if (line.startsWith("Last activity:")) {
      result.lastActivity = line.replace("Last activity:", "").trim();
    }
    if (line.startsWith("Progress:")) {
      result.progressBar = line.replace("Progress:", "").trim();
    }
    if (line.startsWith("Next:")) {
      result.nextAction = line.replace("Next:", "").trim();
    }

    // Parse blockers
    if (line.includes("### Blockers") || line.includes("## Blockers")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("#")) {
        const blockerLine = lines[i].trim();
        if (blockerLine.startsWith("-") || (blockerLine.length > 0 && !blockerLine.startsWith("None"))) {
          if (blockerLine.startsWith("-")) {
            result.blockers!.push(blockerLine.substring(1).trim());
          } else if (blockerLine !== "None." && blockerLine.length > 0) {
            result.blockers!.push(blockerLine);
          }
        }
        i++;
      }
    }

    // Parse velocity
    if (line.includes("**Velocity:**")) {
      result.velocity = { totalPlans: 0, avgDuration: "", totalTime: "" };
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const velLine = lines[j];
        if (velLine.includes("Total plans completed:")) {
          const match = velLine.match(/(\d+)/);
          if (match) result.velocity.totalPlans = parseInt(match[1], 10);
        }
        if (velLine.includes("Average duration:")) {
          result.velocity.avgDuration = velLine.split(":").pop()?.trim() || "";
        }
        if (velLine.includes("Total execution time:")) {
          result.velocity.totalTime = velLine.split(":").pop()?.trim() || "";
        }
      }
    }
  }

  return result;
}

// Parse ROADMAP.md
function parseRoadmapMd(content: string): { phases: PhaseStatus[]; milestones: string[] } {
  const phases: PhaseStatus[] = [];
  const milestones: string[] = [];

  // Use Array.from to convert iterator
  const milestoneMatches = Array.from(content.matchAll(/\*\*v[\d.]+[^*]+\*\*/g));
  for (const match of milestoneMatches) {
    milestones.push(match[0].replace(/\*\*/g, "").trim());
  }

  const tableMatch = content.match(/\| Phase \|.*?\n\|[-|\s]+\n([\s\S]*?)(?=\n\n|\n---|\n##|$)/);
  if (tableMatch) {
    const rows = tableMatch[1].trim().split("\n");
    for (const row of rows) {
      if (!row.includes("|")) continue;
      const cells = row.split("|").map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length >= 5) {
        const phaseMatch = cells[0].match(/(\d+)\.\s*(.+)/);
        if (phaseMatch) {
          phases.push({
            number: parseInt(phaseMatch[1], 10),
            name: phaseMatch[2],
            milestone: cells[1],
            plansComplete: cells[2],
            status: cells[3] as PhaseStatus["status"],
            completed: cells[4] !== "-" ? cells[4] : undefined,
          });
        }
      }
    }
  }

  return { phases, milestones };
}

// Parse PROJECT.md
function parseProjectMd(content: string): { projectName: string; coreValue: string } {
  let projectName = "Unknown Project";
  let coreValue = "";

  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    projectName = h1Match[1].trim();
  }

  const coreValueMatch = content.match(/## Core Value\n\n([^\n]+)/);
  if (coreValueMatch) {
    coreValue = coreValueMatch[1].trim();
  }

  return { projectName, coreValue };
}

// Calculate completion percentage
function calculateCompletion(phases: PhaseStatus[]): number {
  const completed = phases.filter(p => p.status === "Complete").length;
  return phases.length > 0 ? Math.round((completed / phases.length) * 100) : 0;
}

// Main function to get project state
function getProjectState(): ProjectState {
  const planningDir = findPlanningDir();

  const stateContent = fs.readFileSync(path.join(planningDir, "STATE.md"), "utf-8");
  const roadmapContent = fs.readFileSync(path.join(planningDir, "ROADMAP.md"), "utf-8");
  const projectContent = fs.readFileSync(path.join(planningDir, "PROJECT.md"), "utf-8");

  const stateData = parseStateMd(stateContent);
  const roadmapData = parseRoadmapMd(roadmapContent);
  const projectData = parseProjectMd(projectContent);

  const phases = roadmapData.phases;
  const completion = calculateCompletion(phases);

  return {
    projectName: projectData.projectName,
    coreValue: projectData.coreValue,
    currentPhase: stateData.currentPhase || 0,
    currentPhaseName: stateData.currentPhaseName || "",
    currentPlan: stateData.currentPlan || "",
    status: stateData.status || "Unknown",
    lastActivity: stateData.lastActivity || "",
    progressBar: stateData.progressBar || "",
    nextAction: stateData.nextAction || "",
    blockers: stateData.blockers || [],
    phases,
    milestones: roadmapData.milestones,
    velocity: stateData.velocity || { totalPlans: 0, avgDuration: "", totalTime: "" },
    completion,
  };
}

// UI resource URI - must use ui:// scheme for MCP Apps
const resourceUri = "ui://gsd-progress/dashboard.html";

// Create MCP Server with tools and resources
const server = new McpServer({
  name: "gsd-progress",
  version: "1.0.0",
});

// Register tool using the official ext-apps helper
registerAppTool(
  server,
  "show-gsd-progress",
  {
    title: "GSD Progress Dashboard",
    description: "Show project progress from .planning/ directory with interactive visual dashboard",
    inputSchema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["visual", "text"],
          description: "Output format - visual for UI dashboard, text for terminal",
        },
      },
    },
    _meta: { ui: { resourceUri } },
  },
  async (args) => {
    try {
      const state = getProjectState();
      const format = (args as { format?: string })?.format || "visual";

      if (format === "text") {
        // Text output for terminal (backward compatibility)
        const progressBar = "█".repeat(Math.floor(state.completion / 10)) + "░".repeat(10 - Math.floor(state.completion / 10));

        let text = `# ${state.projectName}\n\n`;
        text += `**Progress:** [${progressBar}] ${state.completion}%\n`;
        text += `Phase ${state.currentPhase} of ${state.phases.length}: ${state.currentPhaseName}\n\n`;
        text += `**Status:** ${state.status}\n`;
        text += `**Current Plan:** ${state.currentPlan}\n`;
        text += `**Last Activity:** ${state.lastActivity}\n\n`;

        if (state.nextAction) {
          text += `**Next:** ${state.nextAction}\n\n`;
        }

        if (state.blockers.length > 0) {
          text += `**Blockers:**\n`;
          for (const blocker of state.blockers) {
            text += `- ${blocker}\n`;
          }
          text += "\n";
        }

        text += `**Velocity:** ${state.velocity.totalPlans} plans completed, avg ${state.velocity.avgDuration}\n`;

        return {
          content: [{ type: "text", text }],
        };
      }

      // Visual output - return structured data for the UI
      return {
        content: [
          {
            type: "text",
            text: `GSD Progress: ${state.completion}% complete (Phase ${state.currentPhase}: ${state.currentPhaseName})`,
          },
        ],
        // structuredContent is passed to the UI app but hidden from the LLM
        structuredContent: state,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error loading project state: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register the UI resource using the official ext-apps helper
registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    // Try dist folder first (built), then root (dev)
    const distPath = path.join(__dirname, "dist", "mcp-app.html");
    const rootPath = path.join(__dirname, "mcp-app.html");

    let html: string;

    if (fs.existsSync(distPath)) {
      html = fs.readFileSync(distPath, "utf-8");
    } else if (fs.existsSync(rootPath)) {
      html = fs.readFileSync(rootPath, "utf-8");
    } else {
      html = `<!DOCTYPE html>
<html>
<head><title>GSD Progress</title></head>
<body>
<h1>GSD Progress Dashboard</h1>
<p>UI not built yet. Run: npm run build</p>
</body>
</html>`;
    }

    return {
      contents: [
        { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
      ],
    };
  }
);

// Expose the MCP server over HTTP (required for MCP Apps)
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;

// Store for OAuth (in-memory, simple)
const clients = new Map<string, { client_id: string; client_secret: string; redirect_uris: string[] }>();
const authCodes = new Map<string, { client_id: string; redirect_uri: string; expires: number }>();
const tokens = new Map<string, { client_id: string; expires: number }>();

// Generate random string
function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// OAuth 2.0 Discovery endpoint
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
  });
});

// Dynamic Client Registration
app.post("/register", (req, res) => {
  const { redirect_uris, client_name } = req.body;

  const client_id = `client_${randomString(16)}`;
  const client_secret = randomString(32);

  clients.set(client_id, {
    client_id,
    client_secret,
    redirect_uris: redirect_uris || [],
  });

  console.log(`Registered client: ${client_name || client_id}`);

  res.status(201).json({
    client_id,
    client_secret,
    client_name: client_name || "GSD Progress Client",
    redirect_uris: redirect_uris || [],
    token_endpoint_auth_method: "client_secret_post",
  });
});

// Authorization endpoint - auto-approve and redirect
app.get("/authorize", (req, res) => {
  const { client_id, redirect_uri, state, code_challenge } = req.query;

  if (!client_id || !redirect_uri) {
    res.status(400).json({ error: "invalid_request", error_description: "Missing client_id or redirect_uri" });
    return;
  }

  // Generate auth code
  const code = randomString(32);
  authCodes.set(code, {
    client_id: client_id as string,
    redirect_uri: redirect_uri as string,
    expires: Date.now() + 600000, // 10 minutes
  });

  console.log(`Authorization granted for client: ${client_id}`);

  // Redirect back with code
  const redirectUrl = new URL(redirect_uri as string);
  redirectUrl.searchParams.set("code", code);
  if (state) redirectUrl.searchParams.set("state", state as string);

  res.redirect(302, redirectUrl.toString());
});

// Token endpoint
app.post("/token", (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

  if (grant_type === "authorization_code") {
    const authCode = authCodes.get(code);

    if (!authCode || authCode.expires < Date.now()) {
      res.status(400).json({ error: "invalid_grant", error_description: "Invalid or expired code" });
      return;
    }

    // Generate tokens
    const access_token = randomString(64);
    const refresh_token = randomString(64);

    tokens.set(access_token, {
      client_id: authCode.client_id,
      expires: Date.now() + 3600000, // 1 hour
    });

    // Clean up used code
    authCodes.delete(code);

    console.log(`Token issued for client: ${authCode.client_id}`);

    res.json({
      access_token,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token,
    });
    return;
  }

  if (grant_type === "refresh_token") {
    // Just issue a new token
    const access_token = randomString(64);

    res.json({
      access_token,
      token_type: "Bearer",
      expires_in: 3600,
    });
    return;
  }

  res.status(400).json({ error: "unsupported_grant_type" });
});

// MCP endpoint (with optional Bearer token validation)
app.post("/mcp", async (req, res) => {
  // Optional: validate Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const tokenData = tokens.get(token);
    if (!tokenData || tokenData.expires < Date.now()) {
      // Token invalid but we'll allow it anyway for simplicity
      console.log("Warning: Invalid or expired token, allowing anyway");
    }
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "gsd-progress", version: "1.0.0" });
});

app.listen(PORT, () => {
  console.log(`GSD Progress MCP App Server listening on http://localhost:${PORT}/mcp`);
  console.log(`OAuth endpoints available at http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`\nTo use with Claude Desktop:`);
  console.log(`1. Run: npx cloudflared tunnel --url http://localhost:${PORT}`);
  console.log(`2. Copy the tunnel URL (e.g., https://random-name.trycloudflare.com)`);
  console.log(`3. Add as Custom Connector in Claude: Settings → Connectors → Add custom connector`);
  console.log(`   URL: <tunnel-url>/mcp`);
});
