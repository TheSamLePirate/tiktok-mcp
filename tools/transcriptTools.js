/**
 * Transcript Tools Module
 * 
 * MCP tools for real-time transcription of TikTok livestream audio.
 * Uses OpenAI's Realtime API to transcribe audio from stream URLs.
 * 
 * @module tools/transcriptTools
 */

import { z } from "zod";
import WebSocket from "ws";
import { spawn } from "child_process";
import { createErrorResponse, createSuccessResponse } from '../utils.js';
import { logError } from '../errorHandling.js';

/**
 * Map of active transcription sessions
 * @type {Map<string, TranscriptSession>}
 */
const transcriptSessions = new Map();

/**
 * @typedef {Object} TranscriptSession
 * @property {WebSocket} ws - WebSocket connection to OpenAI Realtime API
 * @property {ChildProcess} ffmpeg - FFmpeg process for audio extraction
 * @property {Array<string>} transcript - Array of transcribed text segments
 * @property {Date} startedAt - Session start timestamp
 * @property {Date} stoppedAt - Session stop timestamp (null if active)
 * @property {string} streamUrl - Source stream URL
 * @property {string} sessionId - Unique session identifier
 * @property {boolean} isActive - Whether the session is currently running
 * @property {string} language - Transcription language code
 */

let sessionCounter = 0;

/**
 * Registers transcript-related tools with the MCP server
 * @param {McpServer} server - MCP server instance
 */
