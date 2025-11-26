# Roadmap

Future enhancements and planned features.

## Recently Completed

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

## Planned Sections

### Bookmarks / Quick Links
Curated link manager for browser start page:
- Categorized bookmarks with icons
- Keyboard shortcuts for quick access
- Import/export capability
- Search across bookmarks
- **Complexity**: Low

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

## Quick Wins (Low Effort)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **Pomodoro Timer** | Focus timer with sessions | Low |
| **World Clocks** | Multiple timezone display | Low |
| **Quote of the Day** | Motivational quotes API | Low |
| **Search Hub** | Multi-engine search bar | Low |

## Ideas / Backlog

- PWA support for mobile installation
- Keyboard shortcuts system (global hotkeys)
- Custom widgets API (user-defined sections)
- WebSocket connections for real-time data
- Sync settings across devices
- Dark/light mode auto-switch based on time

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
