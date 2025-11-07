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
- play/stop video with ffplay
- Examples of tiktok functionalities without AI

Use the sessionId from cookie to get stream url (developper tool on tiktok web / application/ cookies / tiktok / search sessionId)


# Installation 

clone this repo

```
git clone https://github.com/TheSamLePirate/tiktok-mcp
```

install dependencies

```
npm install
```

# Usage in chat client


opencode: [https://github.com/sst/opencode]

```

"tiktok-mcp": {
  "type": "local",
  "command": ["node", "/chemin/vers/tiktok-mcp/index.js"],
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
    "/chemin/vers/tiktok-mcp/index.js"
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


## License

MIT