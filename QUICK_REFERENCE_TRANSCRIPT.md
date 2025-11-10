# Transcript Tools - Quick Reference Card

## 🆕 New in v2.2.0

### Session Persistence
- ✅ Sessions **preserved after stopping**
- ✅ Review transcripts after stream ends
- ✅ No data loss

### Save to File
- ✅ **TXT** format - Human readable
- ✅ **JSON** format - Programmatic access
- ✅ **SRT** format - Video subtitles

### Session Management
- ✅ `delete-transcript` - Explicit deletion
- ✅ `list-transcripts` - Shows all (active + stopped)

---

## 📚 Available Tools

| Tool | Purpose | Session State |
|------|---------|---------------|
| `start-transcript` | Start transcription | Creates new session (active) |
| `stop-transcript` | Stop transcription | Session becomes inactive **but preserved** |
| `show-transcript` | View transcript | Works with active or stopped |
| `clear-transcript` | Clear segments | Works with active or stopped |
| `save-transcript` | Save to file (TXT/JSON/SRT) | Works with active or stopped |
| `delete-transcript` | Permanently remove | Deletes session completely |
| `list-transcripts` | List all sessions | Shows active ✓ and stopped |

---

## 🔄 Complete Workflow

```
┌─────────────────────┐
│ start-transcript    │  1. Start
│  → session ID       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ show-transcript     │  2. Monitor
│  (periodic checks)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ stop-transcript     │  3. Stop (data preserved!)
│  ✓ Data preserved   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ show-transcript     │  4. Review
│  (review quality)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ save-transcript     │  5. Save
│  .txt / .json / .srt│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ delete-transcript   │  6. Clean up
│  (permanent)        │
└─────────────────────┘
```

---

## 💾 File Formats Comparison

| Format | Best For | Use Case |
|--------|----------|----------|
| **TXT** | Reading | Quick review, archiving, text editors |
| **JSON** | Processing | Data analysis, integration, automation |
| **SRT** | Subtitles | Video overlay, media players, editing |

---

## ⚡ Quick Commands

### Start
```javascript
{
  "tool": "start-transcript",
  "arguments": {
    "streamUrl": "https://...",
    "language": "fr"
  }
}
```

### Stop (preserves data)
```javascript
{
  "tool": "stop-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}
```

### Save as TXT
```javascript
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "transcript.txt"
  }
}
```

### Save as JSON
```javascript
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "transcript.json"
  }
}
```

### Save as SRT
```javascript
{
  "tool": "save-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000",
    "filename": "subtitles.srt"
  }
}
```

### Delete
```javascript
{
  "tool": "delete-transcript",
  "arguments": {
    "sessionId": "transcript-1-1699564800000"
  }
}
```

---

## 🎯 Common Patterns

### Pattern 1: Quick Save
```
stop → save → delete
```

### Pattern 2: Multiple Formats
```
stop → save TXT → save JSON → save SRT → delete
```

### Pattern 3: Review First
```
stop → show → (if good) save → delete
            → (if bad) delete
```

### Pattern 4: Keep for Later
```
stop → (don't delete)
... later ...
show → save → delete
```

---

## 💡 Tips

✅ **DO:**
- Save before deleting important sessions
- Use descriptive filenames
- Save in multiple formats if needed
- Review transcript quality before saving

❌ **DON'T:**
- Delete without saving first
- Use paths in filenames (/, \\, ..)
- Forget to clean up old sessions
- Leave many sessions in memory

---

## 🔍 Status Indicators

When you `list-transcripts`:
- `Active ✓` - Currently recording
- `Stopped` - Recording stopped, data preserved

---

## 📏 Limits

- **Filename**: No paths, simple names only
- **Memory**: Sessions stay until deleted
- **Formats**: TXT, JSON, SRT only (for now)

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Session not found | Use `list-transcripts` to see all sessions |
| Can't save file | Check filename (no paths allowed) |
| Old sessions piling up | Use `delete-transcript` to clean up |
| Want old behavior | Use `stop-transcript` then `delete-transcript` |

---

## 📖 Full Documentation

- **Complete guide**: [TRANSCRIPT_TOOLS.md](TRANSCRIPT_TOOLS.md)
- **Quick start**: [QUICKSTART_TRANSCRIPT.md](QUICKSTART_TRANSCRIPT.md)
- **Changelog**: [CHANGELOG_TRANSCRIPT_v2.2.md](CHANGELOG_TRANSCRIPT_v2.2.md)
- **Summary**: [SUMMARY_v2.2.md](SUMMARY_v2.2.md)

---

**Version**: 2.2.0 | **Date**: 2025-11-09 | **Status**: Production Ready ✅
