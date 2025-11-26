# Personal Homepage - Project Context

## Project Overview

A personal dashboard/homepage designed to be used as a browser start page. Features multiple sections accessible via a left sidebar (collapsible on desktop, sheet drawer on mobile).

## Current Sections

| Section | Status | Description |
|---------|--------|-------------|
| **Home** | Complete | Dashboard overview with live weather/feed stats, clickable cards |
| **Weather** | Complete | Live weather from Open-Meteo + RainViewer radar + NWS alerts |
| **Daily Feed** | Complete | Aggregated content from HN, GitHub, Reddit, Lobsters, Dev.to |
| **Settings** | Partial | Theme customizer (needs full options) |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Theming**: 4 themes (Terminal, Amber, Carbon, Light) + background options
- **APIs**: Open-Meteo (weather), RainViewer (radar), NWS (alerts), Nominatim (geocoding), plus feed APIs

## Related Project

This project uses components and styling from the portfolio-style-guides project:

```
~/projects/portfolio-style-guides/
├── components/ui/          # shadcn/ui components
├── app/templates/          # 95+ production templates for reference
└── app/globals.css         # Theme system and glassmorphism utilities
```

**Template Reference**: When building new sections, look at existing templates in `portfolio-style-guides/app/templates/` for patterns:
- `admin-dashboard` - Sidebar layout pattern
- `live-weather-dashboard` - API integration pattern
- `settings` - Full settings panel with many options
- `analytics-dashboard` - Dashboard with charts/stats

## Project Structure

```
personal-homepage/
├── app/
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx            # Main page with sidebar navigation
│   ├── globals.css         # Theme system (from portfolio-style-guides)
│   ├── sections/
│   │   ├── weather.tsx     # Weather dashboard section
│   │   └── daily-feed.tsx  # Aggregated feed section
│   └── api/
│       └── feed/
│           ├── route.ts    # Aggregated feed endpoint
│           ├── types.ts    # TypeScript interfaces
│           └── fetchers/   # Individual source fetchers
│               ├── hackernews.ts
│               ├── github.ts
│               ├── reddit.ts
│               ├── lobsters.ts
│               └── devto.ts
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── ThemeProvider.tsx   # Theme context
│   ├── ThemeCustomizer.tsx # Theme settings UI
│   ├── BackgroundProvider.tsx
│   └── MasterBackground.tsx
└── lib/
    └── utils.ts            # cn() helper
```

## Design System

Uses the same design system as portfolio-style-guides:

### Theme Variables (Terminal default)
- **Primary**: Terminal green/cyan `hsl(160 84% 39%)`
- **Background**: Dark slate `hsl(220 13% 5%)`
- **Border**: Cyan border `hsl(160 60% 25%)`

### Glassmorphism Utilities
```css
.glass        /* Semi-transparent with blur */
.glass-dark   /* Darker glass effect */
.terminal-glow /* Text glow effect */
.border-glow  /* Border glow effect */
```

### Background Options
- `gradient` - Default gradient background
- `mesh` - Mesh gradient
- `textured` - Textured background
- `minimal` - Minimal/clean
- `none` - No background effect

## Home Section

The home page is the default landing page featuring:
- **Live weather card**: Shows current temperature, condition, and location (fetched from Open-Meteo)
- **Daily feed card**: Shows item count from feed API
- **Settings card**: Quick access to settings
- **Clickable navigation**: All cards navigate to their respective sections

## Weather Section

### Features
- **Geolocation**: Auto-detects user location (falls back to San Francisco)
- **Temperature unit toggle**: °F/°C switch in header (persisted in localStorage)
- **Live weather data**: Temperature, feels like, humidity, wind, pressure, visibility, UV, cloud cover
- **Weather alerts**: Real alerts from NWS API (US locations only)
- **Hourly forecast**: 24-hour forecast with temperature chart
- **7-day forecast**: Extended daily forecast
- **Air quality**: AQI with pollutant breakdown (PM2.5, PM10, O3, CO)
- **Weather radar**: Live precipitation radar from RainViewer (animated)
- **Historical comparison**: Current vs normal vs record values

### APIs Used
| API | Purpose | Notes |
|-----|---------|-------|
| Open-Meteo | Weather data | Free, no API key |
| Open-Meteo Air Quality | AQI data | Free, no API key |
| NWS (api.weather.gov) | Weather alerts | Free, US only |
| RainViewer | Precipitation radar | Free, global |
| Nominatim | Reverse geocoding | Free, requires User-Agent |

