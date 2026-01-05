# Music Player

Audio player with Spotify integration and local file support.

## Files
- `app/sections/music-player.tsx` - Main component
- `components/SpotifyPlayer.tsx` - Spotify Web Playback
- `components/LocalMediaBrowser.tsx` - Local file browser
- `hooks/useMediaLibrary.ts` - Media file handling
- `app/api/spotify/` - Spotify OAuth routes

## Features
- **Local Audio**:
  - Upload audio files
  - Add tracks by URL
  - Browse local media directory
  - Queue management
  - Playback controls
- **Spotify Integration**:
  - OAuth authentication
  - Web Playback SDK
  - Search tracks/albums/artists
  - Play Spotify content
  - Premium account required
- Unified playback controls
- Volume control
- Shuffle/repeat modes
- Now playing display

## Integration
- **Spotify**: OAuth via Settings, requires Premium
- **Local Files**: MediaBrowser API (Node backend)

## TabzChrome Selectors
- `data-tabz-section="music-player"` - Container
- `data-tabz-input="search"` - Track search
- `data-tabz-input="track-url"` - URL input
- `data-tabz-input="audio-file"` - File upload
- `data-tabz-action="toggle-play"` - Play/pause
- `data-tabz-action="skip-next"` - Next track
- `data-tabz-action="skip-previous"` - Previous track
- `data-tabz-action="add-track-url"` - Add by URL
- `data-tabz-action="upload-file"` - Upload file
- `data-tabz-action="queue-panel"` - Show queue
- `data-tabz-action="open-add-track"` - Add track dialog
- `data-tabz-action="quick-add-audio"` - Quick add
- `data-tabz-action="now-playing"` - Now playing bar
- `data-tabz-action="mobile-player"` - Mobile controls

## Configuration
Spotify OAuth in Settings:
- `spotify-client-id` - Spotify app client ID
- Redirect URI: `http://127.0.0.1:3001/api/spotify/callback`
