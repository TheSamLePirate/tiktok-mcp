# TikTok Live MCP Server

A Model Context Protocol (MCP) server for accessing TikTok livestream chat data and events.

## Features

- Get live room info
- Get Livestream url
- Get real-time chat messages
- Track gifts and donations
- Monitor viewer counts
- Multiple chat connections
- Disconnect from streams
- Play/stop video with ffplay
- Record livestreams with ffmpeg
- **Real-time audio transcription** 🆕
- **Comprehensive error tracking and debugging** 🆕
- Examples of tiktok functionalities without AI

Use the sessionId from cookie to get stream url (developper tool on tiktok web / application/ cookies / tiktok / search sessionId)

## Prerequisites

- **Node.js** >= 18.0.0
- **FFmpeg** (for video playback and recording)
- **OpenAI API Key** (for transcription features - optional)


# Installation 

clone this repo

```
git clone https://github.com/TheSamLePirate/tiktok-mcp
```

install dependencies

```
cd tiktok-mcp
npm install
```

# Usage in chat client

## Configuration

### Basic Configuration

opencode: [https://github.com/sst/opencode]

```json
"tiktok-mcp": {
  "type": "local",
  "command": ["node", "/chemin/vers/tiktok-mcp/app.js"],
  "enabled": true,
  "environment": {
    "TIKTOK_SESSION_ID": "your-sessionId"
  }
}
```

claude desktop: 

```json
"tiktok-mcp": {
  "command": "node",
  "args": [
    "/chemin/vers/tiktok-mcp/app.js"
  ],
  "env": {
    "TIKTOK_SESSION_ID": "your-sessionId"
  }
}
```

### With Transcription Support

To enable transcription features, add `OPENAI_API_KEY` to the environment:

```json
"tiktok-mcp": {
  "type": "local",
  "command": ["node", "/chemin/vers/tiktok-mcp/app.js"],
  "enabled": true,
  "environment": {
    "TIKTOK_SESSION_ID": "your-sessionId",
    "OPENAI_API_KEY": "sk-..."
  }
}
```

## Examples

### Basic Usage
```
connecte toi au chat de samiepirate
lis le stream video de samiepirate
montre moi les 10 derniers messages
```

### With Transcription
```
connecte toi au chat de samiepirate
donne moi les infos du stream de samiepirate
démarre la transcription du stream avec l'url obtenue
montre moi la transcription
```

## Debugging

The server includes a comprehensive error tracking system. See [ERROR_TRACKING.md](ERROR_TRACKING.md) for details.

**Quick start:**
- Use `show-errors` tool to view all logged errors
- Use `clear-errors` tool to reset the error log
- All connection, tool, and system errors are automatically captured

## Available Tools

### Connection Tools
- `tiktok-connect` - Connect to a livestream
- `tiktok-disconnect` - Disconnect from a livestream
- `tiktok-info` - Get stream information
- `tiktok-list` - List all active connections

### Data Tools
- `tiktok-messages` - Get recent chat messages
- `tiktok-gifts` - Get recent gifts
- `tiktok-likes` - Get likes statistics
- `save-messages` - Save messages to file (TXT/JSON/CSV) 🆕
- `save-gifts` - Save gifts to file (TXT/JSON/CSV) 🆕

### Video Tools
- `play-video` - Play video with ffplay
- `stop-video` - Stop video playback
- `record-video` - Record livestream with ffmpeg
- `stop-record-video` - Stop recording
- `list-video-processes` - List active video processes

### Transcript Tools 🆕
- `start-transcript` - Start real-time audio transcription
- `stop-transcript` - Stop transcription (keeps session data)
- `show-transcript` - Display transcript content
- `clear-transcript` - Clear transcript data
- `save-transcript` - Save transcript to file (TXT/JSON/SRT) 🆕
- `delete-transcript` - Permanently delete a session 🆕
- `list-transcripts` - List all transcription sessions (active and stopped)

See [TRANSCRIPT_TOOLS.md](TRANSCRIPT_TOOLS.md) for detailed transcription documentation.

### Debug Tools
- `show-errors` - Display error log for debugging 🆕
- `clear-errors` - Clear error log 🆕


## License

MIT