export function registerTranscriptTools(server) {
  
  // ============================================================================
  // Tool: Start Transcription
  // ============================================================================

  server.tool(
    "start-transcript",
    "Start real-time transcription of a TikTok livestream audio",
    {
      streamUrl: z.string().describe("Stream URL to transcribe (full URL with expire and sign parameters)"),
      language: z.string().optional().describe("Language code for transcription (default: 'fr')")
    },
    async ({ streamUrl, language = "fr" }) => {
      try {
        if (!streamUrl || !streamUrl.startsWith('http')) {
          return createErrorResponse("Invalid stream URL provided");
        }

        const API_KEY = process.env.OPENAI_API_KEY;
        if (!API_KEY) {
          return createErrorResponse(
            "Missing OPENAI_API_KEY environment variable. " +
            "Please set it to use transcription features."
          );
        }

        // Generate unique session ID
        const sessionId = `transcript-${++sessionCounter}-${Date.now()}`;

        // Create WebSocket connection to OpenAI Realtime API
        const url = "wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28";
        const ws = new WebSocket(url, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "OpenAI-Beta": "realtime=v1",
          },
        });

        const session = {
          ws,
          ffmpeg: null,
          transcript: [],
          startedAt: new Date(),
          stoppedAt: null,
          streamUrl,
          sessionId,
          language,
          isActive: true
        };

        // Set up WebSocket message handlers
        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString());
            
            // Capture completed transcriptions
            if (msg.type === "conversation.item.input_audio_transcription.completed" && msg.transcript) {
              session.transcript.push({
                text: msg.transcript,
                timestamp: new Date().toISOString()
              });
            }
            
            if (msg.type === "error") {
              logError('transcript', `session-${sessionId}`, new Error(msg.error?.message || JSON.stringify(msg)));
            }
          } catch (err) {
            logError('transcript', `parse-${sessionId}`, err);
          }
        });

        // Wait for WebSocket to open
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("WebSocket connection timeout"));
          }, 10000);

          ws.on("open", () => {
            clearTimeout(timeout);
            resolve();
          });

          ws.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        // Configure the transcription session
        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text"],
              input_audio_format: "pcm16",
              input_audio_transcription: {
                model: "gpt-4o-transcribe",
                language: language
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.2,
                prefix_padding_ms: 100,
                silence_duration_ms: 100
              }
            },
          })
        );

        // Start FFmpeg to extract and convert audio
        const ffmpeg = spawn("ffmpeg", [
          "-re", // Read in real-time
          "-i", streamUrl,
          "-vn", // No video, audio only
          "-ac", "1", // Mono audio
          "-ar", "24000", // 24kHz sample rate
          "-f", "s16le", // 16-bit PCM little-endian
          "pipe:1"
        ], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        session.ffmpeg = ffmpeg;

        // Handle FFmpeg errors
        ffmpeg.stderr.on("data", (chunk) => {
          // Optionally log FFmpeg output for debugging
          const msg = chunk.toString();
          if (msg.includes('Error') || msg.includes('error')) {
            logError('transcript', `ffmpeg-${sessionId}`, new Error(msg));
          }
        });

        ffmpeg.on("close", (code) => {
          // Commit final audio buffer when FFmpeg stops
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
            }
          } catch (err) {
            logError('transcript', `ffmpeg-close-${sessionId}`, err);
          }
        });

        // Stream audio data to OpenAI
        let lastCommit = Date.now();
        ffmpeg.stdout.on("data", (chunk) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          
          try {
            // Encode and send audio
            const b64 = chunk.toString("base64");
            ws.send(
              JSON.stringify({
                type: "input_audio_buffer.append",
                audio: b64,
              })
            );
            
            // Commit periodically to force transcription of long segments
            const now = Date.now();
            if (now - lastCommit >= 60000) { // Every 60 seconds
              ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
              lastCommit = now;
            }
          } catch (err) {
            logError('transcript', `audio-stream-${sessionId}`, err);
          }
        });

        // Handle WebSocket close - mark as inactive but keep session
        ws.on("close", () => {
          if (ffmpeg && !ffmpeg.killed) {
            ffmpeg.kill();
          }
          session.isActive = false;
          session.stoppedAt = new Date();
        });

        // Store the session
        transcriptSessions.set(sessionId, session);

        return createSuccessResponse(
          `Transcription started successfully\n` +
          `Session ID: ${sessionId}\n` +
          `Language: ${language}\n` +
          `Stream URL: ${streamUrl.substring(0, 60)}...\n` +
          `Use this Session ID to stop, show, or clear the transcript`
        );

      } catch (error) {
        logError('tool', 'start-transcript', error);
        return createErrorResponse(`Failed to start transcription: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Stop Transcription
  // ============================================================================

  server.tool(
    "stop-transcript",
    "Stop an active transcription session (keeps session data for later retrieval)",
    {
      sessionId: z.string().describe("Session ID of the transcription to stop")
    },
    async ({ sessionId }) => {
      try {
        const session = transcriptSessions.get(sessionId);
        
        if (!session) {
          return createErrorResponse(
            `Transcription session '${sessionId}' not found. ` +
            `Use 'list-transcripts' to see all sessions.`
          );
        }

        if (!session.isActive) {
          return createSuccessResponse(
            `Session '${sessionId}' is already stopped.\n` +
            `Segments: ${session.transcript.length}\n` +
            `Use 'show-transcript' to view or 'delete-transcript' to remove.`
          );
        }

        const transcriptCount = session.transcript.length;
        const runtime = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

        // Close WebSocket
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.close();
        }

        // Kill FFmpeg process
        if (session.ffmpeg && !session.ffmpeg.killed) {
          session.ffmpeg.kill('SIGTERM');
        }

        // Mark as inactive and set stop time (keep in map)
        session.isActive = false;
        session.stoppedAt = new Date();

        return createSuccessResponse(
          `Transcription stopped successfully\n` +
          `Session ID: ${sessionId}\n` +
          `Runtime: ${Math.floor(runtime / 60)}m ${runtime % 60}s\n` +
          `Segments transcribed: ${transcriptCount}\n` +
          `Session data preserved - use 'show-transcript' to view or 'save-transcript' to save`
        );

      } catch (error) {
        logError('tool', 'stop-transcript', error);
        return createErrorResponse(`Failed to stop transcription: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Show Transcript
  // ============================================================================

  server.tool(
    "show-transcript",
    "Display the current transcript from an active or stopped session",
    {
      sessionId: z.string().describe("Session ID of the transcription to show"),
      count: z.number().optional().describe("Number of recent segments to show (default: all)")
    },
    async ({ sessionId, count }) => {
      try {
        const session = transcriptSessions.get(sessionId);
        
        if (!session) {
          return createErrorResponse(
            `Transcription session '${sessionId}' not found. ` +
            `Session may have been stopped or cleared.`
          );
        }

        if (session.transcript.length === 0) {
          return createSuccessResponse(
            `No transcript data yet for session '${sessionId}'\n` +
            `Session is active and listening...`
          );
        }

        const segments = count 
          ? session.transcript.slice(-count)
          : session.transcript;

        const formattedTranscript = segments
          .map((seg, idx) => `[${seg.timestamp}] ${seg.text}`)
          .join('\n\n');

        const runtime = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
        const isActive = session.isActive && session.ws && session.ws.readyState === WebSocket.OPEN;

        return createSuccessResponse(
          `Transcript for Session: ${sessionId}\n` +
          `${'='.repeat(50)}\n` +
          `Status: ${isActive ? 'Active' : 'Stopped'}\n` +
          `Language: ${session.language}\n` +
          `Runtime: ${Math.floor(runtime / 60)}m ${runtime % 60}s\n` +
          `Total Segments: ${session.transcript.length}\n` +
          `Showing: ${segments.length} segment(s)\n\n` +
          `${'='.repeat(50)}\n\n` +
          formattedTranscript
        );

      } catch (error) {
        logError('tool', 'show-transcript', error);
        return createErrorResponse(`Failed to show transcript: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Clear Transcript
  // ============================================================================

  server.tool(
    "clear-transcript",
    "Clear the transcript data from a session (keeps session running)",
    {
      sessionId: z.string().describe("Session ID of the transcription to clear")
    },
    async ({ sessionId }) => {
      try {
        const session = transcriptSessions.get(sessionId);
        
        if (!session) {
          return createErrorResponse(
            `Transcription session '${sessionId}' not found. ` +
            `Session may have been stopped.`
          );
        }

        const clearedCount = session.transcript.length;
        session.transcript = [];

        const statusMsg = session.isActive 
          ? "Session is still active and will continue transcribing"
          : "Session is stopped";

        return createSuccessResponse(
          `Transcript cleared successfully\n` +
          `Session ID: ${sessionId}\n` +
          `Segments cleared: ${clearedCount}\n` +
          statusMsg
        );

      } catch (error) {
        logError('tool', 'clear-transcript', error);
        return createErrorResponse(`Failed to clear transcript: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Save Transcript to File
  // ============================================================================

  server.tool(
    "save-transcript",
    "Save transcript to a file (JSON, TXT, or SRT format)",
    {
      sessionId: z.string().describe("Session ID of the transcription to save"),
      filename: z.string().describe("Output filename (e.g., 'transcript.txt', 'transcript.json', 'transcript.srt')"),
      format: z.enum(['txt', 'json', 'srt']).optional().describe("File format (auto-detected from filename if not specified)")
    },
    async ({ sessionId, filename, format }) => {
      try {
        const session = transcriptSessions.get(sessionId);
        
        if (!session) {
          return createErrorResponse(
            `Transcription session '${sessionId}' not found.`
          );
        }

        if (session.transcript.length === 0) {
          return createErrorResponse(
            `No transcript data to save for session '${sessionId}'`
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
          else if (filename.endsWith('.srt')) fileFormat = 'srt';
          else fileFormat = 'txt';
        }

        let content = '';

        // Generate content based on format
        switch (fileFormat) {
          case 'json':
            const jsonData = {
              sessionId: session.sessionId,
              language: session.language,
              startedAt: session.startedAt.toISOString(),
              stoppedAt: session.stoppedAt ? session.stoppedAt.toISOString() : null,
              streamUrl: session.streamUrl,
              totalSegments: session.transcript.length,
              transcript: session.transcript
            };
            content = JSON.stringify(jsonData, null, 2);
            break;

          case 'srt':
            // SRT subtitle format
            content = session.transcript
              .map((seg, idx) => {
                const startTime = new Date(seg.timestamp);
                const endTime = idx < session.transcript.length - 1 
                  ? new Date(session.transcript[idx + 1].timestamp)
                  : new Date(startTime.getTime() + 5000); // 5 seconds default
                
                const formatSrtTime = (date) => {
                  const hours = String(date.getUTCHours()).padStart(2, '0');
                  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                  const millis = String(date.getUTCMilliseconds()).padStart(3, '0');
                  return `${hours}:${minutes}:${seconds},${millis}`;
                };

                return (
                  `${idx + 1}\n` +
                  `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n` +
                  `${seg.text}\n`
                );
              })
              .join('\n');
            break;

          case 'txt':
          default:
            // Plain text format with timestamps
            const runtime = session.stoppedAt 
              ? Math.floor((session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000)
              : Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
            
            content = 
              `Transcript - Session: ${sessionId}\n` +
              `${'='.repeat(60)}\n` +
              `Language: ${session.language}\n` +
              `Started: ${session.startedAt.toISOString()}\n` +
              `${session.stoppedAt ? `Stopped: ${session.stoppedAt.toISOString()}\n` : 'Status: Active\n'}` +
              `Runtime: ${Math.floor(runtime / 60)}m ${runtime % 60}s\n` +
              `Total Segments: ${session.transcript.length}\n` +
              `${'='.repeat(60)}\n\n` +
              session.transcript
                .map(seg => `[${seg.timestamp}] ${seg.text}`)
                .join('\n\n');
            break;
        }

        // Write to file (using dynamic import for fs)
        const fs = await import('fs/promises');
        await fs.writeFile(filename, content, 'utf-8');

        return createSuccessResponse(
          `Transcript saved successfully\n` +
          `File: ${filename}\n` +
          `Format: ${fileFormat.toUpperCase()}\n` +
          `Segments: ${session.transcript.length}\n` +
          `Size: ${content.length} bytes`
        );

      } catch (error) {
        logError('tool', 'save-transcript', error);
        return createErrorResponse(`Failed to save transcript: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: Delete Transcript Session
  // ============================================================================

  server.tool(
    "delete-transcript",
    "Permanently delete a transcript session and its data",
    {
      sessionId: z.string().describe("Session ID of the transcription to delete")
    },
    async ({ sessionId }) => {
      try {
        const session = transcriptSessions.get(sessionId);
        
        if (!session) {
          return createErrorResponse(
            `Transcription session '${sessionId}' not found.`
          );
        }

        // Stop if still active
        if (session.isActive) {
          if (session.ws && session.ws.readyState === WebSocket.OPEN) {
            session.ws.close();
          }
          if (session.ffmpeg && !session.ffmpeg.killed) {
            session.ffmpeg.kill('SIGTERM');
          }
        }

        const segmentCount = session.transcript.length;

        // Remove from map
        transcriptSessions.delete(sessionId);

        return createSuccessResponse(
          `Transcript session deleted successfully\n` +
          `Session ID: ${sessionId}\n` +
          `Segments deleted: ${segmentCount}`
        );

      } catch (error) {
        logError('tool', 'delete-transcript', error);
        return createErrorResponse(`Failed to delete transcript: ${error.message}`);
      }
    }
  );

  // ============================================================================
  // Tool: List Transcript Sessions
  // ============================================================================

  server.tool(
    "list-transcripts",
    "List all transcription sessions (active and stopped)",
    {},
    async () => {
      try {
        if (transcriptSessions.size === 0) {
          return createSuccessResponse("No transcription sessions");
        }

        const sessionList = Array.from(transcriptSessions.entries())
          .map(([sessionId, session]) => {
            const runtime = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
            const isActive = session.isActive && session.ws && session.ws.readyState === WebSocket.OPEN;
            
            return (
              `Session ID: ${sessionId}\n` +
              `  Status: ${isActive ? 'Active ✓' : 'Stopped'}\n` +
              `  Language: ${session.language}\n` +
              `  Runtime: ${Math.floor(runtime / 60)}m ${runtime % 60}s\n` +
              `  Segments: ${session.transcript.length}\n` +
              `  Stream: ${session.streamUrl.substring(0, 50)}...`
            );
          })
          .join('\n\n');

        const activeCount = Array.from(transcriptSessions.values())
          .filter(s => s.isActive).length;
        const stoppedCount = transcriptSessions.size - activeCount;

        return createSuccessResponse(
          `Transcription Sessions (${transcriptSessions.size} total)\n` +
          `Active: ${activeCount} | Stopped: ${stoppedCount}\n` +
          `${'='.repeat(50)}\n\n` +
          sessionList
        );

      } catch (error) {
        logError('tool', 'list-transcripts', error);
        return createErrorResponse(`Failed to list transcription sessions: ${error.message}`);
      }
    }
  );
}

/**
 * Stop all active transcription sessions (for cleanup)
 * Marks sessions as inactive but keeps data for retrieval
 * @param {boolean} deleteAll - If true, delete all sessions; if false, just stop them
 * @returns {number} Number of sessions stopped
 */
export function stopAllTranscriptions(deleteAll = false) {
  let count = 0;
  
  for (const [sessionId, session] of transcriptSessions.entries()) {
    try {
      if (session.isActive) {
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
          session.ws.close();
        }
        if (session.ffmpeg && !session.ffmpeg.killed) {
          session.ffmpeg.kill('SIGTERM');
        }
        session.isActive = false;
        session.stoppedAt = new Date();
        count++;
      }
    } catch (error) {
      logError('cleanup', `stop-transcript-${sessionId}`, error);
    }
  }
  
  // Only clear if explicitly requested
  if (deleteAll) {
    transcriptSessions.clear();
  }
  
  return count;
}
