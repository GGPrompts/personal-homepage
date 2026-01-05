# Video Player

YouTube search/playlists with local video support and yt-dlp download integration.

## Files
- `app/sections/video-player.tsx` - Main component
- `components/LocalMediaBrowser.tsx` - Local file browser
- `components/VideoDownloadModal.tsx` - Download format selection modal
- `hooks/useYouTube.ts` - YouTube Data API hooks
- `hooks/useMediaLibrary.ts` - Media file handling
- `hooks/useVideoDownload.ts` - Download state management
- `lib/video-seeds.ts` - Demo video data
- `app/api/youtube/` - YouTube API proxy
- `app/api/video/download/route.ts` - yt-dlp download API

## Features
- **YouTube Integration**:
  - Search videos with filters
  - Load playlists by URL/ID
  - Video metadata display
  - Channel info
  - Comments (mock)
- **Local Videos**:
  - Upload video files
  - Browse media directory
  - Direct URL playback
- Video player controls:
  - Play/pause, seek
  - Volume, fullscreen
  - Playback speed
  - Picture-in-picture
- Playlist queue
- Related videos
- Watch later (local)
- **Download with yt-dlp**:
  - Download button on search results and playlist items
  - Download currently playing YouTube video
  - Audio-only formats: MP3, M4A, OPUS, FLAC
  - Video formats: MP4, WebM (various qualities)
  - Real-time progress via Server-Sent Events
  - Download history stored in localStorage

## Integration
- **YouTube**: Data API v3 (requires key)
- **Local Files**: MediaBrowser API
- **Downloads**: yt-dlp (must be installed on system)

## TabzChrome Selectors
- `data-tabz-section="video-player"` - Container
- `data-tabz-input="search"` - Video search
- `data-tabz-input="playlist-url"` - Playlist URL
- `data-tabz-action="search-videos"` - Search
- `data-tabz-action="load-playlist"` - Load playlist
- `data-tabz-action="play-video"` - Select video
- `data-tabz-action="toggle-play"` - Play/pause
- `data-tabz-action="fullscreen"` - Toggle fullscreen
- `data-tabz-action="add-to-queue"` - Queue video
- `data-tabz-action="download-video"` - Download video (on search/playlist items)
- `data-tabz-action="download-current-video"` - Download current video
- `data-tabz-list="search-results"` - Results list
- `data-tabz-list="playlist"` - Playlist queue

## Configuration
YouTube API in Settings:
- `youtube-api-key` - YouTube Data API v3 key

## Download API

### POST `/api/video/download`
Start a new download.

```json
{
  "url": "https://youtube.com/watch?v=...",
  "type": "audio" | "video",
  "audioFormat": "mp3" | "m4a" | "opus" | "flac" | "best",
  "videoFormat": "mp4" | "webm" | "best",
  "videoQuality": "2160" | "1440" | "1080" | "720" | "480" | "best"
}
```

### GET `/api/video/download?id=<id>&stream=true`
Stream progress updates via SSE.

### DELETE `/api/video/download?id=<id>`
Cancel a download.

## Requirements
- `yt-dlp` must be installed and available in PATH
- Downloads save to `~/Music/yt-downloads` (audio) or `~/Videos/yt-downloads` (video)
