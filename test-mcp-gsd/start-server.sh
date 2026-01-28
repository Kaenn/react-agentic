#!/bin/bash

# Full path to modern Node.js (required for ESM support)
NODE_BIN="/Users/glenninizan/.nvm/versions/node/v22.19.0/bin/node"

# Log startup for debugging
LOG_FILE="/tmp/gsd-progress-mcp.log"
echo "=== Server started at $(date) ===" >> "$LOG_FILE"
echo "CWD: $(pwd)" >> "$LOG_FILE"
echo "Script dir: $(dirname "$0")" >> "$LOG_FILE"
echo "Node: $NODE_BIN" >> "$LOG_FILE"
echo "Args: $@" >> "$LOG_FILE"

# Change to script directory
cd "$(dirname "$0")"

# Run the server with full path to node
exec "$NODE_BIN" dist/server.js 2>> "$LOG_FILE"
