# Roadmap

Future enhancements and planned features.

## Recently Completed

- **Search Hub** - Multi-engine search + AI chat + Image AI (7 search engines, 6 AI assistants, 7 image generators including Sora) with keyboard shortcuts
- **Bookmarks** - Folder-based organization, icon/list view toggle, search, GitHub sync, favicon auto-fetch
- **Sidebar Jump Links** - Sub-items now navigate to specific sections (scroll/switch tabs)
- **Weather Alert Badge** - Shows count in sidebar (green for 0, red for active alerts)
- **Quick Notes Improvements** - Default to View mode, anchor links work, code block spacing fixed, path input for new notes
- **Quick Notes** - GitHub-synced markdown editor with file browser, theme-aware preview, auto-save
- **GitHub Integration** - Settings panel for token/repo, auto-injection into API Playground
- **Markdown Preview Styles** - Theme-aware rendering with `.md-*` CSS classes
- **API Playground** - HTTP request builder with collections, history, JSON viewer
- **Accordion Sidebar** - Expandable sections with contextual sub-items
- **10 Themes** - Terminal, Amber, Carbon, Light, Ocean, Sunset, Forest, Midnight, Neon, Slate
- **JsonViewer Component** - Theme-aware syntax highlighting with collapsible nodes

## In Progress

### Settings Section Expansion
Current: Theme/appearance customizer + GitHub integration
Needed:
- Feed Configuration (sources, subreddits, refresh interval)
- API Keys management (for authenticated APIs)

## Up Next (Low Effort)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Section Visibility** | Toggle sections on/off in Settings, drag-drop reorder | Low |
| **World Clocks** | Multiple timezone display | Low |
| **Quote of the Day** | Motivational quotes API | Low |
| **Dynamic Weather Theme** | Auto-switch theme/background based on local weather conditions | Low-Medium |

## Planned Sections

### Tasks / Quick Todo
Lightweight task tracking:
- Simple checkbox list for daily tasks
- Drag-and-drop reordering (Framer Motion)
- localStorage persistence
- Optional: Todoist API sync
- **Complexity**: Low-Medium

### System Status / Uptime Monitor
Monitor personal services:
- Check if portfolio/sites are up
- Visual status indicators
- Response time tracking
- Alerts when something goes down
- **Complexity**: Medium

### AI Chat Widget
Quick AI access from homepage:
- Claude/GPT API integration
- Conversation history
- Suggested prompts
- Code highlighting in responses
- **Complexity**: Medium-High (API key management)

### Data Viz / Personal Analytics
Visualize personal data:
- GitHub contribution stats
- Custom metrics tracking
- Charts with Recharts
- **Complexity**: Medium

### Calendar / Agenda View
Show upcoming events:
- Today's schedule at a glance
- Google Calendar API integration
- Countdown to important dates
- **Complexity**: Medium (OAuth)

### Stocks Dashboard / Paper Trading
Practice trading with real market data:
- Real-time quotes (15-min delay) via Alpha Vantage, Finnhub, or Twelve Data
- Paper trading with fake money ($100k starting balance)
- Portfolio tracking, watchlists, P&L
- Technical indicators (RSI, MACD, etc.)
- Historical charts with Recharts
- See [docs/stocks-dashboard.md](stocks-dashboard.md) for API details
- **Complexity**: Medium-High

### Integrations Page
Central hub for connecting services:
- Show all available integrations (GitHub, Google Calendar, Todoist, etc.)
- Connection status indicators
- Connect/disconnect buttons
- API key management for external services
- **Complexity**: Low-Medium

## Ideas / Backlog

- PWA support for mobile installation
- Keyboard shortcuts system (global hotkeys)
- Custom widgets API (user-defined sections)
- WebSocket connections for real-time data
- Sync settings across devices
- Bookmarks import/export (Chrome format)
- Bookmarks keyboard shortcuts

## Reference Templates

These templates from `~/projects/portfolio-style-guides/app/templates/` can be adapted:

| Template | Use For |
|----------|---------|
| `kanban-board` | Tasks with drag-and-drop |
| `chat-helpbot` | AI Chat Widget |
| `uptime-monitor` | System Status |
| `analytics-dashboard` | Data Viz |
| `docs-hub` | Bookmarks search |
| `form-builder` | Quick Notes editor |

---

*Move completed items to CHANGELOG.md*
