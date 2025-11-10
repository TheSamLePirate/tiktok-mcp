/**
 * Utility Functions Module
 * 
 * Common utility functions used throughout the TikTok Live MCP Server.
 * 
 * @module utils
 */

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validates and normalizes a TikTok username
 * @param {string} username - Username to validate
 * @returns {string} Normalized username with @ prefix
 * @throws {Error} If username is empty
 */
export function normalizeUsername(username) {
  if (!username) {
    throw new Error("Username cannot be empty");
  }
  return username.startsWith('@') ? username : `@${username}`;
}

/**
 * Extracts stream URL from room info
 * @param {Object} roomInfo - TikTok room information
 * @returns {string} Stream URL or error message
 */
export function extractStreamUrl(roomInfo) {
  return roomInfo?.data?.stream_url?.flv_pull_url || "No stream URL available";
}

/**
 * Creates a standardized error response
 * @param {string} message - Error message
 * @returns {Object} MCP error response
 */
export function createErrorResponse(message) {
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
export function createSuccessResponse(message) {
  return {
    content: [{ type: "text", text: message }]
  };
}
