/**
 * Error Handling Module
 * 
 * Centralized error logging and management for the TikTok Live MCP Server.
 * Tracks errors by type (connection, tool, system) with timestamps and stack traces.
 * 
 * @module errorHandling
 */

/**
 * Array of errors for debugging
 * @type {Array<ErrorLog>}
 */
export const errorLogs = [];

/**
 * @typedef {Object} ErrorLog
 * @property {string} timestamp - ISO timestamp of the error
 * @property {string} type - Type of error (connection, tool, system)
 * @property {string} source - Source of the error (username, tool name, etc.)
 * @property {string} message - Error message
 * @property {string} [stack] - Error stack trace (if available)
 */

/**
 * Logs an error to the error tracking system
 * @param {string} type - Type of error (connection, tool, system)
 * @param {string} source - Source of the error
 * @param {Error|string} error - Error object or message
 */
export function logError(type, source, error) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    type,
    source,
    message: error instanceof Error ? (error.message || 'Unknown error') : String(error),
    stack: error instanceof Error ? error.stack : undefined
  };

  errorLogs.push(errorLog);
  
  // Limit array size to prevent memory issues
  const MAX_STORED_ERRORS = 100;
  while (errorLogs.length > MAX_STORED_ERRORS) {
    errorLogs.shift();
  }

  // Also log to console for immediate visibility
  console.error(`[${type.toUpperCase()}] [${source}] ${errorLog.message}`);
}

/**
 * Clears all logged errors
 * @returns {number} Number of errors cleared
 */
export function clearErrors() {
  const count = errorLogs.length;
  errorLogs.length = 0;
  return count;
}

/**
 * Gets filtered errors by type
 * @param {string} type - Type to filter by ('all', 'connection', 'tool', 'system')
 * @returns {Array<ErrorLog>} Filtered error logs
 */
export function getErrorsByType(type) {
  if (type === 'all') {
    return errorLogs;
  }
  return errorLogs.filter(err => err.type === type);
}

/**
 * Gets error statistics
 * @returns {Object} Statistics by error type
 */
export function getErrorStats() {
  return errorLogs.reduce((acc, err) => {
    acc[err.type] = (acc[err.type] || 0) + 1;
    return acc;
  }, {});
}
