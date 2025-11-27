# Personal Homepage

A personal dashboard/homepage with accordion sidebar navigation. Features weather, feeds, notes, bookmarks, stock trading, and more.

## Quick Reference

| Task | Documentation |
|------|---------------|
| Add new section | [docs/navigation.md](docs/navigation.md) |
| Styling/themes | [docs/design-system.md](docs/design-system.md) |
| Authentication | [docs/auth.md](docs/auth.md) |
| State management | [docs/state-management.md](docs/state-management.md) |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/navigation.md](docs/navigation.md) | Sidebar system, adding sections |
| [docs/auth.md](docs/auth.md) | GitHub OAuth via Supabase |
| [docs/weather.md](docs/weather.md) | Weather APIs and features |
| [docs/daily-feed.md](docs/daily-feed.md) | Feed sources and schema |
| [docs/api-playground.md](docs/api-playground.md) | HTTP client features |
| [docs/quick-notes.md](docs/quick-notes.md) | GitHub-synced markdown editor |
| [docs/stocks-dashboard.md](docs/stocks-dashboard.md) | Paper trading, Finnhub/Alpha Vantage |
| [docs/design-system.md](docs/design-system.md) | Themes, glassmorphism, backgrounds |
| [docs/state-management.md](docs/state-management.md) | TanStack Query, caching |
| [docs/roadmap.md](docs/roadmap.md) | Planned features |

## Sections

| Section | File | Description |
|---------|------|-------------|
| Home | `app/page.tsx` | Dashboard overview |
| Weather | `app/sections/weather.tsx` | Weather + radar + alerts |
| Daily Feed | `app/sections/daily-feed.tsx` | HN, GitHub, Reddit, etc. |
| API Playground | `app/sections/api-playground.tsx` | HTTP request builder |
| Quick Notes | `app/sections/quick-notes.tsx` | Markdown editor (GitHub sync) |
| Bookmarks | `app/sections/bookmarks.tsx` | Links manager (GitHub sync) |
| Search Hub | `app/sections/search-hub.tsx` | Search + AI chat |
| Paper Trading | `app/sections/stocks-dashboard.tsx` | Stock trading practice |
| Profile | `app/sections/profile.tsx` | Auth, sync status, settings |
| Settings | `app/page.tsx` (SettingsSection) | Theme/appearance |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + localStorage
- **Auth**: Supabase (GitHub OAuth)
- **APIs**: Open-Meteo, Finnhub, Alpha Vantage, GitHub

## Development

```bash
npm run dev    # http://localhost:3001
npm run build
```

## Key Patterns

### Adding a Section

1. Add to `Section` type in `app/page.tsx`
2. Add to `navigationItems` array
3. Create `app/sections/[name].tsx`
4. Add case to `renderContent()` switch

See [docs/navigation.md](docs/navigation.md) for details.

### Styling

- Use `glass` / `glass-dark` for panels
- Use `terminal-glow` for headings
- See [docs/design-system.md](docs/design-system.md)

### Auth

- `useAuth()` hook from `components/AuthProvider.tsx`
- `getGitHubToken()` for GitHub API calls
- See [docs/auth.md](docs/auth.md)

### Hydration

Add `suppressHydrationWarning` for dynamic time displays.