### Weather Icon Animations
- **Sunny/Clear**: Smooth 360° rotation (20s)
- **Other conditions**: Balatro-style floating effect (gentle bob + rotation wobble)

### Unit Preferences (localStorage)
- `weather-temp-unit`: "fahrenheit" | "celsius"
- Affects: temperature, wind speed (mph/km/h), visibility (mi/km), pressure (inHg/hPa), precipitation (in/mm)

## Daily Feed

### API Endpoints

```
GET /api/feed                           # All sources (~100 items)
GET /api/feed?sources=hackernews,reddit # Specific sources
GET /api/feed?subreddits=rust,golang    # Custom subreddits
```

### Content Sources

| Source | API | Items | Notes |
|--------|-----|-------|-------|
| Hacker News | Firebase API | ~30 | Top stories |
| GitHub | Search API | ~10 | Trending repos (last 7 days) |
| Reddit | JSON endpoints | ~25 | 5 subreddits × 5 items |
| Lobsters | hottest.json | ~20 | Computing-focused |
| Dev.to | Public API | ~15 | Top articles |

### Default Subreddits
- r/commandline
- r/ClaudeAI
- r/ClaudeCode
- r/cli
- r/tui

### Features
- **Sort options**: Trending (HN-style algorithm), Newest, Top Rated
- **Multi-select filtering**: Click source buttons to filter by multiple sources
- **Save items**: Bookmark items for later (persists in localStorage)
- **Hide items**: Remove items from feed (can be cleared)
- **Custom subreddits**: Add/remove subreddits via settings popover
- **Source toggle**: Enable/disable content sources
- **15-minute caching**: Server-side caching to avoid rate limits

### Feed Item Schema
```typescript
interface FeedItem {
  id: string
  title: string
  url: string
  source: "hackernews" | "github" | "reddit" | "lobsters" | "devto"
  author?: string
  score: number
  commentCount?: number
  commentsUrl?: string
  createdAt: string
  subreddit?: string      // Reddit only
  tags?: string[]         // Lobsters, Dev.to, GitHub
  description?: string    // GitHub repos
}
```

### Sort Algorithm (Trending)
Uses HN-style gravity decay:
```typescript
trendingScore = score / Math.pow(hoursAgo + 2, 1.8)
```

### Preferences (localStorage)
Key: `daily-feed-preferences`
- `enabledSources`: Which sources to fetch
- `subreddits`: Custom subreddit list
- `savedItems`: Bookmarked item IDs
- `hiddenItems`: Hidden item IDs
- `savedItemsData`: Full data for saved items
- `sortBy`: "trending" | "newest" | "top"

## Future Enhancements

### AI Curation (Optional)
The feed currently fetches live from APIs. To add AI curation:
1. Set up Claude API key
2. Create cron job to run daily
3. Have Claude filter/summarize items
4. Save to `public/feed/YYYY-MM-DD.json`
5. Update feed to read from static JSON

### Settings (Full Implementation Needed)
- Theme selection (4 themes)
- Background dropdown (gradient, mesh, textured, minimal, none)
- Feed refresh interval
- Default sources/subreddits

### API Playground
A separate page for testing/learning APIs (in Settings section)

## Development

```bash
# Install dependencies
npm install

# Run development server (port 3001)
npm run dev
# Opens at http://localhost:3001

# Build for production
npm run build
```

**Note**: Uses port 3001 to avoid conflict with portfolio-style-guides on port 3000.

## Notes for Claude

### When Adding New Sections
1. Create component in `app/sections/[name].tsx`
2. Add navigation item in `app/page.tsx` navigationItems array
3. Add case to `renderContent()` switch statement
4. Follow existing patterns from weather/daily-feed sections

### When Styling
- Use `glass` and `glass-dark` classes for cards/panels
- Use `terminal-glow` for headings
- Maintain consistency with the 4 theme variants
- Test mobile layout (Sheet drawer navigation)

### Hydration Warnings
For time displays that change between server/client render, add `suppressHydrationWarning` to the element.

### Reference Templates
For complex UI patterns, check portfolio-style-guides templates:
```bash
# List all templates
ls ~/projects/portfolio-style-guides/app/templates/

# Read a specific template
cat ~/projects/portfolio-style-guides/app/templates/[template-name]/page.tsx
```
