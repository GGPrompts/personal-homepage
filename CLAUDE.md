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
| AI Workspace | `app/sections/ai-workspace.tsx` | [docs/sections/ai-workspace.md](docs/sections/ai-workspace.md) |
| Analytics | `app/sections/analytics.tsx` | [docs/sections/analytics.md](docs/sections/analytics.md) |
| API Playground | `app/sections/api-playground.tsx` | [docs/sections/api-playground.md](docs/sections/api-playground.md) |
| Bookmarks | `app/sections/bookmarks.tsx` | [docs/sections/bookmarks.md](docs/sections/bookmarks.md) |
| Calendar | `app/sections/calendar.tsx` | [docs/sections/calendar.md](docs/sections/calendar.md) |
| Crypto | `app/sections/crypto-dashboard.tsx` | [docs/sections/crypto-dashboard.md](docs/sections/crypto-dashboard.md) |
| Daily Feed | `app/sections/daily-feed.tsx` | [docs/sections/daily-feed.md](docs/sections/daily-feed.md) |
| Disasters | `app/sections/disasters-monitor.tsx` | [docs/sections/disasters-monitor.md](docs/sections/disasters-monitor.md) |
| Email | `app/sections/email.tsx` | [docs/sections/email.md](docs/sections/email.md) |
| Files | `app/sections/files.tsx` | [docs/sections/files.md](docs/sections/files.md) |
| Flowchart | `app/sections/flowchart.tsx` | [docs/sections/flowchart.md](docs/sections/flowchart.md) |
| GitHub Activity | `app/sections/github-activity.tsx` | [docs/sections/github-activity.md](docs/sections/github-activity.md) |
| Jobs | `app/sections/jobs.tsx` | [docs/sections/jobs.md](docs/sections/jobs.md) |
| Kanban | `app/sections/kanban.tsx` | [docs/sections/kanban.md](docs/sections/kanban.md) |
| Market Pulse | `app/sections/market-pulse.tsx` | [docs/sections/market-pulse.md](docs/sections/market-pulse.md) |
| Music Player | `app/sections/music-player.tsx` | [docs/sections/music-player.md](docs/sections/music-player.md) |
| Photo Gallery | `app/sections/photo-gallery.tsx` | [docs/sections/photo-gallery.md](docs/sections/photo-gallery.md) |
| Profile | `app/sections/profile.tsx` | [docs/sections/profile.md](docs/sections/profile.md) |
| Prompt Library | `app/sections/prompt-library.tsx` | [docs/sections/prompt-library.md](docs/sections/prompt-library.md) |
| Projects | `app/sections/projects-dashboard.tsx` | [docs/sections/projects-dashboard.md](docs/sections/projects-dashboard.md) |
| Search Hub | `app/sections/search-hub.tsx` | [docs/sections/search-hub.md](docs/sections/search-hub.md) |
| Scratchpad | `app/sections/tasks.tsx` | Tasks + Notes tabs (see below) |
| Settings | `app/sections/settings.tsx` | [docs/sections/settings.md](docs/sections/settings.md) |
| SpaceX | `app/sections/spacex-tracker.tsx` | [docs/sections/spacex-tracker.md](docs/sections/spacex-tracker.md) |
| Stocks | `app/sections/stocks-dashboard.tsx` | [docs/sections/stocks-dashboard.md](docs/sections/stocks-dashboard.md) |
| Video Player | `app/sections/video-player.tsx` | [docs/sections/video-player.md](docs/sections/video-player.md) |
| Weather | `app/sections/weather.tsx` | [docs/sections/weather.md](docs/sections/weather.md) |

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

## Local Data Storage

Some sections store data locally on the filesystem:

| Data | Location | API |
|------|----------|-----|
| Quick Notes | `~/.config/homepage/quicknotes.json` | `/api/quicknotes` |
| Claude Stats | `~/.claude/stats-cache.json` | `/api/claude-stats` |
| Section Preferences | localStorage `section-preferences` | - |
| Tasks | localStorage `quick-tasks` | - |

The Scratchpad section (`app/sections/tasks.tsx`) has two tabs:
- **Tasks**: Simple todos stored in localStorage
- **Notes**: Quick notes stored at `~/.config/homepage/quicknotes.json` via `/api/quicknotes`

## AI Workspace Architecture

The AI Workspace is a live JSONL session viewer — it watches real Claude CLI sessions running in external terminals. Key files:
- `app/api/ai/sessions/route.ts` - Lists sessions, spawns new tmux+claude sessions
- `app/api/ai/stream/route.ts` - SSE endpoint that tails JSONL files with offset-based polling
- `lib/ai/jsonl-parser.ts` - Parses JSONL entries into typed messages
- `components/ai/ConversationViewer.tsx` - Renders messages with collapsible tool/thinking blocks
- `hooks/useSessionStream.ts` - Client hook for SSE stream consumption

Sessions are read from `~/.claude/projects/{path}/{session-id}.jsonl` files written by Claude CLI running externally.

**AI Drawer sidebar** (`components/ai/AIDrawer.tsx`) is a separate system that still uses the old `--print` mode chat via `hooks/useAIChat.ts` and `app/api/ai/chat/route.ts`.

**Archived implementations** in `lib/ai/_archived/`:
- `ai-workspace-print-mode.tsx` - Old chat UI
- `claude-print-mode.ts` - Old Claude CLI spawner
- `chat-route-print-mode.ts` - Old chat API route
- `useAIChat-print-mode.ts` - Old chat hook
- `conversation-multimodel.ts` - Multi-model conversation system

## Quick Reference

- **Auth hook**: `useAuth()` from `components/AuthProvider.tsx`
- **GitHub token**: `getGitHubToken()` from auth hook
- **Terminal commands**: `useTerminalExtension()` from `hooks/useTerminalExtension.ts`
- **Section preferences**: `useSectionPreferences()` from `hooks/useSectionPreferences.ts`
- **Styling**: Use `glass` / `glass-dark` for panels, `terminal-glow` for headings
- **Hydration**: Add `suppressHydrationWarning` for dynamic time displays
