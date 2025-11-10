# TikTok MCP - Project Structure

```
tiktok-mcp/
│
├── app.js                          # Main MCP server entry point
├── package.json                    # Dependencies and scripts
│
├── Core Modules
│   ├── errorHandling.js            # Error logging system
│   ├── eventHandlers.js            # TikTok event handlers
│   ├── processManager.js           # Video process management
│   └── utils.js                    # Utility functions
│
├── Tools (MCP Tools)
│   ├── connectionTools.js          # TikTok connection tools
│   │   ├── tiktok-connect
│   │   ├── tiktok-disconnect
│   │   ├── tiktok-list
│   │   └── tiktok-info
│   │
│   ├── dataTools.js                # Data retrieval tools
│   │   ├── tiktok-messages
│   │   ├── tiktok-gifts
│   │   └── tiktok-likes
│   │
│   ├── videoTools.js               # Video playback/recording tools
│   │   ├── play-video
│   │   ├── stop-video
│   │   ├── record-video
│   │   ├── stop-record-video
│   │   └── list-video-processes
│   │
│   ├── transcriptTools.js          # 🆕 Real-time transcription tools
│   │   ├── start-transcript
│   │   ├── stop-transcript
│   │   ├── show-transcript
│   │   ├── clear-transcript
│   │   └── list-transcripts
│   │
│   └── debugTools.js               # Debugging tools
│       ├── show-errors
│       └── clear-errors
│
├── Examples & Tests
│   ├── example-chat.js             # Chat example
│   ├── example-stream-url.js       # Stream URL example
│   ├── test-errors.js              # Error handling tests
│   ├── test-ffmpeg.js              # FFmpeg tests
│   ├── test-stream.js              # Stream tests
│   └── test-transcript.js          # 🆕 Transcription tests
│
├── Documentation
│   ├── README.md                   # Main documentation
│   ├── CHANGELOG.md                # Version history
│   ├── CHANGELOG_TRANSCRIPT.md     # 🆕 Transcript feature changelog
│   ├── ERROR_ARCHITECTURE.md       # Error system architecture
│   ├── ERROR_EXAMPLES.md           # Error handling examples
│   ├── ERROR_TRACKING.md           # Error tracking guide
│   ├── TRANSCRIPT.md               # General transcript info
│   ├── TRANSCRIPT_TOOLS.md         # 🆕 Transcript tools guide
│   └── LICENSE                     # MIT License
│
└── Other
    ├── transcriptRealtime.js       # Original transcript implementation
    ├── transcriptRealtimeOk.js     # Working transcript version
    └── temp_audio/                 # Temporary audio files
```

## Architecture Overview

### Core Flow

```
User Request → MCP Server (app.js) → Tools → TikTok API / FFmpeg / OpenAI
                    ↓
            Event Handlers → Connections Map → Data Storage
                    ↓
            Error Handler → Error Log
```

### Transcription Flow

```
Stream URL → start-transcript
                ↓
        ┌──────────────────┐
        │  transcriptTools │
        └──────────────────┘
                ↓
        ┌──────────┬──────────┐
        │          │          │
    FFmpeg    WebSocket   Session
    (Audio)   (OpenAI)    Storage
        │          │          │
        └──────────┴──────────┘
                ↓
        Transcript Array
                ↓
    show/clear/stop tools
```

## Key Components

### 1. MCP Server (app.js)
- Initializes and runs MCP server
- Registers all tools
- Manages connections map
- Handles graceful shutdown

### 2. Tools Modules
Each tool module registers MCP tools with specific functionality:
- **Connection**: Manage TikTok livestream connections
- **Data**: Retrieve chat, gifts, likes data
- **Video**: Play and record streams
- **Transcript**: Real-time audio transcription 🆕
- **Debug**: Error tracking and logging

### 3. Shared Utilities
- `utils.js`: Common functions (normalize username, extract URLs, etc.)
- `errorHandling.js`: Centralized error logging
- `processManager.js`: Manage background processes
- `eventHandlers.js`: Handle TikTok events

### 4. State Management
- **connections**: Map<username, StreamConnection>
- **transcriptSessions**: Map<sessionId, TranscriptSession> 🆕
- **videoProcesses**: Map<pid, ProcessInfo>
- **errorLog**: Array of errors

## Data Flow

### Connection Lifecycle
```
tiktok-connect
    → TikTokLiveConnection
    → Store in connections Map
    → Setup event listeners
    → Return room info

tiktok-disconnect
    → Get from connections Map
    → Disconnect
    → Remove from Map
```

### Transcription Lifecycle 🆕
```
start-transcript
    → Connect to OpenAI WebSocket
    → Spawn FFmpeg process
    → Stream audio → OpenAI
    → Store transcripts
    → Return session ID

show-transcript
    → Get session from Map
    → Format transcript
    → Return to user

stop-transcript
    → Close WebSocket
    → Kill FFmpeg
    → Remove from Map
```

## Environment Variables

- `TIKTOK_SESSION_ID` - Optional: For stream URL access
- `OPENAI_API_KEY` - Required for transcription 🆕

## Dependencies

### Core
- `@modelcontextprotocol/sdk` - MCP protocol
- `tiktok-live-connector` - TikTok API
- `zod` - Schema validation

### Transcription 🆕
- `ws` - WebSocket client for OpenAI
- `child_process` (Node.js built-in) - FFmpeg spawning

### External Requirements
- **FFmpeg** - Audio/video processing
- **Node.js** >= 18.0.0

## Error Handling

All modules use centralized error logging:
```javascript
import { logError } from './errorHandling.js';

try {
  // operation
} catch (error) {
  logError('module', 'operation', error);
  return createErrorResponse(error.message);
}
```

Errors are:
- Logged with timestamp and context
- Limited to MAX_STORED_ERRORS
- Viewable via `show-errors` tool
- Clearable via `clear-errors` tool

## Shutdown Sequence

When SIGINT received:
1. Disconnect all TikTok connections
2. Stop all video processes
3. Stop all transcription sessions 🆕
4. Exit cleanly

---

**Last Updated**: November 9, 2025
**Version**: 2.1.0
