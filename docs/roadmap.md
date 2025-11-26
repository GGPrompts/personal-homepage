# Roadmap

Future enhancements and planned features.

## Recently Completed

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
| **Search Hub** | Multi-engine search bar (Google, GitHub, SO, etc.) | Low |
| **Pomodoro Timer** | Focus timer with work/break sessions | Low |
| **World Clocks** | Multiple timezone display | Low |
| **Quote of the Day** | Motivational quotes API | Low |

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

## Ideas / Backlog

- PWA support for mobile installation
- Keyboard shortcuts system (global hotkeys)
- Custom widgets API (user-defined sections)
- WebSocket connections for real-time data
- Sync settings across devices
- Dark/light mode auto-switch based on time
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
