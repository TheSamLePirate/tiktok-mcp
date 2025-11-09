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
import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import { z } from "zod";
import { spawn } from "child_process";

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
 * Array of errors for debugging
 * @type {Array<ErrorLog>}
 */
const errorLogs = [];

/**
 * @typedef {Object} ErrorLog
 * @property {string} timestamp - ISO timestamp of the error
 * @property {string} type - Type of error (connection, tool, system)
 * @property {string} source - Source of the error (username, tool name, etc.)
 * @property {string} message - Error message
 * @property {string} [stack] - Error stack trace (if available)
 */

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
// Utility Functions
// ============================================================================

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validates and normalizes a TikTok username
 * @param {string} username - Username to validate
 * @returns {string} Normalized username with @ prefix
 */
function normalizeUsername(username) {
  if (!username) {
    throw new Error("Username cannot be empty");
  }
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @returns {Object} MCP error response
 */
function createErrorResponse(message) {
  return {
    isError: true,
    content: [{ type: "text", text: message }]
  };
}

/**
 * Creates a standardized success response
 * @param {string} message - Success message
 * @returns {Object} MCP success response
 */
function createSuccessResponse(message) {
  return {
    content: [{ type: "text", text: message }]
  };
}

/**
 * Logs an error to the error tracking system
 * @param {string} type - Type of error (connection, tool, system)
 * @param {string} source - Source of the error
 * @param {Error|string} error - Error object or message
 */
function logError(type, source, error) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    type,
    source,
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined
  };

  errorLogs.push(errorLog);
  limitArraySize(errorLogs, CONFIG.MAX_STORED_ERRORS);

  // Also log to console for immediate visibility
  console.error(`[${type.toUpperCase()}] [${source}] ${errorLog.message}`);
}

/**
 * Safely limits array size by removing oldest elements
 * @param {Array} array - Array to limit
 * @param {number} maxSize - Maximum size
 */
function limitArraySize(array, maxSize) {
  while (array.length > maxSize) {
    array.shift();
  }
}

/**
 * Extracts stream URL from room info
 * @param {Object} roomInfo - TikTok room information
 * @returns {string} Stream URL or error message
 */
