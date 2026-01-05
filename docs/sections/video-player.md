# Video Player

YouTube search/playlists with local video support.

## Files
- `app/sections/video-player.tsx` - Main component
- `components/LocalMediaBrowser.tsx` - Local file browser
- `hooks/useYouTube.ts` - YouTube Data API hooks
- `hooks/useMediaLibrary.ts` - Media file handling
- `lib/video-seeds.ts` - Demo video data
- `app/api/youtube/` - YouTube API proxy

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

## Integration
- **YouTube**: Data API v3 (requires key)
- **Local Files**: MediaBrowser API

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
- `data-tabz-list="search-results"` - Results list
- `data-tabz-list="playlist"` - Playlist queue

## Configuration
YouTube API in Settings:
- `youtube-api-key` - YouTube Data API v3 key
