/**
 * GSD Progress MCP App Server - Stdio Transport
 *
 * Uses stdio for local Claude Desktop integration with MCP Apps.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

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

// Find planning directory
function findPlanningDir(): string {
  const candidates: string[] = [];

  if (process.env.GSD_PLANNING_DIR) {
    candidates.push(process.env.GSD_PLANNING_DIR);
  }

  candidates.push(path.join(__dirname, "..", ".planning"));
  candidates.push(path.join(__dirname, ".planning"));

  const cwd = process.cwd();
  candidates.push(path.join(cwd, ".planning"));
  candidates.push(path.join(cwd, "..", ".planning"));

  candidates.push("/Users/glenninizan/workspace/react-agentic/react-agentic/.planning");

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      console.error(`Found .planning at: ${candidate}`);
      return candidate;
    }
  }

  throw new Error(`Could not find .planning directory`);
}

// Parse STATE.md
function parseStateMd(content: string): Partial<ProjectState> {
  const lines = content.split("\n");
  const result: Partial<ProjectState> = { blockers: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Phase:")) {
      const match = line.match(/Phase:\s*(\d+)\s*\(([^)]+)\)/);
      if (match) {
        result.currentPhase = parseInt(match[1], 10);
        result.currentPhaseName = match[2];
      }
    }
    if (line.startsWith("Plan:")) result.currentPlan = line.replace("Plan:", "").trim();
    if (line.startsWith("Status:")) result.status = line.replace("Status:", "").trim();
    if (line.startsWith("Last activity:")) result.lastActivity = line.replace("Last activity:", "").trim();
    if (line.startsWith("Progress:")) result.progressBar = line.replace("Progress:", "").trim();
    if (line.startsWith("Next:")) result.nextAction = line.replace("Next:", "").trim();

    if (line.includes("### Blockers") || line.includes("## Blockers")) {
      i++;
      while (i < lines.length && !lines[i].startsWith("#")) {
        const blockerLine = lines[i].trim();
        if (blockerLine.startsWith("-")) {
          result.blockers!.push(blockerLine.substring(1).trim());
        }
        i++;
      }
    }

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
  if (h1Match) projectName = h1Match[1].trim();

  const coreValueMatch = content.match(/## Core Value\n\n([^\n]+)/);
  if (coreValueMatch) coreValue = coreValueMatch[1].trim();

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

// UI resource URI
const resourceUri = "ui://gsd-progress/dashboard.html";

// Create MCP Server
const server = new McpServer({
  name: "gsd-progress",
  version: "1.0.0",
});

// Register tool with MCP Apps
registerAppTool(
  server,
  "show-gsd-progress",
  {
    title: "GSD Progress Dashboard",
    description: "Show project progress with interactive visual dashboard",
    inputSchema: z.object({}),
    _meta: { ui: { resourceUri } },
  },
  async () => {
    try {
      const state = getProjectState();

      return {
        content: [
          {
            type: "text",
            text: `GSD Progress: ${state.completion}% complete (Phase ${state.currentPhase}: ${state.currentPhaseName})`,
          },
        ],
        structuredContent: state,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Register UI resource
registerAppResource(
  server,
  resourceUri,
  resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => {
    const distPath = path.join(__dirname, "dist", "mcp-app.html");
    const rootPath = path.join(__dirname, "mcp-app.html");

    let html: string;

    if (fs.existsSync(distPath)) {
      html = fs.readFileSync(distPath, "utf-8");
    } else if (fs.existsSync(rootPath)) {
      html = fs.readFileSync(rootPath, "utf-8");
    } else {
      html = `<!DOCTYPE html><html><body><h1>GSD Progress</h1><p>UI not built. Run: npm run build</p></body></html>`;
    }

    return {
      contents: [
        { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
      ],
    };
  }
);

// Connect via stdio
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GSD Progress MCP App Server running on stdio");
}

main().catch(console.error);