function extractStreamUrl(roomInfo) {
  return roomInfo?.data?.stream_url?.flv_pull_url || "No stream URL available";
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Sets up event listeners for a TikTok livestream connection
 * @param {string} username - TikTok username
 * @param {TikTokLiveConnection} connection - Connection instance
 */
function setupEventListeners(username, connection) {
  let reconnectAttempts = 0;

  // Chat messages
  connection.on('chat', (data) => {
    const streamData = connections.get(username);
    if (!streamData) return;

    const messageData = {
      uniqueId: data.user.uniqueId,
      userId: data.user.userId,
      nickname: data.user.nickname,
      comment: data.comment,
      timestamp: new Date().toISOString()
    };

    streamData.messages.push(messageData);
    limitArraySize(streamData.messages, CONFIG.MAX_STORED_MESSAGES);
  });

  // Likes
  connection.on('like', (data) => {
    const streamData = connections.get(username);
    if (!streamData) return;

    const likeData = {
      uniqueId: data.user.uniqueId,
      userId: data.user.userId,
      nickname: data.user.nickname,
      timestamp: new Date().toISOString(),
      likeCount: data.likeCount
    };

    streamData.likes.push(likeData);
  });

  // New members joining
  connection.on(WebcastEvent.MEMBER, (data) => {
    const streamData = connections.get(username);
    if (!streamData) return;

    const userData = {
      uniqueId: data.uniqueId,
      userId: data.user.userId,
      nickname: data.user.nickname,
      timestamp: new Date().toISOString()
    };

    streamData.users.push(userData);
  });

  // Gifts
  connection.on('gift', (data) => {
    const streamData = connections.get(username);
    if (!streamData) return;

    const giftData = {
      uniqueId: data.user.uniqueId,
      nickname: data.user.nickname,
      giftId: data.giftId,
      giftName: data.giftName,
      diamondCount: data.diamondCount,
      repeatCount: data.repeatCount,
      timestamp: new Date().toISOString()
    };

    streamData.gifts.push(giftData);
    limitArraySize(streamData.gifts, CONFIG.MAX_STORED_GIFTS);
  });

  // Viewer count updates
  connection.on(WebcastEvent.ROOM_USER, (data) => {
    const streamData = connections.get(username);
    if (!streamData) return;

    streamData.viewers = data.viewerCount || 0;
  });

  // Handle disconnections with reconnect logic
  connection.on('disconnected', async () => {
    const disconnectError = `Disconnected from livestream`;
    logError('connection', username, disconnectError);

    if (reconnectAttempts >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      const maxAttemptsError = `Max reconnection attempts reached. Removing connection.`;
      logError('connection', username, maxAttemptsError);
      connections.delete(username);
      return;
    }

    reconnectAttempts++;
    console.log(`[${username}] Reconnection attempt ${reconnectAttempts}/${CONFIG.MAX_RECONNECT_ATTEMPTS}`);

    try {
      await sleep(CONFIG.RECONNECT_DELAY_MS);
      const state = await connection.connect();
      reconnectAttempts = 0; // Reset on success

      console.log(`[${username}] Successfully reconnected to livestream`);

      // Update connection info
      const streamData = connections.get(username);
      if (streamData) {
        streamData.roomId = state.roomId;
        streamData.viewers = state.viewerCount || 0;
      }
    } catch (error) {
      logError('connection', username, error);
      // Will retry on next disconnect event
      setTimeout(() => connection.emit('disconnected'), CONFIG.RECONNECT_DELAY_MS);
    }
  });

  // Handle errors
  connection.on('error', (err) => {
    logError('connection', username, err);
    connection.emit('disconnected');
  });
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new McpServer({
  name: CONFIG.SERVER_NAME,
  version: CONFIG.SERVER_VERSION,
  description: CONFIG.SERVER_DESCRIPTION
});

// ============================================================================
// Tool: Connect to TikTok Livestream
// ============================================================================

server.tool(
  "tiktok-connect",
  "Connect to a TikTok livestream to monitor chat, gifts, and events",
  {
    username: z.string().describe("TikTok username of someone who is currently live (prefix @ optional)")
  },
  async ({ username }) => {
    try {
      username = normalizeUsername(username);

      // Check if already connected
      if (connections.has(username)) {
        return createSuccessResponse(`Already connected to ${username}'s livestream`);
      }

      // Create new connection
      const connection = new TikTokLiveConnection(username, {
        fetchRoomInfoOnConnect: true,
        processInitialData: true
      });

      // Connect to the stream
      const state = await connection.connect();
      const streamUrl = extractStreamUrl(state.roomInfo);

      // Store connection data
      connections.set(username, {
        connection,
        roomId: state.roomId,
        messages: [],
        gifts: [],
        likes: [],
        users: [],
        viewers: state.viewerCount || 0,
        streamUrl,
        roomInfo: state.roomInfo
      });

      // Set up event listeners
      setupEventListeners(username, connection);

      return createSuccessResponse(
        `Successfully connected to ${username}'s livestream\n` +
        `Room ID: ${state.roomId}\n` +
        `Viewers: ${state.viewerCount || 0}\n` +
        `Stream URL available: ${streamUrl !== "No stream URL available"}`
      );
    } catch (error) {
      logError('tool', 'tiktok-connect', error);
      return createErrorResponse(
        `Failed to connect to ${username}'s livestream: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: Disconnect from TikTok Livestream
// ============================================================================

server.tool(
  "tiktok-disconnect",
  "Disconnect from a TikTok livestream",
  {
    username: z.string().describe("TikTok username to disconnect from (prefix @ optional)")
  },
  async ({ username }) => {
    try {
      username = normalizeUsername(username);

      if (!connections.has(username)) {
        return createErrorResponse(`Not connected to ${username}'s livestream`);
      }

      const { connection } = connections.get(username);
      connection.disconnect();
      connections.delete(username);

      return createSuccessResponse(`Successfully disconnected from ${username}'s livestream`);
    } catch (error) {
      logError('tool', 'tiktok-disconnect', error);
      return createErrorResponse(
        `Error disconnecting from ${username}'s livestream: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: Get Recent Messages
// ============================================================================

server.tool(
  "tiktok-messages",
  "Retrieve recent chat messages from a TikTok livestream",
  {
    username: z.string().describe("TikTok username (prefix @ optional)"),
    count: z.number().optional().describe("Number of messages to retrieve (default: 10)")
  },
  async ({ username, count = 10 }) => {
    try {
      username = normalizeUsername(username);

      if (!connections.has(username)) {
        return createErrorResponse(
          `Not connected to ${username}'s livestream. Use tiktok-connect first.`
        );
      }

      const { messages } = connections.get(username);
      const recentMessages = messages.slice(-count);

      if (recentMessages.length === 0) {
        return createSuccessResponse(`No messages yet in ${username}'s livestream`);
      }

      const formattedMessages = recentMessages
        .map(msg => `[${msg.timestamp}] ${msg.nickname} (@${msg.uniqueId}): ${msg.comment}`)
        .join('\n');

      return createSuccessResponse(
        `Recent messages from ${username}'s livestream:\n\n${formattedMessages}`
      );
    } catch (error) {
      logError('tool', 'tiktok-messages', error);
      return createErrorResponse(
        `Error getting messages from ${username}'s livestream: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: Get Recent Gifts
// ============================================================================

server.tool(
  "tiktok-gifts",
  "Retrieve recent gifts from a TikTok livestream",
  {
    username: z.string().describe("TikTok username (prefix @ optional)"),
    count: z.number().optional().describe("Number of gifts to retrieve (default: 10)")
  },
  async ({ username, count = 10 }) => {
    try {
      username = normalizeUsername(username);

      if (!connections.has(username)) {
        return createErrorResponse(
          `Not connected to ${username}'s livestream. Use tiktok-connect first.`
        );
      }

      const { gifts } = connections.get(username);
      const recentGifts = gifts.slice(-count);

      if (recentGifts.length === 0) {
        return createSuccessResponse(`No gifts yet in ${username}'s livestream`);
      }

      const formattedGifts = recentGifts
        .map(gift => 
          `[${gift.timestamp}] ${gift.nickname} (@${gift.uniqueId}): ` +
          `${gift.giftName} (ID: ${gift.giftId}) x${gift.repeatCount}, ` +
          `Diamond Value: ${gift.diamondCount}`
        )
        .join('\n');

      return createSuccessResponse(
        `Recent gifts from ${username}'s livestream:\n\n${formattedGifts}`
      );
    } catch (error) {
      logError('tool', 'tiktok-gifts', error);
      return createErrorResponse(
        `Error getting gifts from ${username}'s livestream: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: Get Likes Statistics
// ============================================================================

server.tool(
  "tiktok-likes",
  "Retrieve likes statistics from a TikTok livestream, aggregated by user",
  {
    username: z.string().describe("TikTok username (prefix @ optional)"),
    count: z.number().optional().describe("Number of top likers to show (default: 10)")
  },
  async ({ username, count = 10 }) => {
    try {
      username = normalizeUsername(username);

      if (!connections.has(username)) {
        return createErrorResponse(
          `Not connected to ${username}'s livestream. Use tiktok-connect first.`
        );
      }

      const { likes } = connections.get(username);

      if (likes.length === 0) {
        return createSuccessResponse(`No likes yet in ${username}'s livestream`);
      }

      // Aggregate likes by user
      const likesCountByUser = likes.reduce((acc, like) => {
        if (!acc[like.nickname]) {
          acc[like.nickname] = 0;
        }
        acc[like.nickname] += like.likeCount;
        return acc;
      }, {});

      // Convert to array and sort
      const sortedLikes = Object.entries(likesCountByUser)
        .map(([nickname, likeCount]) => ({ nickname, likeCount }))
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, count);

      const formattedLikes = sortedLikes
        .map((like, index) => `${index + 1}. ${like.nickname}: ${like.likeCount} likes`)
        .join('\n');

      return createSuccessResponse(
        `Top ${sortedLikes.length} likers in ${username}'s livestream:\n\n${formattedLikes}`
      );
    } catch (error) {
      logError('tool', 'tiktok-likes', error);
      return createErrorResponse(
        `Error getting likes from ${username}'s livestream: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: Get Stream Information
// ============================================================================

server.tool(
  "tiktok-info",
  "Get detailed information about a TikTok livestream",
  {
    username: z.string().describe("TikTok username (prefix @ optional)")
  },
  async ({ username }) => {
    try {
      username = normalizeUsername(username);

      if (!connections.has(username)) {
        return createErrorResponse(
          `Not connected to ${username}'s livestream. Use tiktok-connect first.`
        );
      }

      const streamInfo = connections.get(username);

      const info = 
        `Stream Information for ${username}\n` +
        `${'='.repeat(50)}\n` +
        `Room ID: ${streamInfo.roomId}\n` +
        `Current Viewers: ${streamInfo.viewers}\n` +
        `Total Messages: ${streamInfo.messages.length}\n` +
        `Total Gifts: ${streamInfo.gifts.length}\n` +
        `Total Likes: ${streamInfo.likes.length}\n` +
        `Total Users Joined: ${streamInfo.users.length}\n` +
        `Stream URL Available: ${streamInfo.streamUrl !== "No stream URL available" ? "Yes" : "No"}`;

      return createSuccessResponse(info);
    } catch (error) {
      logError('tool', 'tiktok-info', error);
      return createErrorResponse(
        `Error getting stream info for ${username}: ${error.message}`
      );
    }
  }
);

