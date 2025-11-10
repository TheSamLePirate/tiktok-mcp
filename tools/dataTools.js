/**
 * Data Tools Module
 * 
 * MCP tools for retrieving chat messages, gifts, and likes from TikTok livestreams.
 * 
 * @module tools/dataTools
 */

import { z } from "zod";
import { normalizeUsername, createErrorResponse, createSuccessResponse } from '../utils.js';
import { logError } from '../errorHandling.js';

/**
 * Registers data retrieval tools with the MCP server
 * @param {McpServer} server - MCP server instance
 * @param {Map} connections - Map of active connections
 */
export function registerDataTools(server, connections) {
  
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
  // Tool: Save Messages to File
  // ============================================================================

  server.tool(
    "save-messages",
    "Save chat messages from a TikTok livestream to a file (TXT, JSON, or CSV format)",
    {
      username: z.string().describe("TikTok username (prefix @ optional)"),
      filename: z.string().describe("Output filename (e.g., 'messages.txt', 'messages.json', 'messages.csv')"),
      format: z.enum(['txt', 'json', 'csv']).optional().describe("File format (auto-detected from filename if not specified)"),
      count: z.number().optional().describe("Number of recent messages to save (default: all)")
    },
    async ({ username, filename, format, count }) => {
      try {
        username = normalizeUsername(username);

        if (!connections.has(username)) {
          return createErrorResponse(
            `Not connected to ${username}'s livestream. Use tiktok-connect first.`
          );
        }

        const { messages, roomId } = connections.get(username);

        if (messages.length === 0) {
          return createErrorResponse(
            `No messages to save from ${username}'s livestream`
          );
        }

        // Validate filename
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return createErrorResponse("Invalid filename. Use simple filename without paths.");
        }

        // Auto-detect format from filename if not specified
        let fileFormat = format;
        if (!fileFormat) {
          if (filename.endsWith('.json')) fileFormat = 'json';
          else if (filename.endsWith('.csv')) fileFormat = 'csv';
          else fileFormat = 'txt';
        }

        // Get messages to save (all or recent count)
        const messagesToSave = count ? messages.slice(-count) : messages;

        let content = '';

        // Generate content based on format
        switch (fileFormat) {
          case 'json':
            const jsonData = {
              username: username,
              roomId: roomId,
              exportedAt: new Date().toISOString(),
              totalMessages: messagesToSave.length,
              messages: messagesToSave.map(msg => ({
                timestamp: msg.timestamp,
                nickname: msg.nickname,
                uniqueId: msg.uniqueId,
                userId: msg.userId,
                comment: msg.comment,
                profilePictureUrl: msg.profilePictureUrl || null
              }))
            };
            content = JSON.stringify(jsonData, null, 2);
            break;

          case 'csv':
            // CSV format with headers
            content = 'Timestamp,Nickname,Username,User ID,Message\n';
            content += messagesToSave
              .map(msg => {
                // Escape CSV fields
                const escapeCSV = (field) => {
                  if (field === null || field === undefined) return '';
                  const str = String(field);
                  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                };
                
                return [
                  escapeCSV(msg.timestamp),
                  escapeCSV(msg.nickname),
                  escapeCSV(msg.uniqueId),
                  escapeCSV(msg.userId),
                  escapeCSV(msg.comment)
                ].join(',');
              })
              .join('\n');
            break;

          case 'txt':
          default:
            // Plain text format with metadata
            content = 
              `TikTok Live Chat Messages - @${username}\n` +
              `${'='.repeat(60)}\n` +
              `Room ID: ${roomId}\n` +
              `Exported: ${new Date().toISOString()}\n` +
              `Total Messages: ${messagesToSave.length}\n` +
              `${'='.repeat(60)}\n\n` +
              messagesToSave
                .map(msg => `[${msg.timestamp}] ${msg.nickname} (@${msg.uniqueId}): ${msg.comment}`)
                .join('\n\n');
            break;
        }

        // Write to file
        const fs = await import('fs/promises');
        await fs.writeFile(filename, content, 'utf-8');

        return createSuccessResponse(
          `Messages saved successfully\n` +
          `File: ${filename}\n` +
          `Format: ${fileFormat.toUpperCase()}\n` +
          `Messages: ${messagesToSave.length}\n` +
          `Size: ${content.length} bytes`
        );

      } catch (error) {
        logError('tool', 'save-messages', error);
        return createErrorResponse(`Failed to save messages: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Save Gifts to File
  // ============================================================================

  server.tool(
    "save-gifts",
    "Save gifts from a TikTok livestream to a file (TXT, JSON, or CSV format)",
    {
      username: z.string().describe("TikTok username (prefix @ optional)"),
      filename: z.string().describe("Output filename (e.g., 'gifts.txt', 'gifts.json', 'gifts.csv')"),
      format: z.enum(['txt', 'json', 'csv']).optional().describe("File format (auto-detected from filename if not specified)"),
      count: z.number().optional().describe("Number of recent gifts to save (default: all)")
    },
    async ({ username, filename, format, count }) => {
      try {
        username = normalizeUsername(username);

        if (!connections.has(username)) {
          return createErrorResponse(
            `Not connected to ${username}'s livestream. Use tiktok-connect first.`
          );
        }

        const { gifts, roomId } = connections.get(username);

        if (gifts.length === 0) {
          return createErrorResponse(
            `No gifts to save from ${username}'s livestream`
          );
        }

        // Validate filename
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return createErrorResponse("Invalid filename. Use simple filename without paths.");
        }

        // Auto-detect format from filename if not specified
        let fileFormat = format;
        if (!fileFormat) {
          if (filename.endsWith('.json')) fileFormat = 'json';
          else if (filename.endsWith('.csv')) fileFormat = 'csv';
          else fileFormat = 'txt';
        }

        // Get gifts to save (all or recent count)
        const giftsToSave = count ? gifts.slice(-count) : gifts;

        // Calculate total value
        const totalDiamonds = giftsToSave.reduce((sum, gift) => sum + gift.diamondCount, 0);

        let content = '';

        // Generate content based on format
        switch (fileFormat) {
          case 'json':
            const jsonData = {
              username: username,
              roomId: roomId,
              exportedAt: new Date().toISOString(),
              totalGifts: giftsToSave.length,
              totalDiamonds: totalDiamonds,
              gifts: giftsToSave.map(gift => ({
                timestamp: gift.timestamp,
                nickname: gift.nickname,
                uniqueId: gift.uniqueId,
                userId: gift.userId,
                giftId: gift.giftId,
                giftName: gift.giftName,
                repeatCount: gift.repeatCount,
                diamondCount: gift.diamondCount,
                profilePictureUrl: gift.profilePictureUrl || null
              }))
            };
            content = JSON.stringify(jsonData, null, 2);
            break;

          case 'csv':
            // CSV format with headers
            content = 'Timestamp,Nickname,Username,Gift Name,Gift ID,Quantity,Diamond Value\n';
            content += giftsToSave
              .map(gift => {
                const escapeCSV = (field) => {
                  if (field === null || field === undefined) return '';
                  const str = String(field);
                  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                  }
                  return str;
                };
                
                return [
                  escapeCSV(gift.timestamp),
                  escapeCSV(gift.nickname),
                  escapeCSV(gift.uniqueId),
                  escapeCSV(gift.giftName),
                  escapeCSV(gift.giftId),
                  escapeCSV(gift.repeatCount),
                  escapeCSV(gift.diamondCount)
                ].join(',');
              })
              .join('\n');
            break;

          case 'txt':
          default:
            // Plain text format with metadata
            content = 
              `TikTok Live Gifts - @${username}\n` +
              `${'='.repeat(60)}\n` +
              `Room ID: ${roomId}\n` +
              `Exported: ${new Date().toISOString()}\n` +
              `Total Gifts: ${giftsToSave.length}\n` +
              `Total Diamond Value: ${totalDiamonds}\n` +
              `${'='.repeat(60)}\n\n` +
              giftsToSave
                .map(gift => 
                  `[${gift.timestamp}] ${gift.nickname} (@${gift.uniqueId})\n` +
                  `  Gift: ${gift.giftName} (ID: ${gift.giftId})\n` +
                  `  Quantity: x${gift.repeatCount}\n` +
                  `  Diamond Value: ${gift.diamondCount}`
                )
                .join('\n\n');
            break;
        }

        // Write to file
        const fs = await import('fs/promises');
        await fs.writeFile(filename, content, 'utf-8');

        return createSuccessResponse(
          `Gifts saved successfully\n` +
          `File: ${filename}\n` +
          `Format: ${fileFormat.toUpperCase()}\n` +
          `Gifts: ${giftsToSave.length}\n` +
          `Total Diamonds: ${totalDiamonds}\n` +
          `Size: ${content.length} bytes`
        );

      } catch (error) {
        logError('tool', 'save-gifts', error);
        return createErrorResponse(`Failed to save gifts: ${error.message}`);
      }
    }
  );
}
