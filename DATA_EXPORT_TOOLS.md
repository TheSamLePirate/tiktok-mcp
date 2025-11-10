# Data Export Tools Documentation

## Overview

Export TikTok livestream data (messages and gifts) to files in multiple formats for analysis, archiving, or reporting.

## Available Tools

### 1. `save-messages`

Save chat messages from a TikTok livestream to a file.

**Parameters:**
- `username` (required): TikTok username (@ prefix optional)
- `filename` (required): Output filename (e.g., 'messages.txt', 'messages.json', 'messages.csv')
- `format` (optional): File format ('txt', 'json', 'csv') - auto-detected from filename if not specified
- `count` (optional): Number of recent messages to save (default: all)

**Supported Formats:**
- **TXT**: Human-readable format with metadata
- **JSON**: Structured data for programmatic access
- **CSV**: Spreadsheet-compatible format

**Example:**
```javascript
{
  "tool": "save-messages",
  "arguments": {
    "username": "samiepirate",
    "filename": "chat_messages.json",
    "count": 100
  }
}
```

### 2. `save-gifts`

Save gifts from a TikTok livestream to a file.

**Parameters:**
- `username` (required): TikTok username (@ prefix optional)
- `filename` (required): Output filename (e.g., 'gifts.txt', 'gifts.json', 'gifts.csv')
- `format` (optional): File format ('txt', 'json', 'csv') - auto-detected from filename if not specified
- `count` (optional): Number of recent gifts to save (default: all)

**Supported Formats:**
- **TXT**: Human-readable format with metadata and totals
- **JSON**: Structured data with complete gift information
- **CSV**: Spreadsheet format for analysis

**Example:**
```javascript
{
  "tool": "save-gifts",
  "arguments": {
    "username": "samiepirate",
    "filename": "gifts_report.csv"
  }
}
```

## File Formats

### TXT Format

#### Messages (TXT)
```
TikTok Live Chat Messages - @samiepirate
============================================================
Room ID: 123456789
Exported: 2025-11-09T15:30:00.000Z
Total Messages: 150
============================================================

[2025-11-09T15:25:10.000Z] Alice (@alice123): Hello everyone!

[2025-11-09T15:25:15.000Z] Bob (@bob456): Great stream!
```

#### Gifts (TXT)
```
TikTok Live Gifts - @samiepirate
============================================================
Room ID: 123456789
Exported: 2025-11-09T15:30:00.000Z
Total Gifts: 45
Total Diamond Value: 1250
============================================================

[2025-11-09T15:25:10.000Z] Alice (@alice123)
  Gift: Rose (ID: 5655)
  Quantity: x1
  Diamond Value: 1

[2025-11-09T15:25:30.000Z] Bob (@bob456)
  Gift: Galaxy (ID: 9827)
  Quantity: x5
  Diamond Value: 500
```

### JSON Format

#### Messages (JSON)
```json
{
  "username": "samiepirate",
  "roomId": "123456789",
  "exportedAt": "2025-11-09T15:30:00.000Z",
  "totalMessages": 150,
  "messages": [
    {
      "timestamp": "2025-11-09T15:25:10.000Z",
      "nickname": "Alice",
      "uniqueId": "alice123",
      "userId": "789456123",
      "comment": "Hello everyone!",
      "profilePictureUrl": "https://..."
    },
    {
      "timestamp": "2025-11-09T15:25:15.000Z",
      "nickname": "Bob",
      "uniqueId": "bob456",
      "userId": "456789123",
      "comment": "Great stream!",
      "profilePictureUrl": "https://..."
    }
  ]
}
```

#### Gifts (JSON)
```json
{
  "username": "samiepirate",
  "roomId": "123456789",
  "exportedAt": "2025-11-09T15:30:00.000Z",
  "totalGifts": 45,
  "totalDiamonds": 1250,
  "gifts": [
    {
      "timestamp": "2025-11-09T15:25:10.000Z",
      "nickname": "Alice",
      "uniqueId": "alice123",
      "userId": "789456123",
      "giftId": 5655,
      "giftName": "Rose",
      "repeatCount": 1,
      "diamondCount": 1,
      "profilePictureUrl": "https://..."
    }
  ]
}
```

### CSV Format

#### Messages (CSV)
```csv
Timestamp,Nickname,Username,User ID,Message
2025-11-09T15:25:10.000Z,Alice,alice123,789456123,Hello everyone!
2025-11-09T15:25:15.000Z,Bob,bob456,456789123,Great stream!
```

#### Gifts (CSV)
```csv
Timestamp,Nickname,Username,Gift Name,Gift ID,Quantity,Diamond Value
2025-11-09T15:25:10.000Z,Alice,alice123,Rose,5655,1,1
2025-11-09T15:25:30.000Z,Bob,bob456,Galaxy,9827,5,500
```

