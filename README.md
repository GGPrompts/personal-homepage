# Personal Homepage

A feature-rich personal dashboard built with Next.js 15. Consolidates weather, news feeds, notes, bookmarks, stock tracking, AI chat, media players, and more into a single customizable interface.

## Features

- **Weather** -- Forecasts, radar, and severe weather alerts via Open-Meteo
- **Daily Feed** -- Aggregated tech news from Hacker News, GitHub Trending, and RSS
- **AI Workspace** -- Chat with Claude via Claude CLI with multi-turn sessions
- **Stocks & Crypto** -- Real-time quotes, portfolio tracking, and crypto prices
- **Bookmarks** -- Organized bookmarks with folders and optional terminal integration
- **Music & Video Players** -- Local files, Spotify, and YouTube playback
- **Quick Notes & Tasks** -- Scratchpad with file-backed notes and simple todos
- **GitHub Activity** -- Personal event feed with commit, PR, and issue tracking
- **Calendar & Email** -- Google Calendar and Gmail integration via OAuth
- **Analytics** -- Claude Code usage statistics dashboard
- **And more** -- Photo gallery, SpaceX launches, earthquake monitor, job search, flowcharts, Kanban boards

All sections can be toggled on/off and reordered from Settings.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/GGPrompts/personal-homepage.git
cd personal-homepage
npm install
```

### Configuration

Copy the example environment files:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your API keys. The only required key is Supabase (for auth). All other integrations are optional and degrade gracefully.

See `.env.example` for all available configuration options.

### Development

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

### Build

```bash
npm run build
npm start
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS, shadcn/ui (Radix) |
| State | TanStack Query, Zustand, localStorage |
| Auth | Supabase (GitHub OAuth) |
| Charts | Recharts |
| Drag & Drop | dnd-kit |
| Testing | Vitest |

## Project Structure

```
app/
  sections/       # Each dashboard section (weather.tsx, stocks-dashboard.tsx, etc.)
  api/            # Next.js API routes
components/       # Shared UI components
hooks/            # Custom React hooks
lib/              # Utilities, AI integration, auth helpers
docs/             # Section documentation and architecture notes
```

## Optional Integrations

Most features work without any API keys. For full functionality:

| Integration | Key Required | Free Tier |
|-------------|-------------|-----------|
| Supabase (auth) | Yes | Yes |
| Finnhub (stocks) | Optional | Yes |
| Alpha Vantage (stocks) | Optional | Yes |
| YouTube Data API | Optional | Yes |
| Spotify | Optional | Yes |
| Google OAuth (Gmail/Calendar) | Optional | Yes |
| GitHub Token (activity) | Optional | N/A |

## Documentation

Detailed docs are in the `docs/` directory:

- [Adding Sections](docs/navigation.md)
- [Design System](docs/design-system.md)
- [Authentication](docs/auth.md)
- [State Management](docs/state-management.md)
- [Terminal Integration](docs/terminal-integration.md) (optional TabzChrome support)

Each section has its own doc in `docs/sections/`.

## License

[ISC](LICENSE)
