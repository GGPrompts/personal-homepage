# Personal Homepage

A personal dashboard/homepage designed as a browser start page. Features multiple sections accessible via a left sidebar (collapsible on desktop, sheet drawer on mobile).

## Documentation

| Document | Description |
|----------|-------------|
| [docs/weather.md](docs/weather.md) | Weather section APIs, features, localStorage |
| [docs/daily-feed.md](docs/daily-feed.md) | Feed API, sources, schema, preferences |
| [docs/design-system.md](docs/design-system.md) | Themes, CSS utilities, backgrounds |
| [docs/state-management.md](docs/state-management.md) | TanStack Query, caching, localStorage |
| [docs/roadmap.md](docs/roadmap.md) | Planned features and ideas |
| [CHANGELOG.md](CHANGELOG.md) | Completed features and changes |

## Current Sections

| Section | Status | Description |
|---------|--------|-------------|
| **Home** | Complete | Dashboard overview with live weather/feed stats |
| **Weather** | Complete | Live weather + radar + alerts |
| **Daily Feed** | Complete | Aggregated content from HN, GitHub, Reddit, Lobsters, Dev.to |
| **Settings** | Partial | Theme customizer (needs full options) |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query (server state) + localStorage (preferences)
- **Theming**: 4 themes (Terminal, Amber, Carbon, Light) + background options
- **APIs**: Open-Meteo, RainViewer, NWS, Nominatim, plus feed APIs

## Project Structure

```
personal-homepage/
├── app/
│   ├── layout.tsx          # Root layout with ThemeProvider
│   ├── page.tsx            # Main page with sidebar navigation
│   ├── globals.css         # Theme system
│   ├── sections/           # Section components
│   │   ├── weather.tsx
│   │   └── daily-feed.tsx
│   └── api/feed/           # Feed API endpoint + fetchers
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── QueryProvider.tsx   # TanStack Query provider
│   ├── ThemeProvider.tsx
│   ├── ThemeCustomizer.tsx
│   ├── BackgroundProvider.tsx
│   └── MasterBackground.tsx
├── docs/                   # Detailed documentation
└── lib/utils.ts            # cn() helper
```

## Development

```bash
npm install
npm run dev    # http://localhost:3001
npm run build
```

**Port 3001** to avoid conflict with portfolio-style-guides on 3000.

## Related Project

Reference templates from portfolio-style-guides:
```
~/projects/portfolio-style-guides/app/templates/
```
- `admin-dashboard` - Sidebar layout pattern
- `live-weather-dashboard` - API integration pattern
- `settings` - Full settings panel
- `analytics-dashboard` - Charts/stats

## Notes for Claude

### Adding New Sections
1. Create component in `app/sections/[name].tsx`
2. Add navigation item in `app/page.tsx` navigationItems array
3. Add case to `renderContent()` switch statement
4. Create `docs/[name].md` for detailed documentation
5. Follow existing patterns from weather/daily-feed sections

### Styling
- Use `glass` and `glass-dark` classes for cards/panels
- Use `terminal-glow` for headings
- Test mobile layout (Sheet drawer navigation)
- See [docs/design-system.md](docs/design-system.md) for full details

### Hydration Warnings
For time displays that change between server/client render, add `suppressHydrationWarning` to the element.