## Workflow Examples

### Example 1: Export All Messages After Stream
```
1. Connect to livestream
2. (stream runs and collects messages)
3. Save all messages to JSON for analysis
4. Save recent 50 messages to TXT for quick review
```

**MCP Calls:**
```javascript
// Connect
{ "tool": "tiktok-connect", "arguments": { "username": "samiepirate" } }

// After stream ends, save all messages
{
  "tool": "save-messages",
  "arguments": {
    "username": "samiepirate",
    "filename": "stream_2025-11-09_all_messages.json"
  }
}

// Save recent 50 as TXT
{
  "tool": "save-messages",
  "arguments": {
    "username": "samiepirate",
    "filename": "stream_2025-11-09_recent.txt",
    "count": 50
  }
}
```

### Example 2: Export Gifts for Revenue Tracking
```
1. Monitor livestream
2. Export gifts to CSV for spreadsheet analysis
3. Export gifts to JSON for database import
```

**MCP Calls:**
```javascript
// Export to CSV for Excel/Google Sheets
{
  "tool": "save-gifts",
  "arguments": {
    "username": "samiepirate",
    "filename": "revenue_report.csv"
  }
}

// Export to JSON for database
{
  "tool": "save-gifts",
  "arguments": {
    "username": "samiepirate",
    "filename": "gifts_data.json"
  }
}
```

### Example 3: Daily Archives
```
1. Connect to daily stream
2. At end of stream, save messages and gifts
3. Use dated filenames for organization
```

**MCP Calls:**
```javascript
{
  "tool": "save-messages",
  "arguments": {
    "username": "samiepirate",
    "filename": "archives/2025-11-09_messages.json"
  }
}

{
  "tool": "save-gifts",
  "arguments": {
    "username": "samiepirate",
    "filename": "archives/2025-11-09_gifts.json"
  }
}
```

## Format Comparison

| Format | Best For | File Size | Processing |
|--------|----------|-----------|------------|
| **TXT** | Human reading, quick review | Medium | Easy to read |
| **JSON** | Programmatic access, APIs | Medium-Large | Easy to parse |
| **CSV** | Spreadsheets, data analysis | Small | Excel/Sheets |

## Use Cases

### Messages Export
- **Content moderation**: Review chat for violations
- **Engagement analysis**: Track chat activity patterns
- **User research**: Study viewer comments and questions
- **Archive**: Keep records of interactions

### Gifts Export
- **Revenue tracking**: Calculate earnings
- **Top supporters**: Identify top gifters
- **Analytics**: Gift patterns and trends
- **Reporting**: Generate financial reports

## Tips

### Filenames
✅ **Good:**
- `stream_2025-11-09_messages.json`
- `gifts_november.csv`
- `chat_archive.txt`

❌ **Bad:**
- `../messages.txt` (path traversal)
- `data/messages.txt` (contains path)
- `messages\backup.txt` (contains backslash)

### When to Use Each Format

**Use TXT when:**
- Quick manual review needed
- Sharing with non-technical people
- Simple archiving

**Use JSON when:**
- Building applications
- Need programmatic access
- Importing to databases
- API integration

**Use CSV when:**
- Analyzing in Excel/Google Sheets
- Creating charts/graphs
- Statistical analysis
- Importing to analytics tools

## Best Practices

1. **Use descriptive filenames** with dates
2. **Export regularly** to avoid data loss
3. **Choose format** based on intended use
4. **Save before disconnecting** from stream
5. **Backup important data** to multiple formats

## Limitations

- **Filename restrictions**: No paths (/, \\, ..)
- **Data availability**: Only messages/gifts collected while connected
- **Memory**: Large streams may have limited history (CONFIG.MAX_STORED_MESSAGES/GIFTS)

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "Not connected" | Stream not connected | Use `tiktok-connect` first |
| "No messages/gifts" | No data collected | Wait for activity or check connection |
| "Invalid filename" | Filename contains paths | Use simple filename only |
| "Failed to save" | File system error | Check disk space and permissions |

## Integration Examples

### Python Analysis
```python
import json

# Load exported messages
with open('messages.json', 'r') as f:
    data = json.load(f)

# Analyze
total_messages = data['totalMessages']
messages = data['messages']

# Count messages per user
user_counts = {}
for msg in messages:
    user = msg['uniqueId']
    user_counts[user] = user_counts.get(user, 0) + 1

print(f"Total messages: {total_messages}")
print(f"Unique users: {len(user_counts)}")
```

### Excel Analysis (CSV)
1. Import CSV to Excel
2. Use pivot tables for analysis
3. Create charts for visualization
4. Calculate totals and averages

---

**See Also:**
- [Main README](README.md)
- [Transcript Tools](TRANSCRIPT_TOOLS.md)
- [Error Tracking](ERROR_TRACKING.md)
