# Personal Homepage

Next.js 15 personal dashboard with accordion sidebar navigation. Features weather, feeds, notes, bookmarks, stock trading, AI chat, media players, and more. Sections can be toggled/reordered via Settings.

## Commands

| Task | Command |
|------|---------|
| Dev server | `npm run dev` (port 3001) |
| Build | `npm run build` |
| Lint | `npm run lint` |

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: TanStack Query + localStorage
- **Auth**: Supabase (GitHub OAuth)

## Sections

| Section | File | Docs |
|---------|------|------|
| Weather | `app/sections/weather.tsx` | [docs/sections/weather.md](docs/sections/weather.md) |
| Daily Feed | `app/sections/daily-feed.tsx` | [docs/sections/daily-feed.md](docs/sections/daily-feed.md) |
| API Playground | `app/sections/api-playground.tsx` | [docs/sections/api-playground.md](docs/sections/api-playground.md) |
| Quick Notes | `app/sections/quick-notes.tsx` | [docs/sections/quick-notes.md](docs/sections/quick-notes.md) |
| Bookmarks | `app/sections/bookmarks.tsx` | [docs/sections/bookmarks.md](docs/sections/bookmarks.md) |
| Search Hub | `app/sections/search-hub.tsx` | [docs/sections/search-hub.md](docs/sections/search-hub.md) |
| Stocks | `app/sections/stocks-dashboard.tsx` | [docs/sections/stocks-dashboard.md](docs/sections/stocks-dashboard.md) |
| Crypto | `app/sections/crypto-dashboard.tsx` | [docs/sections/crypto-dashboard.md](docs/sections/crypto-dashboard.md) |
| Market Pulse | `app/sections/market-pulse.tsx` | [docs/sections/market-pulse.md](docs/sections/market-pulse.md) |
| SpaceX | `app/sections/spacex-tracker.tsx` | [docs/sections/spacex-tracker.md](docs/sections/spacex-tracker.md) |
| Disasters | `app/sections/disasters-monitor.tsx` | [docs/sections/disasters-monitor.md](docs/sections/disasters-monitor.md) |
| GitHub Activity | `app/sections/github-activity.tsx` | [docs/sections/github-activity.md](docs/sections/github-activity.md) |
| Tasks | `app/sections/tasks.tsx` | [docs/sections/tasks.md](docs/sections/tasks.md) |
| Kanban | `app/sections/kanban.tsx` | [docs/sections/kanban.md](docs/sections/kanban.md) |
| Projects | `app/sections/projects-dashboard.tsx` | [docs/sections/projects-dashboard.md](docs/sections/projects-dashboard.md) |
| Jobs | `app/sections/jobs.tsx` | [docs/sections/jobs.md](docs/sections/jobs.md) |
| AI Workspace | `app/sections/ai-workspace.tsx` | [docs/sections/ai-workspace.md](docs/sections/ai-workspace.md) |
| Music Player | `app/sections/music-player.tsx` | [docs/sections/music-player.md](docs/sections/music-player.md) |
| Video Player | `app/sections/video-player.tsx` | [docs/sections/video-player.md](docs/sections/video-player.md) |
| Photo Gallery | `app/sections/photo-gallery.tsx` | [docs/sections/photo-gallery.md](docs/sections/photo-gallery.md) |
| Profile | `app/sections/profile.tsx` | [docs/sections/profile.md](docs/sections/profile.md) |
| Settings | `app/sections/settings.tsx` | [docs/sections/settings.md](docs/sections/settings.md) |

## Key Patterns

| Topic | Documentation |
|-------|---------------|
| Adding sections | [docs/navigation.md](docs/navigation.md) |
| Styling/themes | [docs/design-system.md](docs/design-system.md) |
| Authentication | [docs/auth.md](docs/auth.md) |
| State management | [docs/state-management.md](docs/state-management.md) |
| Terminal integration | [docs/terminal-integration.md](docs/terminal-integration.md) |
| TabzChrome | [docs/tabz-integration.md](docs/tabz-integration.md) |
| AI patterns | [docs/ai-workspace-patterns.md](docs/ai-workspace-patterns.md) |
| Claude Jobs | [docs/claude-jobs.md](docs/claude-jobs.md) |

## Adding a Section

1. Add to `Section` type in `app/page.tsx`
2. Add to `navigationItems` array
3. Create `app/sections/[name].tsx`
4. Add case to `renderContent()` switch

See [docs/navigation.md](docs/navigation.md) for complete guide.

## TabzChrome Integration

All interactive elements have `data-tabz-*` attributes for MCP automation:
- `data-tabz-section` - Section identity
- `data-tabz-action` - Action type (navigate, submit, refresh, etc.)
- `data-tabz-input` - Input field purpose
- `data-tabz-list` / `data-tabz-item` - List containers and items
- `data-tabz-region` - Named regions within sections
- `data-tabz-command` / `data-tabz-project` - Terminal commands

See [docs/tabz-integration.md](docs/tabz-integration.md) for adding connectors and full selector reference.

## Issue Tracking (Beads)

This project uses `bd` (beads) for issue tracking. Always use `--json` flag.

### Worker Workflow

1. **Find work**: `bd ready --json`
2. **Claim it**: `bd update ID --status in_progress --json`
3. **Discover new work?** Create linked issue:
   ```bash
   bd create "Found issue" --deps discovered-from:PARENT-ID --json
   ```
4. **Add progress notes** (for context recovery):
   ```bash
   bd update ID --notes "Implemented X, still need Y"
   ```
5. **Complete**: `bd close ID --reason "Done: summary" --json`
6. **Sync**: `bd sync` (commits and pushes)

### Essential Commands

```bash
bd ready --json              # Unblocked issues
bd show ID --json            # Details with notes
bd update ID --status in_progress --json  # Claim
bd update ID --notes "Progress notes"     # Context
bd close ID --reason "Done: what was done" --json
bd create "Title" --deps discovered-from:PARENT --json  # Link discovered work
```

### Session Close Protocol

**CRITICAL**: Session is NOT complete until `git push` succeeds.

```bash
bd close ID --reason "Done: summary" --json  # Close finished work
bd sync                      # Export/commit/push beads
git push                     # MUST succeed before ending
```

Include issue ID in commits: `git commit -m "Fix bug (bd-abc)"`

## Quick Reference

- **Auth hook**: `useAuth()` from `components/AuthProvider.tsx`
- **GitHub token**: `getGitHubToken()` from auth hook
- **Terminal commands**: `useTerminalExtension()` from `hooks/useTerminalExtension.ts`
- **Section preferences**: `useSectionPreferences()` from `hooks/useSectionPreferences.ts`
- **Styling**: Use `glass` / `glass-dark` for panels, `terminal-glow` for headings
- **Hydration**: Add `suppressHydrationWarning` for dynamic time displays
