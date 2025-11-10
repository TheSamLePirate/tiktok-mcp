/**
 * Event Handlers Module
 * 
 * Handles all TikTok livestream events including chat messages, gifts, likes,
 * member joins, viewer count updates, disconnections, and errors.
 * 
 * @module eventHandlers
 */

import { WebcastEvent } from 'tiktok-live-connector';
import { logError } from './errorHandling.js';
import { sleep } from './utils.js';

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
 * Sets up event listeners for a TikTok livestream connection
 * @param {string} username - TikTok username
 * @param {TikTokLiveConnection} connection - Connection instance
 * @param {Map} connections - Map of all active connections
 * @param {Object} config - Configuration object with MAX_STORED_MESSAGES, MAX_STORED_GIFTS, etc.
 * @param {Object} client - Opencode client instance
 */
export function setupEventListeners(username, connection, connections, config,client) {
  let reconnectAttempts = 0;

  // Chat messages
  connection.on('chat', async (data) => {
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
    await client.tui.showToast({body: {title:"New Chat Message", message: `${data.user.nickname}: ${data.comment}`, variant: "success" }});
    limitArraySize(streamData.messages, config.MAX_STORED_MESSAGES);
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
    // TODO: Add size limiting for likes array
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
    // TODO: Add size limiting for users array
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
    limitArraySize(streamData.gifts, config.MAX_STORED_GIFTS);
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

    if (reconnectAttempts >= config.MAX_RECONNECT_ATTEMPTS) {
      const maxAttemptsError = `Max reconnection attempts reached. Removing connection.`;
      logError('connection', username, maxAttemptsError);
      connections.delete(username);
      return;
    }

    reconnectAttempts++;
    console.log(`[${username}] Reconnection attempt ${reconnectAttempts}/${config.MAX_RECONNECT_ATTEMPTS}`);

    try {
      await sleep(config.RECONNECT_DELAY_MS);
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
      setTimeout(() => connection.emit('disconnected'), config.RECONNECT_DELAY_MS);
    }
  });

  // Handle errors
  connection.on('error', (err) => {
    logError('connection', username, err);
    connection.emit('disconnected');
  });
}
