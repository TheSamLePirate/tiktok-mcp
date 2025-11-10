#!/usr/bin/env node

/**
 * TikTok Live MCP Server
 * 
 * A Model Context Protocol server for accessing TikTok livestream chat data and events.
 * Provides real-time monitoring of chat messages, gifts, likes, and viewer statistics.
 * 
 * @module tiktok-live-mcp
 * @version 2.0.0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { logError } from './errorHandling.js';
import { stopAllProcesses } from './processManager.js';
import { registerConnectionTools } from './tools/connectionTools.js';
import { registerDataTools } from './tools/dataTools.js';
import { registerVideoTools } from './tools/videoTools.js';
import { registerDebugTools } from './tools/debugTools.js';
import { registerTranscriptTools, stopAllTranscriptions } from './tools/transcriptTools.js';

// ============================================================================
// Constants
// ============================================================================

const CONFIG = {
  SERVER_NAME: "tiktok-live",
  SERVER_VERSION: "2.0.0",
  SERVER_DESCRIPTION: "A server for accessing TikTok livestream chat data and events",
  MAX_STORED_MESSAGES: 1000,
  MAX_STORED_GIFTS: 100,
  MAX_STORED_ERRORS: 100,
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY_MS: 5000,
};

const SESSION_ID = process.env.TIKTOK_SESSION_ID || "";

// ============================================================================
// State Management
// ============================================================================

/**
 * Map of active TikTok livestream connections
 * @type {Map<string, StreamConnection>}
 */
const connections = new Map();

/**
 * @typedef {Object} StreamConnection
 * @property {TikTokLiveConnection} connection - TikTok live connection instance
 * @property {string} roomId - Livestream room ID
 * @property {Array} messages - Chat messages buffer
 * @property {Array} gifts - Gifts buffer
 * @property {Array} likes - Likes buffer
 * @property {Array} users - Users who joined
 * @property {number} viewers - Current viewer count
 * @property {string} streamUrl - FLV stream URL
 * @property {Object} roomInfo - Room metadata
 */

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: CONFIG.SERVER_NAME,
  version: CONFIG.SERVER_VERSION,
  description: CONFIG.SERVER_DESCRIPTION
});

// Register all tools
registerConnectionTools(server, connections, CONFIG);
registerDataTools(server, connections);
registerVideoTools(server);
registerDebugTools(server);
registerTranscriptTools(server);

// ============================================================================
// Server Initialization
// ============================================================================

/**
 * Initialize and start the MCP server
 */
async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`TikTok Live MCP Server v${CONFIG.SERVER_VERSION} started successfully`);
  } catch (error) {
    logError('system', 'startServer', error);
    console.error("Failed to start TikTok Live MCP server:", error);
    process.exit(1);
  }
}

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.error("\nShutting down server...");
  
  // Disconnect from all TikTok livestreams
  connections.forEach(({ connection }, username) => {
    console.error(`Disconnecting from ${username}...`);
    try {
      connection.disconnect();
    } catch (error) {
      logError('system', `shutdown-${username}`, error);
    }
  });
  
  // Stop all video processes
  console.error("Stopping all video processes...");
  const stoppedCount = stopAllProcesses(true);
  if (stoppedCount > 0) {
    console.error(`Stopped ${stoppedCount} video process(es)`);
  }
  
  // Stop all transcription sessions
  console.error("Stopping all transcription sessions...");
  const stoppedTranscripts = stopAllTranscriptions();
  if (stoppedTranscripts > 0) {
    console.error(`Stopped ${stoppedTranscripts} transcription session(s)`);
  }
  
  process.exit(0);
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logError('system', 'unhandledRejection', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  logError('system', 'uncaughtException', error);
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, let the server try to recover
});

// Start the server
startServer();

export { server, connections };
