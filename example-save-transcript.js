#!/usr/bin/env node

/**
 * Example: Save Transcript Demo
 * 
 * This script demonstrates the new save-transcript functionality
 * and session persistence features.
 * 
 * Usage:
 *   node example-save-transcript.js
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║           TikTok MCP - Transcript Save Example                 ║
╚════════════════════════════════════════════════════════════════╝

This example demonstrates the new features in v2.2.0:
1. Session persistence after stopping
2. Saving transcripts to files (TXT, JSON, SRT)
3. Session management (list, delete)

────────────────────────────────────────────────────────────────

📝 NEW WORKFLOW:

1. Start Transcript
   ├─ Connect to livestream
   ├─ Get stream URL
   └─ start-transcript with URL → Returns session ID

2. Monitor & Stop
   ├─ show-transcript (check progress)
   ├─ stop-transcript → Session data PRESERVED! ✓
   └─ Session remains accessible

3. Save Transcript (NEW!)
   ├─ save-transcript as TXT → Human-readable
   ├─ save-transcript as JSON → Programmatic access
   └─ save-transcript as SRT → Video subtitles

4. Clean Up
   └─ delete-transcript → Permanently remove

────────────────────────────────────────────────────────────────

🎯 PRACTICAL EXAMPLES:

Example 1: Save after live stream ends
────────────────────────────────────────
User: "Connect to @samiepirate and start transcription"
Assistant: 
  - Connects to livestream
  - Gets stream URL
  - Starts transcription
  - Returns: "Session ID: transcript-1-1699564800000"

User: "The stream ended, stop the transcription"
Assistant:
  - Stops transcription
  - Returns: "Session data preserved"

User: "Save the transcript as a text file"
Assistant:
  - Saves to "samiepirate_live_2025-11-09.txt"
  - Returns: "File saved, 45 segments, 8192 bytes"

User: "Also save it as JSON for analysis"
Assistant:
  - Saves to "samiepirate_live_2025-11-09.json"
  - Returns: "File saved"

User: "Delete the session now"
Assistant:
  - Deletes session permanently
  - Returns: "Session deleted, 45 segments removed"

────────────────────────────────────────────────────────────────

Example 2: Review before saving
────────────────────────────────
User: "Start transcription of this stream URL: [url]"
Assistant: "Transcription started, session: transcript-2-..."

(after some time)

User: "Stop the transcription"
Assistant: "Stopped, 23 segments transcribed, data preserved"

User: "Show me the transcript"
Assistant: *displays all 23 segments*

User: "The quality looks good, save it as text"
Assistant: "Saved to transcript.txt"

User: "Delete the session"
Assistant: "Session deleted"

────────────────────────────────────────────────────────────────

Example 3: Multiple sessions and selective saving
──────────────────────────────────────────────────
User: "List all transcription sessions"
Assistant:
  Session 1: Active ✓ (12 segments)
  Session 2: Stopped (45 segments)
  Session 3: Stopped (8 segments)

User: "Save session 2 as JSON"
Assistant: "Saved to transcript_session_2.json"

User: "Delete session 3"
Assistant: "Deleted, 8 segments removed"

User: "Show transcript for session 2"
Assistant: *displays 45 segments*

────────────────────────────────────────────────────────────────

📄 FILE FORMATS:

TXT Format - Plain text with metadata
─────────────────────────────────────
Transcript - Session: transcript-1-1699564800000
============================================================
Language: fr
Started: 2025-11-09T10:30:00.000Z
Stopped: 2025-11-09T10:45:00.000Z
Runtime: 15m 0s
Total Segments: 25
============================================================

[2025-11-09T10:30:15.000Z] Bonjour tout le monde !
[2025-11-09T10:30:45.000Z] Merci d'être venus
...


JSON Format - Structured data
──────────────────────────────
{
  "sessionId": "transcript-1-1699564800000",
  "language": "fr",
  "startedAt": "2025-11-09T10:30:00.000Z",
  "stoppedAt": "2025-11-09T10:45:00.000Z",
  "streamUrl": "https://...",
  "totalSegments": 25,
  "transcript": [
    {
      "text": "Bonjour tout le monde !",
      "timestamp": "2025-11-09T10:30:15.000Z"
    }
  ]
}


SRT Format - Video subtitles
─────────────────────────────
1
00:00:15,000 --> 00:00:45,000
Bonjour tout le monde !

2
00:00:45,000 --> 00:01:20,000
Merci d'être venus

────────────────────────────────────────────────────────────────

🔧 MCP TOOL CALLS:

Start:
{
  "tool": "start-transcript",
  "arguments": {
    "streamUrl": "https://...",
    "language": "fr"
  }
}

Stop (preserves data!):
{
  "tool": "stop-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}

Save as TXT:
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "my_transcript.txt"
  }
}

Save as JSON:
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "my_transcript.json",
    "format": "json"
  }
}

Save as SRT:
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "subtitles.srt"
  }
}

List all:
{
  "tool": "list-transcripts",
  "arguments": {}
}

Delete:
{
  "tool": "delete-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}

────────────────────────────────────────────────────────────────

✨ KEY IMPROVEMENTS in v2.2.0:

✅ Sessions persist after stopping (no data loss!)
✅ Save to multiple formats: TXT, JSON, SRT
✅ Review transcripts before saving
✅ Keep historical sessions for comparison
✅ Explicit deletion with delete-transcript
✅ Better session management

────────────────────────────────────────────────────────────────

📚 Documentation:
- Full guide: TRANSCRIPT_TOOLS.md
- Quick start: QUICKSTART_TRANSCRIPT.md
- Changelog: CHANGELOG_TRANSCRIPT_v2.2.md

Happy transcribing! 🎤

`);
