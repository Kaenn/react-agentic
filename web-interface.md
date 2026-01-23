# Web Interface Claude Code

## Goal to Achieve

Build a local web interface capable of:

- **Launching multiple Claude Code instances** simultaneously, each with a distinct pre-configured prompt
- **Streaming real-time output** from each instance to the web UI
- **Detecting task completion** automatically (no manual polling or arbitrary timeouts)
- **Managing sessions** with ability to resume, monitor progress, and review results

---

## Architecture Global

### Core Component: Claude Agent SDK

The architecture leverages the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk` for TypeScript or `claude-agent-sdk` for Python) as the primary integration layer. This SDK provides:

- Native async streaming via iterators
- Built-in completion detection (loop terminates when Claude returns text without tool calls)
- Session management with unique `session_id` per instance
- Lifecycle hooks for monitoring and logging
- Subagent support for task delegation

### High-Level Flow

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                         │
│         (Browser - Single Page Application)         │
└──────────────────────┬──────────────────────────────┘
                       │ WebSocket (bidirectional)
                       │
┌──────────────────────▼──────────────────────────────┐
│                    Backend                          │
│              (API + WebSocket Server)               │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           Claude Agent SDK                   │   │
│  │  • Spawns query() streams per instance       │   │
│  │  • Manages session lifecycle                 │   │
│  │  • Forwards messages to WebSocket            │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   [Instance 1]   [Instance 2]   [Instance N]
   prompt: "..."  prompt: "..."  prompt: "..."
   workspace: A   workspace: B   workspace: C
```

---

## Backend

### Technology Choice

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Node.js (v20+) or Python (3.11+) | Both have first-class SDK support |
| **Framework** | Fastify (Node) or FastAPI (Python) | Async-native, WebSocket support, lightweight |
| **Real-time** | Native WebSocket | Bidirectional streaming, lower overhead than SSE |
| **Task Queue** | In-memory (Map/Dict) | Simple instance tracking; Redis optional for persistence |

### Recommended Stack: **Node.js + Fastify**

Rationale:
- TypeScript SDK aligns with frontend tooling
- Fastify has excellent WebSocket plugin ecosystem
- Single language across stack reduces complexity

### Backend Responsibilities

1. **Instance Lifecycle Management**
   - Create: Spawn new `query()` stream with provided prompt and options
   - Track: Maintain registry of active instances with metadata (id, status, session_id)
   - Terminate: Cancel running instances on user request
   - Resume: Reconnect to previous session via stored `session_id`

2. **Stream Routing**
   - Receive messages from SDK async iterator
   - Tag each message with instance identifier
   - Forward to appropriate WebSocket client(s)

3. **Completion Detection**
   - Monitor for `result` type messages from SDK
   - Update instance status to "completed"
   - Notify frontend via WebSocket event

4. **Configuration Management**
   - Store prompt templates
   - Manage workspace paths
   - Handle API key securely (environment variable)

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/instances` | GET | List all instances with status |
| `/instances` | POST | Launch new instance (prompt, workspace, options) |
| `/instances/:id` | DELETE | Cancel running instance |
| `/instances/:id/resume` | POST | Resume paused/previous session |
| `/ws` | WebSocket | Real-time bidirectional communication |

### WebSocket Message Types

**Server → Client:**
- `instance:output` - Streaming message from Claude
- `instance:status` - Status change (running, completed, error)
- `instance:tool_use` - Tool execution notification (for progress UI)

**Client → Server:**
- `instance:launch` - Request new instance
- `instance:cancel` - Request cancellation
- `instance:resume` - Request session resume

---

## Frontend

### Technology Choice

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Framework** | React 18+ or Vue 3 | Component-based, reactive state management |
| **Build Tool** | Vite | Fast HMR, modern ESM support |
| **Styling** | Tailwind CSS | Utility-first, rapid prototyping |
| **State** | Zustand (React) or Pinia (Vue) | Lightweight, WebSocket-friendly |
| **Terminal Display** | xterm.js | Render Claude output with ANSI support |

### Recommended Stack: **React + Vite + Tailwind**

Rationale:
- Largest ecosystem for UI components
- Strong TypeScript support
- xterm.js integrates well with React

### Frontend Responsibilities

1. **Instance Dashboard**
   - Display list of all instances (active, completed, failed)
   - Show real-time status indicators
   - Quick actions: launch, cancel, view details

2. **Instance Launcher**
   - Form for prompt input (text area with templates)
   - Workspace selection (directory picker or predefined list)
   - Optional: Tool permissions configuration
   - Launch button with loading state

3. **Output Viewer**
   - Real-time streaming display per instance
   - Support for multiple concurrent streams (tabs or split view)
   - ANSI color rendering for terminal-like output
   - Auto-scroll with manual scroll lock

4. **Completion Indicators**
   - Visual badge when instance completes
   - Optional: Desktop notification
   - Summary of final result

### UI Layout Concept

```
┌─────────────────────────────────────────────────────────────┐
│  [+ New Instance]                          [Settings]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Instance 1  │ │ Instance 2  │ │ Instance 3  │           │
│  │ ● Running   │ │ ✓ Complete  │ │ ● Running   │           │
│  │ [View]      │ │ [View]      │ │ [View]      │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Instance 1 Output                              [× Close]   │
│  ───────────────────────────────────────────────────────── │
│  │ Reading file: src/auth.py                              │ │
│  │ Found 3 issues in authentication logic...              │ │
│  │ Editing file: src/auth.py                              │ │
│  │ █                                                      │ │
│  └─────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

| Layer | Technology | Key Library |
|-------|------------|-------------|
| **Core Engine** | Claude Agent SDK | `@anthropic-ai/claude-agent-sdk` |
| **Backend** | Node.js + Fastify | `fastify`, `@fastify/websocket` |
| **Frontend** | React + Vite | `react`, `xterm.js`, `zustand` |
| **Styling** | Tailwind CSS | `tailwindcss` |

### Key Advantages of This Architecture

1. **Native streaming** - No output parsing or threshold detection needed
2. **Built-in completion** - SDK signals when Claude finishes
3. **Session persistence** - Resume interrupted work via session_id
4. **Scalable** - Add instances without architectural changes
5. **Type-safe** - Full TypeScript across stack
6. **Extensible** - Hooks for logging, monitoring, custom behaviors
