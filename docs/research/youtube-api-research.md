# YouTube Data API v3 Research

Research for replacing mock data in Video Player section with real YouTube API data.

## Overview

The YouTube Data API v3 provides programmatic access to YouTube data including videos, playlists, channels, comments, and search results. The API uses a quota system to manage usage.

## Quota System

### Default Allocation
- **Daily quota**: 10,000 units per day
- **Reset time**: Midnight Pacific Time (PT)
- **Minimum cost**: 1 unit per request (including invalid requests)

### Quota Costs by Endpoint

| Resource | Method | Cost (units) |
|----------|--------|--------------|
| **videos** | list | 1 |
| **videos** | insert | 100 |
| **videos** | update/rate/delete | 50 |
| **search** | list | 100 |
| **channels** | list | 1 |
| **channels** | update | 50 |
| **playlists** | list | 1 |
| **playlists** | insert/update/delete | 50 |
| **playlistItems** | list | 1 |
| **playlistItems** | insert/update/delete | 50 |
| **commentThreads** | list | 1 |
| **commentThreads** | insert/update | 50 |
| **comments** | list | 1 |
| **comments** | insert/update/delete | 50 |
| **captions** | list | 50 |
| **captions** | insert | 400 |
| **captions** | update | 450 |
| **subscriptions** | list | 1 |
| **activities** | list | 1 |

### Quota Optimization Strategies
1. Use `videos.list` (1 unit) instead of `search.list` (100 units) when possible
2. Batch video IDs - up to 50 IDs per request for same cost
3. Request only needed `part` parameters to reduce response size
4. Use `fields` parameter to filter response fields
5. Implement caching (API responses are cache-friendly)
6. Use ETags for conditional requests

## Relevant Endpoints for Video Player

### 1. Videos (videos.list) - 1 unit
**Purpose**: Get detailed video information

**Available Parts**:
- `snippet`: title, description, thumbnails, channelId, channelTitle, tags, publishedAt
- `contentDetails`: duration, definition, dimension, caption status
- `statistics`: viewCount, likeCount, commentCount
- `player`: embed HTML
- `status`: privacy status, upload status
- `topicDetails`: topic categories
- `recordingDetails`: recording location/date
- `liveStreamingDetails`: live stream info

**Example Response Fields**:
```json
{
  "id": "videoId",
  "snippet": {
    "title": "Video Title",
    "description": "Description...",
    "thumbnails": { "default": {}, "medium": {}, "high": {}, "maxres": {} },
    "channelId": "UCxxxx",
    "channelTitle": "Channel Name",
    "publishedAt": "2024-01-15T10:00:00Z",
    "tags": ["tag1", "tag2"]
  },
  "statistics": {
    "viewCount": "1000000",
    "likeCount": "50000",
    "commentCount": "1000"
  },
  "contentDetails": {
    "duration": "PT1H23M45S",
    "definition": "hd",
    "caption": "true"
  }
}
```

### 2. Comment Threads (commentThreads.list) - 1 unit
**Purpose**: Get top-level comments with replies

**Parameters**:
- `videoId`: Target video ID (required filter)
- `part`: "snippet,replies"
- `maxResults`: 1-100 (default 20)
- `order`: "relevance" or "time"
- `pageToken`: For pagination
- `textFormat`: "html" or "plainText"

**Response Structure**:
```json
{
  "items": [{
    "id": "commentThreadId",
    "snippet": {
      "videoId": "videoId",
      "topLevelComment": {
        "snippet": {
          "authorDisplayName": "User Name",
          "authorProfileImageUrl": "https://...",
          "authorChannelUrl": "https://...",
          "textDisplay": "Comment text",
          "likeCount": 100,
          "publishedAt": "2024-01-15T10:00:00Z"
        }
      },
      "totalReplyCount": 5
    },
    "replies": {
      "comments": [...]
    }
  }]
}
```

**Note**: The `replies` object may not contain all replies. Use `comments.list` with `parentId` for complete replies.

### 3. Channels (channels.list) - 1 unit
**Purpose**: Get channel information for video authors

**Available Parts**:
- `snippet`: title, description, thumbnails, customUrl
- `statistics`: subscriberCount, viewCount, videoCount
- `brandingSettings`: banner images, channel keywords
- `contentDetails`: related playlists (uploads, likes, etc.)

**Response Fields**:
```json
{
  "id": "UCxxxx",
  "snippet": {
    "title": "Channel Name",
    "description": "Channel description",
    "thumbnails": {...},
    "customUrl": "@channelhandle"
  },
  "statistics": {
    "subscriberCount": "1000000",
    "viewCount": "50000000",
    "videoCount": "500"
  }
}
```

### 4. Playlists (playlists.list) - 1 unit
**Purpose**: Get playlist metadata

