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




const failbackStreamUrl=async(username,options)=>{
  try {
    const connectionFailback = new TikTokLiveConnection(username,options);
    const stateFailback = await connectionFailback.connect().catch((err)=>{console.log(err)});
    const roomInfoFailback=await connectionFailback.fetchRoomInfo();
    console.log("Failback Stream url:",roomInfoFailback?.data.stream_url.flv_pull_url);
    connectionFailback.disconnect();
    return roomInfoFailback?.data.stream_url.flv_pull_url || "No stream URL available";
  }
  catch (error) {
    logError('tool', 'tiktok-stream-failback', error);
    return "No stream URL available";
  }
};

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

      
          
        

        // Create new connection
        const connection = new TikTokLiveConnection(username, {
          fetchRoomInfoOnConnect: true,
          processInitialData: true,
          signApiKey: process.env.EULER_API_KEY || ""
        });

        const isLive=await connection.fetchIsLive();
        logError('tool', 'tiktok-connect', "Connection is :" + (isLive ? "live" : "not live"));
        if(!isLive){
          await client.tui.showToast({
            body: { title: "Connection Status", message: `Failed to connect to ${username}`, variant: "error" },
          })

          
          return createErrorResponse(`${username} is not currently live.`);
        }

        // Connect to the stream
        const state = await connection.connect();
        let streamUrl = extractStreamUrl(state.roomInfo);

        if (streamUrl == "No stream URL available") {
          logError('tool', 'tiktok-connect', `No stream URL found for ${username}`);
          //Failback to connection with auth
          streamUrl = "No stream URL available";

          const optionsFailback= {
            fetchRoomInfoOnConnect: false,
            processInitialData: false,
            sessionId:process.env.TIKTOK_SESSION_ID || "",
            ttTargetIdc:process.env.TIKTOK_IDC || "",
            signApiKey: process.env.EULER_API_KEY || ""
          };
          streamUrl = await failbackStreamUrl(username,optionsFailback);
          if (streamUrl == "No stream URL available") {
            logError('tool', 'tiktok-connect', `Failback also failed to get stream URL for ${username}`);
          } else {
            logError('tool', 'tiktok-connect', `Failback succeeded to get stream URL for ${username}`);
          }
        }

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
          roomInfo: state.roomInfo,
          active: true
        });

        // Set up event listeners
        setupEventListeners(username, connection, connections, config, client);

        await client.tui.showToast({
          body: { title: "Connection Status", message: `Connected to ${username}`, variant: "success" },
        })

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
        connections.set("active", false);
        //connections.delete(username);


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
            `Messages: ${info.messages.length}, Gifts: ${info.gifts.length}` +
            `, Active: ${info.active}`
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
          `Active: ${streamInfo.active}\n` +
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