// ============================================================================
// Tool: List Active Connections
// ============================================================================

server.tool(
  "tiktok-list",
  "List all active TikTok livestream connections",
  {},
  async () => {
    try {
      if (connections.size === 0) {
        return createSuccessResponse("No active connections to any TikTok livestreams");
      }

      const connectionList = Array.from(connections.entries())
        .map(([username, info]) => 
          `${username} - Room ID: ${info.roomId}, Viewers: ${info.viewers}, ` +
          `Messages: ${info.messages.length}, Gifts: ${info.gifts.length}`
        )
        .join('\n');

      return createSuccessResponse(
        `Active TikTok Livestream Connections (${connections.size}):\n\n${connectionList}`
      );
    } catch (error) {
      logError('tool', 'tiktok-list', error);
      return createErrorResponse(`Error listing connections: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Play Video
// ============================================================================

server.tool(
  "play-video",
  "Play a video from a URL using ffplay",
  {
    url: z.string().describe("Video URL to play (use full URL with expire and sign parameters)")
  },
  async ({ url }) => {
    try {
      if (!url || !url.startsWith('http')) {
        return createErrorResponse("Invalid URL provided");
      }

      const command = `ffplay -autoexit "${url}"`;
      const child = spawn(command, {
        shell: true,
        stdio: 'ignore',
        detached: true
      });

      child.unref();

      return createSuccessResponse(
        `Video playback started successfully\nProcess ID: ${child.pid}\n` +
        `Use 'stop-video' tool with this PID to stop playback`
      );
    } catch (error) {
      logError('tool', 'play-video', error);
      return createErrorResponse(`Failed to start video playback: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Stop Video
// ============================================================================

server.tool(
  "stop-video",
  "Stop a running video player process",
  {
    pid: z.string().describe("Process ID of the video player to stop")
  },
  async ({ pid }) => {
    try {
      const pidNum = parseInt(pid, 10);
      if (isNaN(pidNum)) {
        return createErrorResponse("Invalid PID provided");
      }

      const command = `kill -9 ${pidNum}`;
      spawn(command, { shell: true });

      return createSuccessResponse(`Stopped video player process ${pid}`);
    } catch (error) {
      logError('tool', 'stop-video', error);
      return createErrorResponse(`Failed to stop process: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Record Video
// ============================================================================

server.tool(
  "record-video",
  "Record a video from a URL using ffmpeg",
  {
    url: z.string().describe("Video URL to record (use full URL with expire and sign parameters)"),
    filename: z.string().describe("Output filename for the recorded video (e.g., 'recording.mp4')")
  },
  async ({ url, filename }) => {
    try {
      if (!url || !url.startsWith('http')) {
        return createErrorResponse("Invalid URL provided");
      }

      if (!filename) {
        return createErrorResponse("Filename cannot be empty");
      }

      const command = `ffmpeg -i "${url}" -c copy "${filename}"`;
      const child = spawn(command, {
        shell: true,
        stdio: 'ignore',
        detached: true
      });

      child.unref();

      return createSuccessResponse(
        `Video recording started successfully\n` +
        `Output file: ${filename}\n` +
        `Process ID: ${child.pid}\n` +
        `Use 'stop-record-video' tool with this PID to stop recording`
      );
    } catch (error) {
      logError('tool', 'record-video', error);
      return createErrorResponse(`Failed to start video recording: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Stop Video Recording
// ============================================================================

server.tool(
  "stop-record-video",
  "Stop a running video recording process",
  {
    pid: z.string().describe("Process ID of the ffmpeg recording process to stop")
  },
  async ({ pid }) => {
    try {
      const pidNum = parseInt(pid, 10);
      if (isNaN(pidNum)) {
        return createErrorResponse("Invalid PID provided");
      }

      // Use SIGTERM instead of SIGKILL for graceful shutdown
      const command = `kill -15 ${pidNum}`;
      spawn(command, { shell: true });

      return createSuccessResponse(
        `Stopped recording process ${pid}\n` +
        `The video file should be properly finalized`
      );
    } catch (error) {
      logError('tool', 'stop-record-video', error);
      return createErrorResponse(`Failed to stop recording: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Show Errors
// ============================================================================

server.tool(
  "show-errors",
  "Display all logged errors for debugging purposes",
  {
    count: z.number().optional().describe("Number of recent errors to show (default: 20)"),
    type: z.enum(['all', 'connection', 'tool', 'system']).optional().describe("Filter by error type (default: all)")
  },
  async ({ count = 20, type = 'all' }) => {
    try {
      if (errorLogs.length === 0) {
        return createSuccessResponse("No errors logged yet. The system is running smoothly! 🎉");
      }

      // Filter by type if specified
      let filteredErrors = errorLogs;
      if (type !== 'all') {
        filteredErrors = errorLogs.filter(err => err.type === type);
      }

      if (filteredErrors.length === 0) {
        return createSuccessResponse(`No errors of type '${type}' found.`);
      }

      // Get recent errors
      const recentErrors = filteredErrors.slice(-count);

      // Format errors for display
      const formattedErrors = recentErrors.map((err, index) => {
        let errorText = `[${index + 1}] ${err.timestamp}\n` +
                       `    Type: ${err.type}\n` +
                       `    Source: ${err.source}\n` +
                       `    Message: ${err.message}`;
        
        if (err.stack) {
          // Only show first 3 lines of stack trace for brevity
          const stackLines = err.stack.split('\n').slice(0, 3).join('\n    ');
          errorText += `\n    Stack: ${stackLines}`;
        }
        
        return errorText;
      }).join('\n\n');

      // Summary statistics
      const errorsByType = errorLogs.reduce((acc, err) => {
        acc[err.type] = (acc[err.type] || 0) + 1;
        return acc;
      }, {});

      const summary = Object.entries(errorsByType)
        .map(([type, count]) => `  ${type}: ${count}`)
        .join('\n');

      return createSuccessResponse(
        `Error Log Summary\n` +
        `${'='.repeat(50)}\n` +
        `Total Errors: ${errorLogs.length}\n` +
        `By Type:\n${summary}\n\n` +
        `Recent Errors (showing ${recentErrors.length} of ${filteredErrors.length}):\n` +
        `${'='.repeat(50)}\n\n` +
        formattedErrors
      );
    } catch (error) {
      logError('tool', 'show-errors', error);
      return createErrorResponse(`Failed to retrieve errors: ${error.message}`);
    }
  }
);

// ============================================================================
// Tool: Clear Errors
// ============================================================================

server.tool(
  "clear-errors",
  "Clear all logged errors from the error tracking system",
  {},
  async () => {
    try {
      const errorCount = errorLogs.length;
      errorLogs.length = 0; // Clear the array
      
      return createSuccessResponse(
        `Successfully cleared ${errorCount} error(s) from the log.\n` +
        `Error tracking has been reset.`
      );
    } catch (error) {
      logError('tool', 'clear-errors', error);
      return createErrorResponse(`Failed to clear errors: ${error.message}`);
    }
  }
);

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
  connections.forEach(({ connection }, username) => {
    console.error(`Disconnecting from ${username}...`);
    try {
      connection.disconnect();
    } catch (error) {
      logError('system', `shutdown-${username}`, error);
    }
  });
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
