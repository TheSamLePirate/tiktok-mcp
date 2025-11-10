# Changelog - Transcript Tools Integration

## Version 2.1.0 - 2025-11-09

### ✨ New Features

#### Real-Time Audio Transcription
Added comprehensive real-time transcription support for TikTok livestream audio using OpenAI's Realtime API.

**New Module**: `tools/transcriptTools.js`
- Manages WebSocket connections to OpenAI Realtime API
- Handles FFmpeg audio extraction and streaming
- Tracks multiple concurrent transcription sessions
- Provides complete session lifecycle management

**New MCP Tools**:
1. `start-transcript` - Start real-time transcription
   - Accepts stream URL and language code
   - Returns unique session ID for tracking
   - Runs FFmpeg in background to extract audio
   - Streams PCM audio to OpenAI API
   
2. `stop-transcript` - Stop active transcription session
   - Gracefully closes WebSocket and FFmpeg
   - Returns session statistics
   
3. `show-transcript` - Display transcript content
   - Shows timestamped transcript segments
   - Optional count parameter for recent segments
   - Displays session status and statistics
   
4. `clear-transcript` - Clear transcript data
   - Clears stored segments while keeping session active
   - Useful for long-running sessions
   
5. `list-transcripts` - List all active sessions
   - Shows all transcription sessions with stats
   - Runtime, segment count, and status

### 🔧 Technical Details

**Audio Processing**:
- Format: PCM 16-bit little-endian
- Sample Rate: 24kHz
- Channels: Mono
- Real-time streaming with FFmpeg

**Transcription**:
- Model: gpt-4o-transcribe
- VAD: Server-side Voice Activity Detection
- Commit interval: 60 seconds for long segments
- Supports multiple languages

**Session Management**:
- In-memory session tracking
- Unique session IDs
- Background process management
- Automatic cleanup on shutdown

### 📝 Updated Files

1. **app.js**
   - Imported `registerTranscriptTools` and `stopAllTranscriptions`
   - Registered transcript tools with MCP server
   - Added transcription cleanup to shutdown handler

2. **package.json**
   - Added `ws` dependency (^8.18.0) for WebSocket support

3. **README.md**
   - Added "Real-time audio transcription" to features
   - Reorganized tools into categories (Connection, Data, Video, Transcript, Debug)
   - Added prerequisites section with OpenAI API key requirement
   - Enhanced configuration examples with transcription support
   - Added transcription usage examples

### 📚 New Documentation

1. **TRANSCRIPT_TOOLS.md**
   - Comprehensive guide to transcription tools
   - Prerequisites and setup instructions
   - Detailed tool documentation with examples
   - Complete workflow example
   - Technical specifications
   - Error handling information
   - Supported languages list

2. **test-transcript.js**
   - Test script for transcription functionality
   - Supports both stream URLs and usernames
   - Displays example MCP tool calls
   - Usage instructions

### 🔒 Environment Variables

New optional environment variable:
- `OPENAI_API_KEY` - Required for transcription features

### 🛡️ Error Handling

Integrated with existing error logging system:
- WebSocket connection errors
- FFmpeg process errors
- Audio streaming errors
- Session management errors
- All logged via `errorHandling.js`

### 🚀 Usage Example

```bash
# Set OpenAI API key
export OPENAI_API_KEY="sk-..."

# Connect to livestream and get stream URL
# Use start-transcript tool with the stream URL
# Monitor with show-transcript
# Stop with stop-transcript
```

### 🔄 Backward Compatibility

- All existing tools remain unchanged
- Transcription tools are optional (require OPENAI_API_KEY)
- No breaking changes to existing functionality
- Graceful degradation if OpenAI API key not provided

### 🧪 Testing

Test the new features:
```bash
# Test with username
node test-transcript.js @samiepirate

# Test with stream URL
node test-transcript.js "https://pull-flv-l1-va01.tiktokcdn.com/..."
```

### 📦 Dependencies

New dependency:
- `ws@^8.18.0` - WebSocket client for OpenAI Realtime API

### 🔜 Future Enhancements

Potential improvements:
- Export transcript to file
- Real-time translation
- Transcript search/filtering
- Custom VAD configurations
- Multiple language detection
- Transcript analytics

### 🐛 Known Limitations

- Requires valid OpenAI API key with Realtime API access
- FFmpeg must be installed and available in PATH
- Stream URLs expire after a certain time
- Transcription quality depends on audio quality
- Sessions stored in memory (not persisted)

---

**Contributors**: AI Assistant
**Date**: November 9, 2025
**Version**: 2.1.0
