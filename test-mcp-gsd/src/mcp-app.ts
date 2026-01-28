/**
 * GSD Progress Dashboard - MCP App Client
 *
 * Uses the @modelcontextprotocol/ext-apps SDK for communication with the host.
 */

import { App } from "@modelcontextprotocol/ext-apps";

// Types
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
  nextAction: string;
  blockers: string[];
  phases: PhaseStatus[];
  velocity: {
    totalPlans: number;
    avgDuration: string;
    totalTime: string;
  };
  completion: number;
}

class GSDProgressApp {
  private dashboard: HTMLElement;
  private data: ProjectState | null = null;
  private app: App;

  constructor() {
    this.dashboard = document.getElementById("dashboard")!;

    // Initialize MCP App connection
    this.app = new App({
      name: "GSD Progress Dashboard",
      version: "1.0.0",
    });

    // IMPORTANT: Set handlers BEFORE calling connect() to capture initial results
    // Handle tool results pushed by the host
    this.app.ontoolresult = (result) => {
      console.log("Received tool result:", result);

      // Check for structured content (hidden from LLM, passed to UI)
      if (result.structuredContent) {
        this.init(result.structuredContent as ProjectState);
      } else {
        // Fallback to parsing text content as JSON
        const textContent = result.content?.find((c: any) => c.type === "text");
        if (textContent?.text) {
          try {
            const data = JSON.parse(textContent.text);
            this.init(data);
          } catch {
            this.showError("Failed to parse tool result");
          }
        }
      }
    };

    // Handle errors
    this.app.onerror = (error) => {
      console.error("MCP App error:", error);
      this.showError(error.message || "Unknown error");
    };

    // Establish communication with the host AFTER setting handlers
    this.app.connect();
  }

  init(data: ProjectState) {
    this.data = data;
    this.render();
  }

  render() {
    if (!this.data) {
      this.dashboard.innerHTML = '<div class="loading">No data available</div>';
      return;
    }

    const {
      projectName,
      coreValue,
      currentPhase,
      currentPhaseName,
      currentPlan,
      status,
      lastActivity,
      nextAction,
      blockers = [],
      phases = [],
      velocity = {},
      completion = 0,
    } = this.data;

    // Calculate stroke dashoffset for progress wheel
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (completion / 100) * circumference;

    this.dashboard.innerHTML = `
      <div class="header">
        <div>
          <div class="project-name">${this.escape(projectName)}</div>
          <div class="core-value">${this.escape(coreValue)}</div>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-wheel-container">
          <svg class="progress-wheel" viewBox="0 0 100 100">
            <circle class="progress-bg" cx="50" cy="50" r="45"/>
            <circle class="progress-fill" cx="50" cy="50" r="45"
              stroke-dasharray="${circumference}"
              stroke-dashoffset="${offset}"/>
            <text class="progress-text" x="50" y="50">${completion}%</text>
          </svg>
        </div>

        <div class="status-cards">
          <div class="status-card">
            <div class="status-card-label">Current Phase</div>
            <div class="status-card-value">${currentPhase}. ${this.escape(currentPhaseName)}</div>
          </div>
          <div class="status-card">
            <div class="status-card-label">Current Plan</div>
            <div class="status-card-value">${this.escape(currentPlan)}</div>
          </div>
          <div class="status-card">
            <div class="status-card-label">Status</div>
            <div class="status-card-value ${this.getStatusClass(status)}">${this.escape(status)}</div>
          </div>
          <div class="status-card">
            <div class="status-card-label">Last Activity</div>
            <div class="status-card-value">${this.escape(lastActivity)}</div>
          </div>
        </div>
      </div>

      ${nextAction ? `
        <div class="next-action">
          <div class="section-title">Next Action</div>
          <div class="next-action-text">${this.escape(nextAction)}</div>
        </div>
      ` : ""}

      ${this.renderBlockers(blockers)}

      <div class="phases-section">
        <div class="section-title">
          Phases
          <span style="color: var(--text-secondary); font-weight: normal;">
            (${phases.filter((p) => p.status === "Complete").length}/${phases.length} complete)
          </span>
        </div>
        <div class="phase-list">
          ${this.renderPhases(phases, currentPhase)}
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" id="execute-btn">Execute Next Plan</button>
        <button class="btn btn-secondary" id="refresh-btn">Refresh</button>
      </div>

      ${velocity.totalPlans ? `
        <div class="velocity-stats">
          <div class="velocity-stat">
            <span>Plans completed:</span>
            <strong>${velocity.totalPlans}</strong>
          </div>
          <div class="velocity-stat">
            <span>Avg duration:</span>
            <strong>${velocity.avgDuration}</strong>
          </div>
          <div class="velocity-stat">
            <span>Total time:</span>
            <strong>${velocity.totalTime}</strong>
          </div>
        </div>
      ` : ""}
    `;

    // Attach event listeners
    document.getElementById("execute-btn")?.addEventListener("click", () => this.executeNext());
    document.getElementById("refresh-btn")?.addEventListener("click", () => this.refresh());
  }

