#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { WebcastPushConnection } from "tiktok-live-connector";
import { z } from "zod";
import { spawn } from "child_process";


//load sessionId from environment variable
const sessionId = process.env.TIKTOK_SESSION_ID || "";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));





// Active connections to TikTok livestreams
const connections = new Map();

// Create the MCP server
const server = new McpServer({
  name: "tiktok-live",
  version: "1.0.0",
  description: "A server for accessing TikTok livestream chat data and events"
});



server.tool(
  "tiktok-connect",
  {
    username: z.string().describe("TikTok username of someone who is currently live. start with @")
  },
  async ({ username }) => {
    try {

      

      // Check if already connected to this stream
      if (connections.has(username)) {
        return {
          content: [
            {
              type: "text",
              text: `Already connected to ${username}'s livestream`
            }
          ]
        };
      }

      var options = {};
      options.fetchRoomInfoOnConnect = true;
      options.processInitialData = true;
      //options.sessionId = sessionId || "";

      
      // Create a new connection
      const connection = new WebcastPushConnection(username,options);
      
      // Connect to the stream and handle the errors
      const state = await connection.connect(); 

      
      // Store the connection

      //get stream url from state if roomInfo and stream_url.flv_pull_url exists
      const streamUrl = state.roomInfo && state.roomInfo.stream_url && state.roomInfo.stream_url.flv_pull_url ? state.roomInfo.stream_url.flv_pull_url : "No stream url";


      
      
      connections.set(username, {
        connection,
        roomId: state.roomId,
        messages: [],
        gifts: [],
        viewers: state.viewerCount || 0,
        streamUrl:streamUrl,
        roomInfo:state.roomInfo,
        likes:[],
        users:[]
      });

      // Set up event listeners
      setupEventListeners(username, connection);

      

      return {
        content: [
          {
            type: "text",
            text: `Successfully connected to ${username}'s livestream (Room ID: ${state.roomId}) with info ${JSON.stringify(connections.get(username).streamUrl)}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to connect to ${username}'s livestream: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-stream-url",
  "Get the stream url for a given username and session id. Do not need to connect first.",
  {
    username: z.string().describe("TikTok username of someone who is currently live, start with @")
  },
  async ({ username}) => {
    try {
      // Check if already connected to this stream
      

      var options = {};
      options.fetchRoomInfoOnConnect = true;
      options.processInitialData = true;
      options.sessionId = sessionId || "";

      
      // Create a new connection
      const connection = new WebcastPushConnection(username,options);
      
      // Connect to the stream and handle the errors
      const state = await connection.connect(); 

      
      // Store the connection

      //get stream url from state if roomInfo and stream_url.flv_pull_url exists
      const streamUrl = state.roomInfo && state.roomInfo.stream_url && state.roomInfo.stream_url.flv_pull_url ? state.roomInfo.stream_url.flv_pull_url : "No stream url";
      connection.disconnect();
      
      

      // Set up event listeners

      return {
        content: [
          {
            type: "text",
            text: `Stream url for ${username} is ${JSON.stringify(streamUrl)}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to connect to ${username}'s livestream: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-disconnect",
  {
    username: z.string().describe("TikTok username to disconnect from, start with @")
  },
  async ({ username }) => {
    try {
      if (!connections.has(username)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Not connected to ${username}'s livestream`
            }
          ]
        };
      }
      
      const { connection } = connections.get(username);
      connection.disconnect();
      connections.delete(username);

      return {
        content: [
          {
            type: "text",
            text: `Successfully disconnected from ${username}'s livestream`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error disconnecting from ${username}'s livestream: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-messages",
  {
    username: z.string().describe("TikTok username, start with @"),
    count: z.number().optional().describe("Number of messages to retrieve (default: 10)")
  },
  async ({ username, count = 10 }) => {
    try {
      if (!connections.has(username)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Not connected to ${username}'s livestream. Use tiktok-connect first.`
            }
          ]
        };
      }

      

      const { messages } = connections.get(username);
      const recentMessages = messages.slice(-count);

      return {
        content: [
          {
            type: "text",
            text: recentMessages.length > 0
              ? `Recent messages from ${username}'s livestream:\n\n${recentMessages.map(msg => 
                  `${msg.timestamp} - ${msg.uniqueId}: ${msg.comment}`).join('\n')}`
              : `No messages yet in ${username}'s livestream`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error getting messages from ${username}'s livestream: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-gifts",
  {
    username: z.string().describe("TikTok username, start with @"),
    count: z.number().optional().describe("Number of gifts to retrieve (default: 10)")
  },
  async ({ username, count = 10 }) => {
    try {
      if (!connections.has(username)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Not connected to ${username}'s livestream. Use tiktok-connect first.`
            }
          ]
        };
      }

      

      const { gifts } = connections.get(username);
      const recentGifts = gifts.slice(-count);

      return {
        content: [
          {
            type: "text",
            text: recentGifts.length > 0
              ? `Recent gifts from ${username}'s livestream:\n\n${recentGifts.map(gift => 
                  `${gift.timestamp} - ${gift.uniqueId}: Gift ${gift.giftName} (ID: ${gift.giftId}) x${gift.repeatCount}, Diamond Value: ${gift.diamondCount}`).join('\n')}`
              : `No gifts yet in ${username}'s livestream`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error getting gifts from ${username}'s livestream: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-info",
  {
    username: z.string().describe("TikTok username, start with @")
  },
  async ({ username }) => {
    try {
      if (!connections.has(username)) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Not connected to ${username}'s livestream. Use tiktok-connect first.`
            }
          ]
        };
      }

      

      const streamInfo = connections.get(username);

      return {
        content: [
          {
            type: "text",
            text: `Stream information for ${username}:\n\n` +
                  `Room ID: ${streamInfo.roomId}\n` +
                  `Viewers: ${streamInfo.viewers}\n` +
                  `Total Messages: ${streamInfo.messages.length}\n` +
                  `Total Gifts: ${streamInfo.gifts.length}\n` +
                  `Total Likes: ${streamInfo.likes.length}\n` +
                  `Total Users: ${streamInfo.users.length}\n` 
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error getting stream info for ${username}: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "tiktok-list",
  {},
  async () => {
    try {
      if (connections.size === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No active connections to any TikTok livestreams"
            }
          ]
        };
      }

      const connectionList = Array.from(connections.entries()).map(([username, info]) => {
        return `${username} (Room ID: ${info.roomId}, Viewers: ${info.viewers})`;
      }).join('\n');

      return {
        content: [
          {
            type: "text",
            text: `Active TikTok livestream connections:\n\n${connectionList}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Error listing connections: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "stop-video",
  {
    pid: z.string().describe("The pid of the video player to stop")
  },
  async ({pid}) => {
    //stop the video player
    const command = `kill -9 ${pid}`;
    const child = spawn(command, { shell: true });
    return {
      content: [
        {
          type: "text",
          text: `Stopped process ${pid}`
        }
      ]
    };
  }
);
server.tool(
  "play-video",
  "Play a video from a given url. Use the full url with expire and sign",
  {
    url: z.string().describe("Video URL to play. Use the full url with expire and sign")
  },
  async ({ url }) => {
    try {
      //play with ffplay
      const command = `ffplay -autoexit "${url}"`;
      const child = spawn(command, { 
        shell: true,
        stdio: 'ignore',
        detached: true
      });

      // Unref the child process so it can run independently
      child.unref();

      return {
        content: [
          {
            type: "text",
            text: `Video playback started with PID: ${child.pid}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to start video playback: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "reccord-video",
  "Record a video from a given url. Use the full url with expire and sign",
  "return the pid of the ffmpeg process",
  {
    url: z.string().describe("Video URL to record. Use the full url with expire and sign"),
    filename: z.string().describe("Output filename for the recorded video")
  },
  async ({ url, filename }) => {
    try {
      //record with ffmpeg
      const command = `ffmpeg -i "${url}" -c copy "${filename}"`;
      const child = spawn(command, { 
        shell: true,
        stdio: 'ignore',
        detached: true
      });

      // Unref the child process so it can run independently
      child.unref();

      return {
        content: [
          {
            type: "text",
            text: `Video recording started with PID: ${child.pid}`
          }
        ]
      };
    } catch (error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `Failed to start video recording: ${error.message}`
          }
        ]
      };
    }
  }
);

server.tool(
  "stop-reccord-video",
  {
    pid: z.string().describe("The pid of the ffmpeg process to stop")
  },
  async ({pid}) => {
    //stop the ffmpeg process
    const command = `kill -9 ${pid}`;
    const child = spawn(command, { shell: true });
    return {
      content: [
        {
          type: "text",
          text: `Stopped recording process ${pid}`
        }
      ]
    };
  }
);




// Set up event listeners for a TikTok livestream connection
function setupEventListeners(username, connection) {
  
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000; // 5 seconds

  // Handle chat messages
  connection.on('chat', async (data) => {
    const streamData = connections.get(username);
    if (streamData) {
      const messageData = {
        uniqueId: data.uniqueId,
        userId: data.userId,
        nickname: data.nickname,
        comment: data.comment,
        timestamp: new Date().toISOString()
      };
      streamData.messages.push(messageData);

      //streamData.messages to markdown

      
      
      // Limit to last 100 messages to prevent memory issues
      if (streamData.messages.length > 100) {
        streamData.messages.shift();
      }
    }
  });

  // Handle likes
  connection.on('like', data => {
    const streamData = connections.get(username);
    if (streamData) {
      const likeData = {
        uniqueId: data.uniqueId,
        userId: data.userId,
        nickname: data.nickname,
        timestamp: new Date().toISOString(),
        likeCount: data.likeCount
      };
      streamData.likes.push(likeData);
    }
  });

  // Handle users
  connection.on('roomUser', data => {
    const streamData = connections.get(username);
    if (streamData) {
      const userData = {
        uniqueId: data.uniqueId,
        userId: data.userId,
        nickname: data.nickname,
        timestamp: new Date().toISOString()
      };
      streamData.users.push(userData);
    }
  });

  // Handle gifts
  connection.on('gift', data => {
    
    const streamData = connections.get(username);
    if (streamData) {
      const giftData = {
        uniqueId: data.uniqueId,
        userId: data.userId,
        giftId: data.giftId,
        nickname: data.nickname,
        giftName: data.giftName,
        diamondCount: data.diamondCount,
        repeatCount: data.repeatCount,
        timestamp: new Date().toISOString()
      };
      streamData.gifts.push(giftData);
      // Limit to last 100 gifts to prevent memory issues
      if (streamData.gifts.length > 100) {
        streamData.gifts.shift();
      }
    }
  });

  // Handle viewer count updates
  connection.on('roomUser', data => {
    
    const streamData = connections.get(username);
    if (streamData) {
      streamData.viewers = data.viewerCount;
    }
  });

  // Handle connection issues
  connection.on('disconnected', async () => {
    
    console.error(`Disconnected from ${username}'s livestream`);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect to ${username}'s livestream (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      try {
        const state = await connection.connect();
        reconnectAttempts = 0; // Reset counter on successful reconnection
        console.log(`Successfully reconnected to ${username}'s livestream`);
        
        // Update connection info
        const streamData = connections.get(username);
        if (streamData) {
          streamData.roomId = state.roomId;
          streamData.viewers = state.viewerCount || 0;
        }
      } catch (error) {
        console.error(`Failed to reconnect to ${username}'s livestream:`, error);
        // Schedule next reconnection attempt
        setTimeout(() => {
          connection.emit('disconnected');
        }, RECONNECT_DELAY);
      }
    } else {
      console.error(`Max reconnection attempts reached for ${username}'s livestream`);
      connections.delete(username);
    }
  });

  connection.on('error', (err) => {
    
    console.error(`Error in ${username}'s livestream connection:`, err);
    // Trigger reconnection logic
    connection.emit('disconnected');
  });
}

// Initialize the transport
const transport = new StdioServerTransport();

// Connect the server to the transport
server.connect(transport).catch(error => {
  console.error("Failed to start TikTok Live MCP server:", error);
  process.exit(1);
});

console.error("TikTok Live MCP server started");

export { server };