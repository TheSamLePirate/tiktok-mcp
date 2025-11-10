# Transcript Tools Documentation

## Overview

The transcript tools module provides real-time transcription capabilities for TikTok livestream audio using OpenAI's Realtime API. Audio is extracted from the stream URL using FFmpeg and transcribed in real-time.

## Prerequisites

1. **OpenAI API Key**: Set the `OPENAI_API_KEY` environment variable
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. **FFmpeg**: Must be installed and available in your PATH
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   ```

## Available Tools

### 1. `start-transcript`

Start a real-time transcription session for a livestream.

**Parameters:**
- `streamUrl` (required): Full stream URL with expire and sign parameters
- `language` (optional): Language code for transcription (default: 'fr')

**Returns:**
- Session ID to use with other transcript tools
- Status information

**Example:**
```javascript
{
  "tool": "start-transcript",
  "arguments": {
    "streamUrl": "https://example.com/stream.flv?expire=...&sign=...",
    "language": "fr"
  }
}
```

### 2. `stop-transcript`

Stop an active transcription session. **Session data is preserved** for later retrieval or saving.

**Parameters:**
- `sessionId` (required): Session ID returned from `start-transcript`

**Returns:**
- Session statistics (runtime, segments transcribed)
- Confirmation that session data is preserved

**Note:** Stopped sessions remain accessible via `show-transcript` and `save-transcript` until explicitly deleted with `delete-transcript`.

**Example:**
```javascript
{
  "tool": "stop-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}
```

### 3. `show-transcript`

Display the transcript from an active or stopped session.

**Parameters:**
- `sessionId` (required): Session ID
- `count` (optional): Number of recent segments to show (default: all)

**Returns:**
- Formatted transcript with timestamps
- Session information

**Example:**
```javascript
{
  "tool": "show-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "count": 10
  }
}
```

### 4. `clear-transcript`

Clear the transcript data from a session (keeps session running).

**Parameters:**
- `sessionId` (required): Session ID

**Returns:**
- Number of segments cleared

**Example:**
```javascript
{
  "tool": "clear-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}
```

### 5. `save-transcript`

Save transcript to a file in TXT, JSON, or SRT format.

**Parameters:**
- `sessionId` (required): Session ID
- `filename` (required): Output filename (e.g., 'transcript.txt', 'transcript.json', 'transcript.srt')
- `format` (optional): File format ('txt', 'json', 'srt') - auto-detected from filename if not specified

**Formats:**
- **TXT**: Plain text with timestamps and session metadata
- **JSON**: Structured data with all session information
- **SRT**: Subtitle format compatible with video players

**Returns:**
- File path and statistics

**Example:**
```javascript
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "tiktok_live_transcript.txt"
  }
}
```

### 6. `delete-transcript`

Permanently delete a transcript session and its data.

**Parameters:**
- `sessionId` (required): Session ID to delete

**Returns:**
- Confirmation and number of segments deleted

**Note:** This action is permanent. Use `save-transcript` first if you want to keep the data.

**Example:**
```javascript
{
  "tool": "delete-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}
```

### 7. `list-transcripts`

List all transcription sessions (active and stopped).

**Parameters:** None

**Returns:**
- List of all sessions with statistics
- Count of active vs stopped sessions

**Example:**
```javascript
{
  "tool": "list-transcripts",
  "arguments": {}
}
```

## Workflow Example

Here's a typical workflow for transcribing a TikTok livestream:

1. **Connect to a livestream** (to get the stream URL):
   ```javascript
   {
     "tool": "tiktok-connect",
     "arguments": {
       "username": "example_user"
     }
   }
   ```

2. **Get stream information** (to retrieve the stream URL):
   ```javascript
   {
     "tool": "tiktok-info",
     "arguments": {
       "username": "example_user"
     }
   }
   ```

3. **Start transcription** using the stream URL:
   ```javascript
   {
     "tool": "start-transcript",
     "arguments": {
       "streamUrl": "https://pull-flv-l1-va01.tiktokcdn.com/...",
       "language": "fr"
     }
   }
   ```
   
   Note the returned Session ID (e.g., `transcript-1-1699564800000`)

4. **Monitor the transcript** periodically:
   ```javascript
   {
     "tool": "show-transcript",
     "arguments": {
       "sessionId": "transcript-1-1699564800000",
       "count": 5
     }
   }
   ```

5. **Clear old segments** if needed (optional):
   ```javascript
   {
     "tool": "clear-transcript",
     "arguments": {
       "sessionId": "transcript-1-1699564800000"
     }
   }
   ```

6. **Stop transcription** when done:
   ```javascript
   {
     "tool": "stop-transcript",
     "arguments": {
       "sessionId": "transcript-1-1699564800000"
     }
   }
   ```
   
   **Note:** Session data is preserved after stopping!

7. **Save transcript to file** (after stopping or while active):
   ```javascript
   {
     "tool": "save-transcript",
     "arguments": {
       "sessionId": "transcript-1-1699564800000",
       "filename": "my_transcript.txt"
     }
   }
   ```

8. **Delete session** when no longer needed (optional):
   ```javascript
   {
     "tool": "delete-transcript",
     "arguments": {
       "sessionId": "transcript-1-1699564800000"
     }
   }
   ```

## Technical Details

### File Formats

#### TXT Format
Plain text file with session metadata and timestamped segments:
```
Transcript - Session: transcript-1-1699564800000
============================================================
Language: fr
Started: 2025-11-09T10:30:00.000Z
Stopped: 2025-11-09T10:45:00.000Z
Runtime: 15m 0s
Total Segments: 25
============================================================

[2025-11-09T10:30:15.000Z] Bonjour tout le monde !
[2025-11-09T10:30:45.000Z] Merci d'être venus nombreux
...
```

#### JSON Format
Structured data with complete session information:
```json
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
    },
    ...
  ]
}
```

#### SRT Format
Standard subtitle format compatible with video players:
```
1
00:00:15,000 --> 00:00:45,000
Bonjour tout le monde !

2
00:00:45,000 --> 00:01:20,000
Merci d'être venus nombreux

...
```

### Audio Processing

- **Format**: PCM 16-bit little-endian
- **Sample Rate**: 24kHz
- **Channels**: Mono (1 channel)
- **Streaming**: Real-time with `-re` flag

### Transcription Engine

- **Model**: gpt-4o-transcribe (via OpenAI Realtime API)
- **Voice Activity Detection**: Server VAD
  - Threshold: 0.2
  - Prefix padding: 100ms
  - Silence duration: 100ms
- **Commit Interval**: Every 60 seconds for long segments

### Session Management

- Sessions are tracked in memory
- Each session has a unique ID
- **Sessions persist after stopping** - data remains accessible
- Use `delete-transcript` to permanently remove a session
- Graceful shutdown stops all active sessions (but preserves data)
- Session data includes: transcript segments, timestamps, language, stream URL, runtime

## Error Handling

The transcript tools include comprehensive error handling:

- WebSocket connection errors
- FFmpeg process errors
- Audio streaming errors
- Session not found errors
- Missing API key errors

All errors are logged using the application's error logging system.

## Cleanup

All transcription sessions are automatically stopped when the MCP server shuts down (SIGINT/Ctrl+C).

## Supported Languages

The transcription supports multiple languages. Common language codes:
- `fr`: French
- `en`: English
- `es`: Spanish
- `de`: German
- `it`: Italian
- `pt`: Portuguese
- `ja`: Japanese
- `ko`: Korean
- `zh`: Chinese

Refer to OpenAI's documentation for the complete list of supported languages.
