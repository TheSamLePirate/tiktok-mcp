/**
 * Debug Tools Module
 * 
 * MCP tools for error tracking and debugging.
 * 
 * @module tools/debugTools
 */

import { z } from "zod";
import { createErrorResponse, createSuccessResponse } from '../utils.js';
import { logError, errorLogs, clearErrors, getErrorsByType, getErrorStats } from '../errorHandling.js';

/**
 * Registers debugging and error tracking tools with the MCP server
 * @param {McpServer} server - MCP server instance
 */
export function registerDebugTools(server) {
  
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
        const filteredErrors = getErrorsByType(type);

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
        const errorsByType = getErrorStats();

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
        const errorCount = clearErrors();
        
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
}