**Parameters**:
- `id`: Playlist ID(s)
- `channelId`: Get channel's playlists
- `part`: "snippet,contentDetails,status"

### 5. Playlist Items (playlistItems.list) - 1 unit
**Purpose**: Get videos in a playlist

**Parameters**:
- `playlistId`: Target playlist (required)
- `maxResults`: 1-50
- `pageToken`: For pagination

**Response**:
```json
{
  "items": [{
    "snippet": {
      "title": "Video Title",
      "description": "...",
      "thumbnails": {...},
      "channelTitle": "Channel Name",
      "position": 0,
      "resourceId": {
        "videoId": "videoId"
      }
    }
  }]
}
```

### 6. Search (search.list) - 100 units (EXPENSIVE!)
**Purpose**: Search for videos, channels, playlists

**Parameters**:
- `q`: Search query
- `type`: "video", "channel", "playlist"
- `maxResults`: 1-50
- `order`: "relevance", "date", "viewCount", "rating"
- `videoDuration`: "any", "short", "medium", "long"
- `publishedAfter/Before`: Date filters

**Deprecated Features**:
- `relatedToVideoId` parameter is **DEPRECATED** - cannot get related videos via API
- Alternative: Use search with similar keywords or channel videos

## Current Implementation Status

### Already Implemented
The Video Player section already has API routes for:

1. **Search** (`/api/youtube/search`) - Working
   - Accepts query, filters, pagination
   - Returns search results with basic snippet data

2. **Video Details** (`/api/youtube/video`) - Working
   - Accepts comma-separated video IDs (up to 50)
   - Returns snippet, contentDetails, statistics

3. **Playlist** (`/api/youtube/playlist`) - Working
   - Accepts playlist ID
   - Returns playlist info and items

### Not Yet Implemented (Needed for Mock Data Replacement)

1. **Comments API** - Required for replacing mock comments
   - Need `/api/youtube/comments` route
   - Use `commentThreads.list` endpoint
   - Fields needed: author, avatar, text, likes, date, replies

2. **Channel API** - Required for channel info in video details
   - Need `/api/youtube/channel` route
   - Use `channels.list` endpoint
   - Fields needed: avatar, subscriber count, verification status

3. **Related Videos** - Cannot be implemented via API
   - `relatedToVideoId` is deprecated
   - Alternatives:
     - Search by video tags/title keywords
     - Get more videos from same channel
     - Use manual curation

## Mock Data to Replace

Current mock data in `video-player.tsx` that can be replaced:

| Mock Data | API Endpoint | Notes |
|-----------|--------------|-------|
| Video title, description | `videos.list` | Already implemented |
| View count, likes | `videos.list` (statistics) | Already implemented |
| Duration | `videos.list` (contentDetails) | Already implemented |
| Comments | `commentThreads.list` | Need new endpoint |
| Channel avatar | `channels.list` | Need new endpoint |
| Channel subscribers | `channels.list` (statistics) | Need new endpoint |
| Channel verification | `channels.list` (snippet) | Check for badge |
| Related videos | N/A | API deprecated, use alternatives |
| Chapters | Video description | Parse from description timestamps |

## Rate Limits

- **Queries per minute**: Cannot be changed
- **Daily quota**: Can request increase (free) through Google Cloud Console
- Quota is per Google Cloud project, not per user

## Authentication

Two authentication methods:
1. **API Key** (read-only public data) - Current implementation
2. **OAuth 2.0** (user-specific data, write operations) - Needed for:
   - User's subscriptions
   - User's playlists
   - Posting comments
   - Liking videos

## Recommendations for Implementation

### Phase 1: High-Value, Low-Cost (Priority)
1. Add channel details API (1 unit) - Replace channel mock data
2. Add comments API (1 unit) - Replace comments mock data
3. Batch video details requests - Already batching IDs

### Phase 2: Enhanced Features
1. Parse chapters from video descriptions (no API cost)
2. Implement "more from this channel" as related videos alternative
3. Add caption language list from video details

### Phase 3: User Features (Requires OAuth)
1. Check subscription status
2. Like/dislike functionality
3. Comment posting
4. Save to playlist

### Quota Budget Example (10,000 units/day)
- 50 searches: 5,000 units
- 500 video detail requests (batched): 10 units
- 200 comment requests: 200 units
- 100 channel requests: 100 units
- **Remaining**: ~4,690 units for other operations

## References

- [YouTube Data API Overview](https://developers.google.com/youtube/v3/getting-started)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [API Reference](https://developers.google.com/youtube/v3/docs)
- [CommentThreads Documentation](https://developers.google.com/youtube/v3/docs/commentThreads/list)
- [Search Documentation](https://developers.google.com/youtube/v3/docs/search/list)
- [Videos Documentation](https://developers.google.com/youtube/v3/docs/videos/list)