  renderBlockers(blockers: string[]) {
    const isEmpty = blockers.length === 0;
    return `
      <div class="blockers-section ${isEmpty ? "empty" : ""}">
        <div class="section-title">
          <span class="blocker-icon">${isEmpty ? "✓" : "⚠"}</span>
          Blockers
        </div>
        ${isEmpty
          ? '<div class="no-blockers">No active blockers</div>'
          : blockers.map((b) => `
              <div class="blocker-item">
                <span class="blocker-icon">•</span>
                <span>${this.escape(b)}</span>
              </div>
            `).join("")
        }
      </div>
    `;
  }

  renderPhases(phases: PhaseStatus[], currentPhase: number) {
    return phases.map((phase) => `
      <div class="phase-item ${phase.number === currentPhase ? "current" : ""}">
        <span class="phase-number">${phase.number}</span>
        <span class="phase-name">${this.escape(phase.name)}</span>
        <span class="phase-status ${this.getStatusClass(phase.status)}">${phase.status}</span>
        <span class="phase-plans">${this.escape(phase.plansComplete)}</span>
      </div>
    `).join("");
  }

  getStatusClass(status: string) {
    const normalized = status?.toLowerCase().replace(/\s+/g, "-") || "";
    if (normalized.includes("complete")) return "complete";
    if (normalized.includes("progress")) return "in-progress";
    return "not-started";
  }

  escape(str: string | undefined) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async executeNext() {
    console.log("Execute next plan requested");

    // Use the MCP App SDK to send a message to the host
    // This will appear in the Claude conversation
    try {
      await this.app.sendFollowUp({
        text: "User clicked 'Execute Next Plan'. Please run /gsd:execute-phase to continue.",
      });
    } catch (error) {
      console.error("Failed to send follow-up:", error);
    }
  }

  async refresh() {
    console.log("Refresh requested");

    // Call the tool again to get fresh data
    try {
      const result = await this.app.callServerTool({
        name: "show-gsd-progress",
        arguments: { format: "visual" },
      });

      console.log("Refresh result:", result);

      if (result.structuredContent) {
        this.init(result.structuredContent as ProjectState);
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
      this.showError("Failed to refresh data");
    }
  }

  showError(message: string) {
    this.dashboard.innerHTML = `
      <div class="error">
        <strong>Error:</strong> ${this.escape(message)}
      </div>
    `;
  }
}

// Initialize the app
const gsdApp = new GSDProgressApp();

// Also expose for demo mode (direct browser testing)
(window as any).gsdApp = gsdApp;

// Demo mode fallback - if no tool result received within 2 seconds, show demo data
setTimeout(() => {
  if (!gsdApp["data"]) {
    console.log("No tool result received, loading demo data...");
    gsdApp.init({
      projectName: "React Agentic",
      coreValue: "Compile-time safety for Claude Code commands",
      currentPhase: 26,
      currentPhaseName: "Parser Refactoring",
      currentPlan: "4 of ? in current phase",
      status: "In progress",
      lastActivity: "2026-01-27 — Completed 26-04-PLAN.md",
      nextAction: "Create slim transformer.ts coordinator",
      blockers: ["Pre-existing TypeScript error in build.ts:86"],
      phases: [
        { number: 20, name: "Module Restructure", milestone: "v2.0", plansComplete: "2/2", status: "Complete" },
        { number: 21, name: "Structured Props", milestone: "v2.0", plansComplete: "2/2", status: "Complete" },
        { number: 22, name: "Semantic Components", milestone: "v2.0", plansComplete: "4/4", status: "Complete" },
        { number: 23, name: "Context Access Patterns", milestone: "v2.0", plansComplete: "3/3", status: "Complete" },
        { number: 24, name: "Parser/Emitter Integration", milestone: "v2.0", plansComplete: "3/3", status: "Complete" },
        { number: 25, name: "TSX Test Modernization", milestone: "v2.0", plansComplete: "3/3", status: "Complete" },
        { number: 26, name: "Parser Refactoring", milestone: "v2.1", plansComplete: "4/?", status: "In Progress" },
      ],
      velocity: {
        totalPlans: 72,
        avgDuration: "~3m",
        totalTime: "~3.8 hours",
      },
      completion: 86,
    });
  }
}, 2000);
