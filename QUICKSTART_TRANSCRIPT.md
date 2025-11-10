# Quick Start - Transcription Tools

## 🚀 5-Minute Setup

### 1. Prerequisites

```bash
# Check Node.js version (need >= 18.0.0)
node --version

# Check FFmpeg installation
ffmpeg -version

# If FFmpeg not installed on macOS:
brew install ffmpeg
```

### 2. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### 3. Set Environment Variable

```bash
# For current session
export OPENAI_API_KEY="sk-your-api-key-here"

# Or add to ~/.zshrc for permanent setup
echo 'export OPENAI_API_KEY="sk-your-api-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 4. Configure MCP Client

Add to your MCP client config (Claude Desktop, OpenCode, etc.):

```json
"tiktok-mcp": {
  "command": "node",
  "args": ["/path/to/tiktok-mcp/app.js"],
  "env": {
    "OPENAI_API_KEY": "sk-your-api-key-here",
    "TIKTOK_SESSION_ID": "your-session-id"
  }
}
```

### 5. Test It

```bash
# Terminal test
cd /path/to/tiktok-mcp
node test-transcript.js @username
```

## 📋 Basic Workflow

### Step-by-Step

**1. Connect to a TikTok livestream:**
```
Connect to @username's livestream
```
MCP Tool: `tiktok-connect` with username

**2. Get stream information:**
```
Show me the stream info for @username
```
MCP Tool: `tiktok-info` - Copy the Stream URL from response

**3. Start transcription:**
```
Start transcription of the stream with URL: [paste-stream-url]
```
MCP Tool: `start-transcript` - Note the Session ID

**4. View transcript:**
```
Show me the transcript for session [session-id]
```
MCP Tool: `show-transcript`

**5. Stop when done:**
```
Stop the transcription session [session-id]
```
MCP Tool: `stop-transcript`

## 💬 Example Conversation

**You:** "Connect to @samiepirate's livestream"

**Assistant:** Uses `tiktok-connect` tool
```
✅ Connected to samiepirate's livestream
Room ID: 123456789
Viewers: 1250
Stream URL available: true
```

**You:** "Show me the stream info"

**Assistant:** Uses `tiktok-info` tool
```
Stream Information for samiepirate
Room ID: 123456789
Current Viewers: 1250
Stream URL Available: https://pull-flv-l1-va01.tiktokcdn.com/...
```

**You:** "Start transcription in French"

**Assistant:** Uses `start-transcript` tool with the stream URL
```
✅ Transcription started successfully
Session ID: transcript-1-1699564800000
Language: fr
```

**You:** "Show me the latest transcript"

**Assistant:** Uses `show-transcript` tool
```
Transcript for Session: transcript-1-1699564800000
Status: Active
Runtime: 2m 30s
Total Segments: 5

[2025-11-09T10:30:15Z] Bonjour tout le monde !
[2025-11-09T10:30:45Z] Merci d'être venus nombreux aujourd'hui
[2025-11-09T10:31:20Z] On va commencer le live shopping
...
```

**You:** "Stop the transcription"

**Assistant:** Uses `stop-transcript` tool
```
✅ Transcription stopped successfully
Session ID: transcript-1-1699564800000
Runtime: 5m 42s
Segments transcribed: 12
Session data preserved - use 'show-transcript' to view or 'save-transcript' to save
```

**You:** "Save the transcript as a text file"

**Assistant:** Uses `save-transcript` tool
```
✅ Transcript saved successfully
File: samiepirate_transcript.txt
Format: TXT
Segments: 12
Size: 2048 bytes
```

**You:** "Delete the session"

**Assistant:** Uses `delete-transcript` tool
```
✅ Transcript session deleted successfully
Session ID: transcript-1-1699564800000
Segments deleted: 12
```

## 🎯 Common Use Cases

### 1. Save Transcript in Multiple Formats
```
Start transcription for [url]
(wait for stream to complete)
Stop transcription
Save as TXT: "transcript.txt"
Save as JSON: "transcript.json"  
Save as SRT: "transcript.srt"
Delete session
```

### 2. Review Before Saving
```
Start transcription
Stop transcription
Show transcript
(review the content)
Save transcript if quality is good
OR delete transcript if not needed
```

### 3. Monitor Multiple Streams
```
Start transcription for stream-url-1
Start transcription for stream-url-2
List all transcription sessions
(later) Show transcript for each session
Stop all sessions
Save interesting ones
Delete the rest
```

### 4. Long-Running Transcription
```
Start transcription for [url]
(let it run for hours)
Clear old transcript segments (optional)
Show recent 20 segments
Stop transcription
Save final transcript
```

### 5. Quick Transcript Check
```
Start transcription
(wait 1-2 minutes)
Show transcript with count: 5
Stop transcription
Delete session (if not needed)
```

## 💾 File Format Tips

### When to use each format:

**TXT** - Best for:
- Human reading
- Quick review
- Text editors
- Simple archiving

**JSON** - Best for:
- Programmatic processing
- Data analysis
- Integration with other tools
- Structured storage

**SRT** - Best for:
- Video subtitles
- Media player compatibility
- Overlay on recordings
- Professional editing

### Example filenames:
```
transcript_2025-11-09_samiepirate.txt
tiktok_live_french_transcript.json
livestream_subtitles.srt
```

## ⚠️ Troubleshooting

### "Missing OPENAI_API_KEY"
```bash
# Verify it's set
echo $OPENAI_API_KEY

# Should output: sk-...
# If empty, set it again
export OPENAI_API_KEY="sk-your-key"
```

### "FFmpeg not found"
```bash
# Install FFmpeg
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Linux

# Verify installation
ffmpeg -version
```

### "Stream URL expired"
Stream URLs from TikTok expire after ~6 hours. If you get an error:
1. Reconnect to the livestream
2. Get fresh stream info
3. Start transcription with new URL

### "No transcript data yet"
Wait 10-30 seconds for first transcription. Speech detection needs:
- Someone speaking in the stream
- Clear audio quality
- Proper language detection

### "Session not found after stopping"
Sessions are now preserved! Use `list-transcripts` to see all sessions (active and stopped).

### Can't delete a file
Make sure the filename doesn't contain paths (/, \\, ..). Use simple filenames only.

## 📊 Session Management

### List All Sessions (Active and Stopped)
```
List all transcription sessions
```
Shows all sessions with status indicators

### Save Before Deleting
```
Show transcript for session [session-id]
Save transcript to "filename.txt"
Delete transcript [session-id]
```
Always save important transcripts before deletion!

### Stop Specific Session (Preserves Data)
```
Stop transcript [session-id]
```
Stops transcription but keeps data accessible

### Permanently Delete Session
```
Delete transcript [session-id]
```
Removes session and all data permanently

## 💰 Cost Considerations

OpenAI Realtime API pricing (as of Nov 2025):
- Audio input: ~$0.06 per minute
- Text output: Minimal cost

**Estimate**: 1 hour of transcription ≈ $3.60

Tips to reduce costs:
- Stop sessions when not needed
- Use for important streams only
- Clear old transcripts regularly

## 🔒 Security

- Never commit API keys to git
- Use environment variables
- Don't share session IDs publicly
- Rotate API keys periodically

## 📚 More Information

- Full documentation: [TRANSCRIPT_TOOLS.md](TRANSCRIPT_TOOLS.md)
- Project structure: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- Main README: [README.md](README.md)

---

**Need Help?**
Check the error log: `show-errors` tool
