# Changelog - Transcript Tools Enhancement

## Version 2.2.0 - 2025-11-09

### ✨ New Features

#### Session Persistence
**Sessions are now preserved after stopping**, allowing users to:
- Review transcripts after stream ends
- Save transcripts at any time
- Keep historical data for analysis

**Changes:**
- Sessions remain in memory after `stop-transcript`
- Added `isActive` and `stoppedAt` fields to session data
- Sessions must be explicitly deleted with new `delete-transcript` tool

#### Save Transcript to File
New `save-transcript` tool with **multiple format support**:

**Supported Formats:**
1. **TXT** - Plain text with timestamps and metadata
2. **JSON** - Structured data with complete session info
3. **SRT** - Subtitle format for video players

**Features:**
- Auto-detects format from filename extension
- Manual format override available
- Preserves all session metadata
- Timestamps in ISO 8601 format

#### Delete Transcript Session
New `delete-transcript` tool to permanently remove sessions:
- Stops session if still active
- Removes all transcript data
- Frees up memory

### 🔧 Technical Improvements

#### Enhanced Session Data Structure
```javascript
{
  ws: WebSocket,
  ffmpeg: ChildProcess,
  transcript: Array<{text, timestamp}>,
  startedAt: Date,
  stoppedAt: Date | null,    // NEW
  streamUrl: string,
  sessionId: string,
  language: string,
  isActive: boolean           // NEW
}
```

#### Updated Tools Behavior

**`stop-transcript`**
- ✅ Closes WebSocket and kills FFmpeg
- ✅ Marks session as inactive
- ✅ Sets `stoppedAt` timestamp
- ✅ **Preserves session data** (breaking change)
- ✅ Returns preservation confirmation

**`show-transcript`**
- ✅ Works with both active and stopped sessions
- ✅ Shows accurate session status

**`list-transcripts`**
- ✅ Shows all sessions (active and stopped)
- ✅ Displays count breakdown: active vs stopped
- ✅ Visual indicator for active sessions (✓)

**`clear-transcript`**
- ✅ Works with both active and stopped sessions
- ✅ Shows appropriate status message

**WebSocket close handler**
- ✅ Marks session as inactive instead of deleting
- ✅ Sets `stoppedAt` timestamp
- ✅ Keeps session in memory

**`stopAllTranscriptions()`**
- ✅ New optional `deleteAll` parameter
- ✅ Default: stops but preserves sessions
- ✅ With `deleteAll=true`: removes all sessions
- ✅ Used during graceful shutdown

### 📝 File Format Examples

#### TXT Format
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
```

#### JSON Format
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
    }
  ]
}
```

#### SRT Format
```
1
00:00:15,000 --> 00:00:45,000
Bonjour tout le monde !

2
00:00:45,000 --> 00:01:20,000
Merci d'être venus nombreux
```

### 🔄 Updated Workflow

**New Recommended Workflow:**
```
1. start-transcript    → Get session ID
2. show-transcript     → Monitor periodically
3. stop-transcript     → Stop when done (data preserved!)
4. show-transcript     → Review final transcript
5. save-transcript     → Save to file (TXT/JSON/SRT)
6. delete-transcript   → Remove when no longer needed (optional)
```

### 📚 Documentation Updates

**Updated Files:**
- `README.md` - Added new tools to tools list
- `TRANSCRIPT_TOOLS.md` - Complete documentation for new tools and formats
- `QUICKSTART_TRANSCRIPT.md` - Need to update with new workflow

**New Sections:**
- File format specifications
- Session persistence explanation
- Save and delete workflow examples

### 🔒 Breaking Changes

**`stop-transcript` behavior changed:**
- **Before**: Deleted session immediately
- **After**: Preserves session data for later access

**Migration:**
- No action needed for basic usage
- To match old behavior: call `delete-transcript` after `stop-transcript`
- Sessions now persist across stop/start cycles

### 💡 Use Cases Enabled

1. **Post-Stream Analysis**
   - Stop transcription after stream ends
   - Review full transcript
   - Save in preferred format
   - Delete when done

2. **Multiple Sessions**
   - Keep multiple stopped sessions
   - Compare transcripts from different streams
   - Batch save in different formats

3. **Archive Building**
   - Collect transcripts over time
   - Save JSON for programmatic access
   - Save SRT for video subtitles
   - Save TXT for human reading

4. **Quality Review**
   - Stop transcription
   - Review transcript quality
   - Save if good, delete if poor
   - No data loss during review

### 🐛 Bug Fixes

- WebSocket close handler no longer deletes sessions prematurely
- Session data now survives network interruptions
- Proper cleanup in shutdown handler

### ⚡ Performance

- No performance impact
- Memory usage slightly higher (sessions kept until deleted)
- Recommend periodic cleanup with `delete-transcript`

### 🔜 Future Enhancements

Potential improvements:
- Export to PDF format
- Merge multiple transcripts
- Search across transcripts
- Automatic session cleanup after N days
- Batch save operations
- Cloud storage integration

---

**Contributors**: AI Assistant
**Date**: November 9, 2025
**Version**: 2.2.0
**Previous Version**: 2.1.0
