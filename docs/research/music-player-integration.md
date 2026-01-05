# Music Player Integration Research

Research findings for integrating music playback into the personal homepage.

## Table of Contents

- [Spotify Integration](#spotify-integration)
- [pyradio Integration](#pyradio-integration)
- [ytconverter Integration](#ytconverter-integration)
- [Radio Browser API (Free Alternative)](#radio-browser-api-free-alternative)
- [Comparison Matrix](#comparison-matrix)
- [Recommended Approach](#recommended-approach)

---

## Spotify Integration

### Overview

Spotify provides a comprehensive Web API and Web Playback SDK for building music applications.

### OAuth Requirements

**Authorization Code Flow with PKCE** (recommended for web apps):

```typescript
// 1. Generate code verifier (43-128 chars, high entropy)
const codeVerifier = generateRandomString(64);

// 2. Create code challenge
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

// 3. Redirect to Spotify auth
const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: REDIRECT_URI,
  code_challenge_method: 'S256',
  code_challenge: codeChallenge,
  scope: 'streaming user-read-email user-read-private user-modify-playback-state',
})}`;

// 4. Exchange code for tokens (no client secret needed with PKCE)
const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  }),
});
```

**Important 2025 Update**: As of November 27, 2025, Spotify removed support for:
- Implicit grant flow (deprecated)
- HTTP redirect URIs (must use HTTPS)
- Localhost aliases (use `http://127.0.0.1` instead)

### Required Scopes

| Scope | Purpose |
|-------|---------|
| `streaming` | Web Playback SDK |
| `user-read-email` | Required for SDK initialization |
| `user-read-private` | Required for SDK initialization |
| `user-modify-playback-state` | Control playback via Web API |
| `user-read-playback-state` | Read current playback info |
| `user-library-read` | Access saved tracks/albums |
| `playlist-read-private` | Read user's playlists |

### Web Playback SDK Requirements

**Premium Requirement**: The Web Playback SDK **requires Spotify Premium**. This is a hard requirement enforced by Spotify.

- Standard Premium: Supported
- Student Premium: Supported
- Family Premium: Supported
- Mobile-only plans (Lite, Mini): **Not supported**

**Browser Support**: Chrome, Firefox, Safari, Edge (desktop and mobile)

**Implementation Example**:

```typescript
// Load SDK
const script = document.createElement('script');
script.src = 'https://sdk.scdn.co/spotify-player.js';
document.body.appendChild(script);

window.onSpotifyWebPlaybackSDKReady = () => {
  const player = new Spotify.Player({
    name: 'Personal Homepage Player',
    getOAuthToken: (cb) => cb(accessToken),
    volume: 0.5,
  });

  player.addListener('ready', ({ device_id }) => {
    console.log('Ready with Device ID', device_id);
    // Now use device_id with Web API to transfer playback
  });

  player.connect();
};
```

### Preview URLs (Non-Premium Option)

**Status: Deprecated as of November 2024**

Previously, the Web API provided 30-second `preview_url` clips for tracks that worked without Premium. However:

- New apps registered after November 27, 2024 don't receive preview URLs
- Existing apps in development mode also lost access
- Many tracks return `null` for `preview_url`

**Alternative for Non-Premium**: Use "Play on Spotify" button to redirect users to the Spotify app.

### Implementation Complexity: **HIGH**

**Pros**:
- Full catalog access (100M+ tracks)
- High-quality audio
- Rich metadata and artwork
- Well-documented API

**Cons**:
- Premium required for playback
- Complex OAuth flow
- Preview URLs deprecated
- Commercial use requires approval
- Rate limits (varies by endpoint)

---

## pyradio Integration

### Overview

pyradio is a command-line internet radio player. We can parse its station configuration to provide a curated list of radio streams.

### Station Config Location

```
~/.config/pyradio/stations.csv
```

### Station File Format

CSV format with columns: `name,url,encoding,icon,profile,buffering,force-http,volume,referer,player`

**Sample entries**:

```csv
Alternative (BAGeL Radio),https://ais-sa3.cdnstream1.com/2606_128.aac
Chillout (Groove Salad - SomaFM),http://somafm.com/startstream=groovesalad.pls
Radio Paradise - Main Mix,http://stream.radioparadise.com/aac-128
```

### Stream URL Formats

| Format | Extension | Browser Support |
|--------|-----------|-----------------|
| Direct MP3/AAC | `.mp3`, `.aac` | Native `<audio>` |
| HLS | `.m3u8` | hls.js library |
| PLS playlist | `.pls` | Parse & extract |
| M3U playlist | `.m3u` | Parse & extract |

### Parsing Implementation

```typescript
// Parse pyradio stations.csv
async function parsePyradioStations(csvContent: string): Promise<RadioStation[]> {
  return csvContent
    .split('\n')
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [name, url] = line.split(',');
      return { name: name.trim(), url: url.trim() };
    });
}

// Resolve playlist URLs to direct streams
async function resolveStreamUrl(url: string): Promise<string> {
  if (url.endsWith('.pls') || url.endsWith('.m3u')) {
    const response = await fetch(url);
    const text = await response.text();
    // Extract first stream URL from playlist
    const match = text.match(/https?:\/\/[^\s\n]+/);
    return match?.[0] ?? url;
  }
  return url;
}
```

### Implementation Complexity: **LOW**

**Pros**:
- No authentication required
- User's existing curated stations
- Free streaming
- Simple CSV parsing

**Cons**:
- Only works if user has pyradio installed
- Station URLs may break over time
- Need to handle playlist formats
- No search/discovery features

---

## ytconverter Integration

### Overview

[ytconverter](https://github.com/kaifcodec/ytconverter) is a Python tool wrapping yt-dlp for downloading YouTube audio/video.

### Location

```
~/xprojects/ytconverter/
```

### Direct yt-dlp API Usage (Recommended)

Instead of wrapping ytconverter, use yt-dlp directly as a Python library:

```python
import yt_dlp
from typing import Optional, Callable

def download_audio(
    url: str,
    output_dir: str,
    progress_callback: Optional[Callable[[dict], None]] = None
) -> str:
    """Download audio from YouTube URL."""

    def progress_hook(d):
        if progress_callback and d['status'] == 'downloading':
            progress_callback({
                'percent': d.get('_percent_str', '0%'),
                'speed': d.get('_speed_str', 'N/A'),
                'eta': d.get('_eta_str', 'N/A'),
            })

    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': f'{output_dir}/%(title)s.%(ext)s',
        'quiet': True,
        'no_warnings': True,
        'progress_hooks': [progress_hook] if progress_callback else [],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return info.get('title', 'Unknown')
```

### Next.js API Route Wrapper

```typescript
// app/api/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

export async function POST(request: NextRequest) {
  const { url } = await request.json();

  // Validate YouTube URL
  if (!url.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//)) {
    return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 });
  }

  return new Response(
    new ReadableStream({
      start(controller) {
        const process = spawn('yt-dlp', [
          '-f', 'bestaudio',
          '-x', '--audio-format', 'mp3',
          '--newline', // Progress on separate lines
          '-o', '/tmp/downloads/%(title)s.%(ext)s',
          url,
        ]);

        process.stdout.on('data', (data) => {
          controller.enqueue(`data: ${JSON.stringify({ progress: data.toString() })}\n\n`);
        });

        process.on('close', (code) => {
          controller.enqueue(`data: ${JSON.stringify({ done: true, code })}\n\n`);
          controller.close();
        });
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }
  );
}
```

### Progress Tracking

yt-dlp provides progress hooks for real-time download status:

```python
def progress_hook(d):
    if d['status'] == 'downloading':
        print(f"Progress: {d['_percent_str']}")
        print(f"Speed: {d['_speed_str']}")
        print(f"ETA: {d['_eta_str']}")
    elif d['status'] == 'finished':
        print(f"Downloaded: {d['filename']}")
```

### Implementation Complexity: **MEDIUM**

**Pros**:
- Download any YouTube audio
- Keep local copies
- High-quality audio (up to 320kbps)
- Progress tracking available

**Cons**:
- Legal gray area for copyrighted content
- Requires server-side processing
- Storage management needed
- YouTube may block/throttle

---

## Radio Browser API (Free Alternative)

### Overview

[Radio Browser](https://api.radio-browser.info/) is a free, open-source API providing access to 30,000+ internet radio stations worldwide.

### API Endpoints

**Base URL**: `https://de1.api.radio-browser.info` (or use DNS lookup for `all.api.radio-browser.info`)

| Endpoint | Description |
|----------|-------------|
| `/json/stations/search` | Advanced search with filters |
| `/json/stations/byname/{term}` | Search by station name |
| `/json/stations/bycountry/{country}` | Filter by country |
| `/json/stations/bytag/{tag}` | Search by genre/tag |
| `/json/stations/topclick` | Popular stations |
| `/json/stations/topvote` | Highest voted stations |

### Station Data Structure

```typescript
interface RadioStation {
  stationuuid: string;        // Unique identifier (use this, not 'id')
  name: string;
  url: string;                // User-provided stream URL
  url_resolved: string;       // Auto-resolved (handles redirects/playlists)
  homepage: string;
  favicon: string;
  country: string;
  countrycode: string;        // ISO 3166-1 alpha-2
  state: string;
  language: string;
  tags: string;               // Comma-separated genres
  codec: string;              // MP3, AAC, OGG, etc.
  bitrate: number;            // kbps
  lastcheckok: 0 | 1;         // Online status
  clickcount: number;         // Popularity metric
  votes: number;
}
```

### Example API Calls

```typescript
// Search stations by tag/genre
const response = await fetch(
  'https://de1.api.radio-browser.info/json/stations/bytag/jazz?' +
  new URLSearchParams({
    limit: '20',
    order: 'clickcount',
    reverse: 'true',
    hidebroken: 'true',
  }),
  {
    headers: {
      'User-Agent': 'PersonalHomepage/1.0',
    },
  }
);

const stations = await response.json();

// Play station (use url_resolved for best compatibility)
const audio = new Audio(stations[0].url_resolved);
audio.play();
```

### Search Implementation

```typescript
// app/api/radio/search/route.ts
import { NextRequest, NextResponse } from 'next/server';

const RADIO_API = 'https://de1.api.radio-browser.info';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? '';
  const tag = searchParams.get('tag');
  const country = searchParams.get('country');

  let endpoint = '/json/stations/search';
  const params = new URLSearchParams({
    limit: '50',
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
  });

  if (query) params.set('name', query);
  if (tag) params.set('tag', tag);
  if (country) params.set('countrycode', country);

  const response = await fetch(`${RADIO_API}${endpoint}?${params}`, {
    headers: { 'User-Agent': 'PersonalHomepage/1.0' },
  });

  const stations = await response.json();
  return NextResponse.json(stations);
}
```

### Implementation Complexity: **LOW**

**Pros**:
- Completely free, no API key required
- 30,000+ stations worldwide
- Pre-resolved stream URLs
- No authentication needed
- Multiple output formats (JSON, M3U, PLS)
- Active community-maintained database

**Cons**:
- Station quality varies
- Some stations may be offline
- No on-demand music (radio only)
- Dependent on third-party service

---

## Comparison Matrix

| Feature | Spotify | pyradio | ytconverter | Radio Browser |
|---------|---------|---------|-------------|---------------|
| **Complexity** | High | Low | Medium | Low |
| **Auth Required** | Yes (OAuth) | No | No | No |
| **Premium Required** | Yes (playback) | No | No | No |
| **Content Type** | On-demand | Radio | Downloads | Radio |
| **Catalog Size** | 100M+ tracks | User-curated | YouTube | 30K+ stations |
| **Search** | Yes | No | Via YouTube | Yes |
| **Offline** | No | No | Yes | No |
| **Legal Clarity** | Clear | Clear | Gray area | Clear |
| **Cost** | Free tier limited | Free | Free | Free |

---

## Recommended Approach

> **Note**: User has Spotify Premium, enabling full Web Playback SDK support.

### Primary: Spotify Integration

**Why**: With Premium subscription, Spotify offers the richest music experience.

1. Full 100M+ track catalog with on-demand playback
2. Web Playback SDK for in-browser player
3. Access to playlists, saved library, and recommendations
4. High-quality audio streaming
5. Rich metadata and artwork

### Secondary: Radio Browser API

**Why**: Best free option for radio/background listening without Spotify auth.

1. No authentication required
2. 30K+ stations worldwide
3. Excellent for discovery and ambient listening
4. Fallback when not logged into Spotify

### Tertiary: pyradio Stations

**Why**: Complements Radio Browser with user's personal curated stations.

1. Parse existing `~/.config/pyradio/stations.csv`
2. Display in a "My Stations" section
3. Simple file read, no API needed

### Optional: YouTube Downloads

**Why**: For saving audio locally (use sparingly due to legal gray area).

1. Wrap yt-dlp in a Next.js API route
2. Server-Sent Events for progress
3. Store in user's local downloads

---

## Implementation Phases

### Phase 1: Spotify Integration (High effort, high value)
- OAuth PKCE implementation (store in Supabase or localStorage)
- Web Playback SDK integration with in-browser player
- Playlist/library browsing
- Search and play any track
- Player controls (play, pause, skip, volume, seek)

### Phase 2: Radio Browser (Low effort, good fallback)
- Search interface with tag/country filters
- Station playback with native `<audio>` element
- Favorites stored in localStorage
- Works without Spotify login

### Phase 3: pyradio Import (Low effort)
- File reader for stations.csv
- "My Stations" tab in player
- Merge with Radio Browser favorites

### Phase 4: YouTube Downloads (Medium effort, optional)
- API endpoint with yt-dlp
- Download queue with progress
- Local file management

---

## References

- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk)
- [Spotify OAuth PKCE Flow](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
- [Radio Browser API Documentation](https://api.radio-browser.info/)
- [Radio Browser API Reference](https://docs.radio-browser.info/)
- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [yt-dlp Python Embedding](https://yt-dlp.memoryview.in/docs/embedding-yt-dlp/using-yt-dlp-in-python-scripts)
- [pyradio GitHub](https://github.com/coderholic/pyradio)
