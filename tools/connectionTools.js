/**
 * Connection Tools Module
 * 
 * MCP tools for connecting to and managing TikTok livestream connections.
 * 
 * @module tools/connectionTools
 */

import { z } from "zod";
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { normalizeUsername, extractStreamUrl, createErrorResponse, createSuccessResponse } from '../utils.js';
import { logError } from '../errorHandling.js';
import { setupEventListeners } from '../eventHandlers.js';
import { createOpencodeClient } from "@opencode-ai/sdk"



/**
 * Registers connection-related tools with the MCP server
 * @param {McpServer} server - MCP server instance
 * @param {Map} connections - Map of active connections
 * @param {Object} config - Configuration object
 */
export function registerConnectionTools(server, connections, config) {
  
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

        const client = createOpencodeClient({
          baseUrl: "http://localhost:8087",
        })

      
          
        await client.tui.showToast({
          body: { title: "Connection Status", message: `Connected to ${username}`, variant: "success" },
        })

        // Create new connection
        const connection = new TikTokLiveConnection(username, {
          fetchRoomInfoOnConnect: true,
          processInitialData: true,
          signApiKey:process.env.EULER_API_KEY || ""
          //signApiKey: "euler_ZTJkN2JhNWUyMDc0OTU5ODY4ZGMyZGE5ZjU5ZWYzM2MwNzAzNmJjOTJkM2EwZDVlN2I4ZDI5"
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
        setupEventListeners(username, connection, connections, config, client);

        return createSuccessResponse(
          `Successfully connected to ${username}'s livestream\n` +
          `Room ID: ${state.roomId}\n` +
          `Viewers: ${state.viewerCount || 0}\n` +
          `Stream URL available: ${streamUrl !== "No stream URL available"}` +
          (streamUrl !== "No stream URL available" ? `\nStream URL: ${JSON.stringify(streamUrl)}` : '')
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
          `Stream URL Available: ${JSON.stringify(streamInfo.streamUrl)}`;

        return createSuccessResponse(info);
      } catch (error) {
        logError('tool', 'tiktok-info', error);
        return createErrorResponse(
          `Error getting stream info for ${username}: ${error.message}`
        );
      }
    }
  );
}
