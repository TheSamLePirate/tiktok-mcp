/**
 * Video Tools Module
 * 
 * MCP tools for playing and recording TikTok livestream videos.
 * 
 * @module tools/videoTools
 */

import { z } from "zod";
import { spawn } from "child_process";
import { createErrorResponse, createSuccessResponse } from '../utils.js';
import { logError } from '../errorHandling.js';
import { 
  registerProcess, 
  stopProcess, 
  getAllProcesses, 
  isProcessActive,
  getProcessStats 
} from '../processManager.js';

/**
 * Registers video playback and recording tools with the MCP server
 * @param {McpServer} server - MCP server instance
 */
export function registerVideoTools(server) {
  
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

        // Use array syntax to prevent command injection
        const child = spawn('ffplay', ['-autoexit', url], {
          stdio: 'ignore',
          detached: true
        });

        child.unref();

        // Register the process for tracking
        const pid = registerProcess(child, 'playback', url);

        return createSuccessResponse(
          `Video playback started successfully\nProcess ID: ${pid}\n` +
          `URL: ${url}\n` +
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

        if (!isProcessActive(pidNum)) {
          return createErrorResponse(`Process ${pidNum} is not active or not managed by this server`);
        }

        const stopped = stopProcess(pidNum, false); // Use SIGKILL for immediate stop

        if (stopped) {
          return createSuccessResponse(`Stopped video player process ${pid}`);
        } else {
          return createErrorResponse(`Failed to stop process ${pid}`);
        }
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

        // Validate filename to prevent path traversal
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          return createErrorResponse("Invalid filename. Use simple filename without paths.");
        }

        // Use array syntax to prevent command injection
        const child = spawn('ffmpeg', ['-i', url, '-c', 'copy', filename], {
          stdio: 'ignore',
          detached: true
        });

        child.unref();

        // Register the process for tracking
        const pid = registerProcess(child, 'recording', url, filename);

        return createSuccessResponse(
          `Video recording started successfully\n` +
          `Output file: ${filename}\n` +
          `Process ID: ${pid}\n` +
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

        if (!isProcessActive(pidNum)) {
          return createErrorResponse(`Process ${pidNum} is not active or not managed by this server`);
        }

        const stopped = stopProcess(pidNum, true); // Use SIGTERM for graceful shutdown

        if (stopped) {
          return createSuccessResponse(
            `Stopped recording process ${pid}\n` +
            `The video file should be properly finalized`
          );
        } else {
          return createErrorResponse(`Failed to stop process ${pid}`);
        }
      } catch (error) {
        logError('tool', 'stop-record-video', error);
        return createErrorResponse(`Failed to stop recording: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: List Video Processes
  // ============================================================================

  server.tool(
    "list-video-processes",
    "List all active video playback and recording processes",
    {
      type: z.enum(['all', 'playback', 'recording']).optional().describe("Filter by process type (default: all)")
    },
    async ({ type = 'all' }) => {
      try {
        const processes = getAllProcesses(type === 'all' ? null : type);

        if (processes.length === 0) {
          return createSuccessResponse(`No active ${type === 'all' ? '' : type + ' '}processes`);
        }

        const stats = getProcessStats();
        const processList = processes
          .map(p => {
            const runtime = Math.floor((Date.now() - p.startedAt.getTime()) / 1000);
            const minutes = Math.floor(runtime / 60);
            const seconds = runtime % 60;
            
            let info = `PID ${p.pid} - ${p.type} - Runtime: ${minutes}m ${seconds}s`;
            if (p.filename) {
              info += `\n  File: ${p.filename}`;
            }
            info += `\n  URL: ${p.url.substring(0, 60)}...`;
            return info;
          })
          .join('\n\n');

        return createSuccessResponse(
          `Active Video Processes\n` +
          `${'='.repeat(50)}\n` +
          `Total: ${stats.total} (${stats.playback} playback, ${stats.recording} recording)\n\n` +
          processList
        );
      } catch (error) {
        logError('tool', 'list-video-processes', error);
        return createErrorResponse(`Failed to list processes: ${error.message}`);
      }
    }
  );
}
