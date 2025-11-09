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
- **Comprehensive error tracking and debugging** 🆕
- Examples of tiktok functionalities without AI

Use the sessionId from cookie to get stream url (developper tool on tiktok web / application/ cookies / tiktok / search sessionId)


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


opencode: [https://github.com/sst/opencode]

```

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

```

"tiktok-mcp": {
  "command": "node",
  "args": [
    "/chemin/vers/tiktok-mcp/app.js"
  ],
  "env": {
    "TIKTOK_SESSION_ID": "your-sessionId"
  }
},

```

exemple : 

connecte toi au chat de samiepirate
lis le stream video de samiepirate
montre moi les 10 derniers messages

## Debugging

The server includes a comprehensive error tracking system. See [ERROR_TRACKING.md](ERROR_TRACKING.md) for details.

**Quick start:**
- Use `show-errors` tool to view all logged errors
- Use `clear-errors` tool to reset the error log
- All connection, tool, and system errors are automatically captured

## Available Tools

- `tiktok-connect` - Connect to a livestream
- `tiktok-disconnect` - Disconnect from a livestream
- `tiktok-messages` - Get recent chat messages
- `tiktok-gifts` - Get recent gifts
- `tiktok-likes` - Get likes statistics
- `tiktok-info` - Get stream information
- `tiktok-list` - List all active connections
- `play-video` - Play video with ffplay
- `stop-video` - Stop video playback
- `record-video` - Record livestream with ffmpeg
- `stop-record-video` - Stop recording
- `show-errors` - Display error log for debugging 🆕
- `clear-errors` - Clear error log 🆕


## License

MIT