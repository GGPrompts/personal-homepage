# Video Player Integration Research

Research documentation for YouTube API integration and local video enhancements for the Video Player section.

## Table of Contents

1. [YouTube Data API v3](#youtube-data-api-v3)
2. [Feature Evaluation](#feature-evaluation)
3. [ytconverter Integration](#ytconverter-integration)
4. [Local Video Enhancements](#local-video-enhancements)
5. [Implementation Roadmap](#implementation-roadmap)

---

## YouTube Data API v3

### API Setup Steps

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Name it something like "personal-homepage-video"

2. **Enable YouTube Data API v3**
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Restrict the key to YouTube Data API v3 only
   - (Optional) Add HTTP referrer restrictions for security

4. **Store API Key Securely**
   - Add `YOUTUBE_API_KEY` to `.env.local`
   - Access via `process.env.YOUTUBE_API_KEY` in API routes

### Quota System

| Metric | Value |
|--------|-------|
| **Default Daily Quota** | 10,000 units |
| **Reset Time** | Daily (Pacific Time) |
| **Quota Increase** | Available via application (free) |

### Quota Costs by Operation

| Operation | Cost (units) | Daily Limit (10k quota) |
|-----------|-------------|-------------------------|
| `search.list` | 100 | ~100 searches/day |
| `videos.list` | 1 | ~10,000 lookups/day |
| `channels.list` | 1 | ~10,000 lookups/day |
| `playlists.list` | 1 | ~10,000 lookups/day |
| `playlistItems.list` | 1 | ~10,000 lookups/day |
| `commentThreads.list` | 1-3 | ~3,000-10,000/day |
| `subscriptions.list` | 1 | ~10,000 lookups/day |
| `videos.insert` (upload) | 1,600 | ~6 uploads/day |

**Cost Optimization Strategy:**
- Cache video metadata aggressively (videos rarely change)
- Batch video ID lookups (up to 50 per request)
- Avoid search when possible; use direct video/playlist IDs
- Consider client-side caching with IndexedDB

### Authentication Requirements

| Use Case | Auth Type | Notes |
|----------|-----------|-------|
| Search public videos | API Key | No user login needed |
| Get public video details | API Key | Views, likes, description |
| Get public playlists | API Key | Any public playlist |
| Read public comments | API Key | Comment threads |
| Access private playlists | OAuth 2.0 | User's own private playlists |
| User's subscriptions | OAuth 2.0 | Authenticated user only |
| Post comments | OAuth 2.0 | Requires user consent |
| Like/dislike videos | OAuth 2.0 | Requires user consent |

**Recommendation:** Start with API key for public data. Add OAuth later only if private playlist access or write operations are needed.

### Rate Limiting

- No explicit requests-per-second limit documented
- Quota is the primary limiting factor
- Implement exponential backoff for 403/429 errors
- Cache responses to minimize repeated requests

### Example API Calls

**Search Videos:**
```bash
GET https://www.googleapis.com/youtube/v3/search
  ?part=snippet
  &q=programming+tutorial
  &type=video
  &maxResults=25
  &key={API_KEY}
# Cost: 100 units
```

**Get Video Details (batch):**
```bash
GET https://www.googleapis.com/youtube/v3/videos
  ?part=snippet,contentDetails,statistics
  &id=VIDEO_ID1,VIDEO_ID2,VIDEO_ID3
  &key={API_KEY}
# Cost: 1 unit (regardless of how many IDs, up to 50)
```

**Get Playlist Items:**
```bash
GET https://www.googleapis.com/youtube/v3/playlistItems
  ?part=snippet,contentDetails
  &playlistId=PLAYLIST_ID
  &maxResults=50
  &key={API_KEY}
# Cost: 1 unit
```

**Get Comments:**
```bash
GET https://www.googleapis.com/youtube/v3/commentThreads
  ?part=snippet
  &videoId=VIDEO_ID
  &maxResults=100
  &key={API_KEY}
# Cost: ~3 units with snippet
```

---

## Feature Evaluation

### Priority Matrix

| Feature | Priority | Quota Impact | Auth Needed | Complexity |
|---------|----------|--------------|-------------|------------|
| Video search | P1 | High (100/search) | API Key | Medium |
| Load playlist | P1 | Low (1/request) | API Key | Low |
| Video metadata | P1 | Very Low (1/batch) | API Key | Low |
| Comments (read) | P2 | Low (3/request) | API Key | Medium |
| Channel info | P3 | Very Low (1/request) | API Key | Low |
| Subscriptions | P3 | Low (1/request) | OAuth | High |
| Post comments | P4 | N/A | OAuth | High |

### P1: Core Features

1. **Video Search Integration**
   - Search input with debounce (500ms)
   - Filter by duration, upload date, relevance
   - Display thumbnails, titles, channel, view count
   - Quota: ~100 units per search

2. **Playlist Loading**
   - Input playlist URL or ID
   - Extract all videos (pagination support)
   - Display as queue/list
   - Quota: ~1-5 units per playlist

3. **Video Metadata Display**
   - Title, description, channel name
   - View count, like count, publish date
   - Duration (from contentDetails)
   - Batch lookup for efficiency

### P2: Enhanced Features

4. **Comments (Read-Only)**
   - Top-level comments with replies
   - Sort by relevance or newest
   - Lazy load on scroll
   - Quota: ~3 units per 100 comments

### P3: Nice-to-Have

5. **Channel Subscriptions** (OAuth required)
   - List user's subscriptions
   - Quick access to subscription feeds
   - Requires OAuth flow implementation

---

## ytconverter Integration

### Project Overview

Located at: `~/xprojects/ytconverter`

**Technology Stack:**
- Python with `yt-dlp` library (YouTube download engine)
- `ffmpeg` for video/audio processing
- Interactive CLI with format selection

### Key Capabilities

1. **Format Selection**
   - Lists all available qualities (360p to 4K)
   - Shows file size estimates
   - Supports video-only, audio-only, or combined

2. **Audio Extraction**
   - Downloads audio separately when video has no audio
   - Converts to MP3 format
   - Merges audio/video with ffmpeg

3. **Progress Tracking**
   - yt-dlp provides download progress to stdout
   - Time taken displayed after completion

### API Wrapper Design

Create a simple HTTP wrapper around ytconverter for the homepage:

```typescript
// app/api/youtube/download/route.ts
interface DownloadRequest {
  url: string;
  format: 'mp4' | 'mp3';
  quality?: string; // format_id from yt-dlp
}

interface DownloadResponse {
  jobId: string;
  status: 'queued' | 'downloading' | 'complete' | 'error';
  progress?: number;
  outputPath?: string;
  error?: string;
}
```

**Implementation Options:**

1. **Subprocess Wrapper** (Recommended for MVP)
   ```python
   # Simple FastAPI wrapper
   @app.post("/download")
   async def download_video(url: str, format: str):
       process = await asyncio.create_subprocess_exec(
           "yt-dlp", "-f", format, "-o", output_template, url,
           stdout=asyncio.subprocess.PIPE,
           stderr=asyncio.subprocess.PIPE
       )
       # Stream progress via WebSocket or SSE
   ```

2. **yt-dlp Python Library** (More control)
   ```python
   import yt_dlp

   def download_hook(d):
       if d['status'] == 'downloading':
           emit_progress(d['_percent_str'])

   ydl_opts = {
       'format': 'best[height<=720]',
       'progress_hooks': [download_hook],
   }
   ```

### Quality Selection Options

| Quality | yt-dlp Format String | Use Case |
|---------|---------------------|----------|
| Best | `bestvideo+bestaudio/best` | Maximum quality |
| 1080p | `bestvideo[height<=1080]+bestaudio` | Full HD |
| 720p | `bestvideo[height<=720]+bestaudio` | HD (default) |
| 480p | `bestvideo[height<=480]+bestaudio` | Standard |
| Audio Only | `bestaudio/best` | Podcasts/Music |

### Progress Tracking

yt-dlp provides progress via hooks:

```python
{
  'status': 'downloading',
  'filename': '/path/to/video.mp4',
  'tmpfilename': '/path/to/video.mp4.part',
  'downloaded_bytes': 1234567,
  'total_bytes': 9876543,
  'speed': 1234567.89,
  'eta': 123,
  '_percent_str': ' 12.5%',
  '_speed_str': '1.18MiB/s',
  '_eta_str': '00:02:03'
}
```

**Streaming to Frontend:**
- Use Server-Sent Events (SSE) for real-time progress
- Poll endpoint every 1s as fallback
- Store job status in Redis or in-memory Map

---

## Local Video Enhancements

### Thumbnail Generation (ffmpeg)

**Extract Single Frame:**
```bash
# First frame
ffmpeg -i input.mp4 -vframes 1 thumbnail.jpg

# Specific timestamp (3 seconds in)
ffmpeg -ss 00:00:03 -i input.mp4 -frames:v 1 thumbnail.jpg

# Smart thumbnail (most representative frame)
ffmpeg -i input.mp4 -vf "thumbnail=300" -frames:v 1 thumbnail.jpg
```

**Skip Black Frames:**
```bash
ffmpeg -ss 0 -i input.mp4 -vframes 1 \
  -vf "blackframe=0,metadata=select:key=lavfi.blackframe.pblack:value=50:function=less" \
  thumbnail.jpg
```

**Resize Thumbnail:**
```bash
ffmpeg -i input.mp4 -ss 00:00:03 -frames:v 1 -vf "scale=320:-1" thumbnail.jpg
```

### Duration Detection

**Get Duration in Seconds:**
```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 video.mp4
# Output: 453.903678
```

**Get Duration in HH:MM:SS:**
```bash
ffprobe -v error -show_entries format=duration \
  -of default=noprint_wrappers=1:nokey=1 -sexagesimal video.mp4
# Output: 0:07:33.903678
```

**Node.js Implementation:**
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getVideoDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}

async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  timestamp = '00:00:03'
): Promise<void> {
  await execAsync(
    `ffmpeg -ss ${timestamp} -i "${inputPath}" -frames:v 1 -vf "scale=320:-1" "${outputPath}"`
  );
}
```

### Full Metadata Extraction

```bash
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4
```

Returns JSON with:
- Duration, bitrate, file size
- Video codec, resolution, frame rate
- Audio codec, sample rate, channels

---

## Implementation Roadmap

### Phase 1: Foundation (Core Player)

**Goal:** Basic video player with local file support

1. Create `app/sections/video-player.tsx`
2. Add to navigation system
3. Implement HTML5 video player with controls
4. Local file picker (drag & drop)
5. Basic playlist (localStorage)

**Files to create/modify:**
- `app/sections/video-player.tsx` (new)
- `app/page.tsx` (add to navigation)

### Phase 2: YouTube Integration

**Goal:** Search and play YouTube videos

1. Add `YOUTUBE_API_KEY` to settings
2. Create `app/api/youtube/search/route.ts`
3. Create `app/api/youtube/video/route.ts`
4. Search UI with results grid
5. Load playlist by URL
6. Embed YouTube player (iframe API)

**Files to create:**
- `app/api/youtube/search/route.ts`
- `app/api/youtube/video/route.ts`
- `hooks/useYouTubeSearch.ts`
- `components/YouTubePlayer.tsx`

**Estimated Quota Usage:**
- 5-10 searches/day: 500-1000 units
- 50-100 video lookups: 50-100 units
- 10-20 playlists: 10-20 units
- **Total:** ~600-1200 units/day (well under 10k)

### Phase 3: Download Integration

**Goal:** Download YouTube videos via ytconverter

1. Create Python API wrapper for ytconverter
2. Add `/api/youtube/download` endpoint
3. Implement progress tracking (SSE)
4. Quality selection UI
5. Download queue management

**Files to create:**
- `services/ytconverter/api.py` (Python FastAPI)
- `app/api/youtube/download/route.ts`
- `components/DownloadProgress.tsx`

### Phase 4: Local Video Enhancements

**Goal:** Thumbnail generation and metadata for local files

1. Add ffmpeg/ffprobe utilities
2. Auto-generate thumbnails on file add
3. Extract and display video metadata
4. Duration detection for playlist display

**Files to create:**
- `lib/video-utils.ts`
- `app/api/video/thumbnail/route.ts`
- `app/api/video/metadata/route.ts`

### Phase 5: Polish & OAuth (Optional)

**Goal:** Advanced features requiring user auth

1. YouTube OAuth integration
2. Access user's subscriptions
3. Private playlist support
4. Watch history sync

---

## Environment Variables

Add to `.env.local`:

```bash
# YouTube Data API
YOUTUBE_API_KEY=your_api_key_here

# Optional: For download feature
YTCONVERTER_API_URL=http://localhost:8000
DOWNLOADS_PATH=/path/to/downloads
```

## References

### Official Documentation
- [YouTube Data API Overview](https://developers.google.com/youtube/v3/getting-started)
- [YouTube API Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [YouTube OAuth Guide](https://developers.google.com/youtube/v3/guides/authentication)
- [FFmpeg Documentation](https://ffmpeg.org/ffmpeg.html)
- [FFprobe Documentation](https://ffmpeg.org/ffprobe.html)

### Third-Party Resources
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [YouTube API Quota Guide (Elfsight)](https://elfsight.com/blog/youtube-data-api-v3-limits-operations-resources-methods-etc/)
- [YouTube API Costs Explained (Phyllo)](https://www.getphyllo.com/post/youtube-api-limits-how-to-calculate-api-usage-cost-and-fix-exceeded-api-quota)
- [FFmpeg Thumbnail Guide (Mux)](https://www.mux.com/articles/extract-thumbnails-from-a-video-with-ffmpeg)
