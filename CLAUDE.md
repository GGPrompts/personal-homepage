# Personal Homepage

A personal dashboard/homepage designed as a browser start page. Features an accordion-style sidebar navigation with expandable sections (collapsible on desktop, sheet drawer on mobile).

## Documentation

| Document | Description |
|----------|-------------|
| [docs/navigation.md](docs/navigation.md) | Accordion sidebar system, adding sections |
| [docs/weather.md](docs/weather.md) | Weather section APIs, features, localStorage |
| [docs/daily-feed.md](docs/daily-feed.md) | Feed API, sources, schema, preferences |
| [docs/api-playground.md](docs/api-playground.md) | HTTP client, collections, JSON viewer |
| [docs/quick-notes.md](docs/quick-notes.md) | GitHub-synced notes, markdown editor |
| [docs/design-system.md](docs/design-system.md) | 10 themes, CSS utilities, backgrounds |
| [docs/state-management.md](docs/state-management.md) | TanStack Query, caching, localStorage |
| [docs/stocks-dashboard.md](docs/stocks-dashboard.md) | Paper trading, Finnhub API, portfolio |
| [docs/roadmap.md](docs/roadmap.md) | Planned features and ideas |
| [CHANGELOG.md](CHANGELOG.md) | Completed features and changes |

## Current Sections

| Section | Status | Description |
|---------|--------|-------------|
| **Home** | Complete | Dashboard overview with weather/feed stats, quick navigation cards |
| **Weather** | Complete | Live weather + radar + alerts + air quality |
| **Daily Feed** | Complete | Aggregated content from HN, GitHub, Reddit, Lobsters, Dev.to |
| **API Playground** | Complete | HTTP request builder with collections, history, JSON viewer |
| **Quick Notes** | Complete | GitHub-synced markdown editor with file browser |
| **Bookmarks** | Complete | Folder-based links with icon/list view, search, GitHub sync |
| **Search Hub** | Complete | Search, AI chat, and image generation with keyboard shortcuts |
| **Paper Trading** | Complete | Practice stock trading with real data and $100K virtual money |
| **Profile** | Complete | GitHub OAuth login, sync status, repository settings |
| **Settings** | Partial | Theme/appearance (Feed Config coming soon) |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query (server state) + localStorage (preferences)
- **Theming**: 10 themes + background styles + glassmorphism
- **Auth**: Supabase Auth (GitHub OAuth)
- **APIs**: Open-Meteo, RainViewer, NWS, Nominatim, HN, GitHub (trending + Contents API), Reddit, Lobsters, Dev.to, Finnhub (stocks), Alpha Vantage (charts)

## Project Structure

```
personal-homepage/
├── app/
│   ├── layout.tsx              # Root layout with ThemeProvider
│   ├── page.tsx                # Main page with accordion sidebar
│   ├── globals.css             # Theme system + JSON viewer styles
│   ├── sections/               # Section components
│   │   ├── weather.tsx
│   │   ├── daily-feed.tsx
│   │   ├── api-playground.tsx
│   │   ├── quick-notes.tsx
│   │   ├── bookmarks.tsx
│   │   ├── search-hub.tsx
│   │   ├── stocks-dashboard.tsx
│   │   └── profile.tsx
│   ├── api/feed/               # Feed API endpoint + fetchers
│   └── api/stocks/             # Stock quotes, history, search
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── AuthProvider.tsx        # Supabase auth context
│   ├── AuthModal.tsx           # GitHub OAuth login modal
│   ├── JsonViewer.tsx          # Syntax-highlighted collapsible JSON
│   ├── QueryProvider.tsx       # TanStack Query provider
│   ├── ThemeProvider.tsx       # Theme context
│   ├── ThemeCustomizer.tsx     # Quick theme switcher
│   ├── ThemeSettingsPanel.tsx  # Full theme settings
│   ├── BackgroundProvider.tsx  # Background style context
│   └── MasterBackground.tsx    # Animated backgrounds
├── lib/
│   ├── utils.ts                # cn() helper
│   ├── github.ts               # GitHub API helper
│   └── supabase.ts             # Supabase client
├── docs/                       # Detailed documentation
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
- `api-playground` - HTTP client pattern
- `settings` - Full settings panel

## Notes for Claude

### Adding New Sections

1. Update `Section` type in `app/page.tsx`
2. Add to `navigationItems` array with icon and sub-items
3. Create component in `app/sections/[name].tsx`
4. Import and add case to `renderContent()` switch
5. (Optional) Add card to `HomeSection`
6. Create `docs/[name].md` for detailed documentation

See [docs/navigation.md](docs/navigation.md) for full details.

### Sidebar Architecture

The sidebar uses an accordion pattern:
- Sections have expandable sub-items
- Only one section expanded at a time
- State: `activeSection`, `expandedSection`
- Desktop: collapsible sidebar (280px → 80px)
- Mobile: Sheet drawer with same accordion content

### Styling

- Use `glass` and `glass-dark` classes for cards/panels
- Use `terminal-glow` for headings
- Test mobile layout (Sheet drawer navigation)
- 10 themes available - test appearance changes
- See [docs/design-system.md](docs/design-system.md) for full details

### Components

- `JsonViewer`: Use for displaying API responses with syntax highlighting
- Markdown preview: Uses `.md-*` classes in `globals.css` for Quick Notes
- Theme classes automatically adapt to all 10 themes

### Hydration Warnings

For time displays that change between server/client render, add `suppressHydrationWarning` to the element.
