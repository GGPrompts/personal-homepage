# Changelog

Record of completed features and changes.

## 2026-01-05

### Added
- **Music Player**: Full audio playback with Spotify integration
  - Local audio file upload and URL playback
  - Spotify OAuth with Web Playback SDK
  - Queue management, shuffle, repeat modes
  - Now playing bar with controls
- **Video Player**: YouTube and local video support
  - YouTube Data API search with filters
  - Playlist loading by URL
  - Local video file browser
  - Custom playback controls, PiP mode
- **Photo Gallery**: Photo management with lightbox
  - Grid view with EXIF metadata display
  - Album organization
  - Slideshow mode
  - Local media directory browsing
- **Crypto Dashboard**: Cryptocurrency tracking via CoinGecko
  - Real-time prices with sparklines
  - Favorites system, sorting, search
- **Market Pulse**: BLS salary data visualization
  - Tech occupation salaries with trends
  - Historical comparison charts
- **SpaceX Tracker**: Launch schedule and history
  - Countdown timers, mission details
  - YouTube webcast links
- **Disasters Monitor**: USGS earthquake feed
  - Recent and significant earthquakes
  - Magnitude filtering
- **GitHub Activity**: Personal event feed
  - Commits, PRs, issues, stars
  - Repository overview

### Improved
- **Documentation**: Restructured for LLM consumption
  - Created docs/sections/ with 22 section docs
  - Condensed CLAUDE.md to ~90 lines as index
  - Added llms.txt for standard discovery
  - Added "Adding Connectors" guide to tabz-integration.md

---

## 2025-11-26

### Improved
- **State Management**: Added TanStack Query for API data caching
  - Weather data cached for 5 minutes, persists across tab switches
  - Feed data cached for 15 minutes (matches server cache)
  - Auto-refetch when "Live" mode enabled
  - No more unnecessary API calls when navigating between sections

### Documentation
- Added `docs/state-management.md` for state architecture

---

## 2024-11-26

### Added
- **Home Section**: Dashboard overview with live weather/feed stats, clickable cards
- **Weather Section**: Full weather dashboard
  - Geolocation with fallback
  - Temperature unit toggle (°F/°C)
  - Live weather data from Open-Meteo
  - Weather alerts from NWS API
  - Hourly and 7-day forecasts
  - Air quality index
  - Animated weather radar from RainViewer
  - Historical comparison
- **Daily Feed Section**: Aggregated content feed
  - 5 sources: Hacker News, GitHub, Reddit, Lobsters, Dev.to
  - Sort options (Trending, Newest, Top)
  - Multi-select source filtering
  - Save/hide items
  - Custom subreddits
  - 15-minute server-side caching
- **Theme System**: 4 themes (Terminal, Amber, Carbon, Light)
- **Background Options**: gradient, mesh, textured, minimal, none
- **Mobile Support**: Sheet drawer navigation

### Infrastructure
- Next.js 15 with App Router
- Tailwind CSS + shadcn/ui components
- Documentation reorganization (docs/ folder)
