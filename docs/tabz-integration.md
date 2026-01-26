# TabzChrome Integration

Personal Homepage integrates with TabzChrome for terminal automation and AI-assisted browsing. This document covers configuration, features, and automation selectors for AI/MCP usage.

## Quick Start

### Prerequisites

- TabzChrome browser extension installed in Chrome
- TabzChrome backend server running on `localhost:8129`

### Configuration

1. Navigate to the **Profile** section in Personal Homepage
2. Scroll to the "TabzChrome Terminal" card
3. Copy your API token from TabzChrome extension: **Settings > API Token > Copy**
4. Paste the token into the "API Token" field and click Save
5. Set a default working directory (defaults to `~/projects`)
6. Verify the "Backend Server" shows as "Running" and "API Token" shows as "Connected"

### Testing Connection

- Click the refresh icon next to "TabzChrome Terminal" to re-check connection status
- Try clicking a terminal bookmark to spawn a terminal session

## Features

### Terminal Bookmarks

Terminal bookmarks allow you to save and quickly execute shell commands directly from the Bookmarks section. When clicked, commands are sent to the TabzChrome backend which spawns them in a terminal panel.

**Creating Terminal Bookmarks:**

1. Go to **Bookmarks** section
2. Click **Add** button
3. If TabzChrome is connected, you'll see a **Type** selector:
   - **Link** - Standard URL bookmark
   - **Terminal** - Command to run in terminal
4. For terminal type, enter:
   - **Name** - Display name (e.g., "LazyGit")
   - **Command** - Shell command to run (e.g., `lazygit`)
   - **Working Directory** (optional) - Path to cd to before running

**Running Commands:**

- **Click** a terminal bookmark to execute it immediately
- **Right-click** for context menu:
  - Spawn New Terminal
  - Copy Command
  - Edit / Delete

**Visual Indicators:**

Terminal bookmarks are styled differently from regular bookmarks:
- Green background tint (`bg-emerald-500/20`)
- Green border (`border-emerald-500/30`)
- Terminal icon (or custom emoji)
- Play icon when TabzChrome is available

### Default Working Directory

Set a default working directory that applies to all terminal commands without an explicit path:

- Configure in **Profile > TabzChrome Terminal > Default Working Directory**
- Also editable inline in the **Bookmarks** section header
- Stored in `localStorage` as `tabz-default-workdir`

### Import/Export (TabzChrome Sync)

Bookmarks can be imported from and exported to TabzChrome-compatible JSON files.

**Accessing Import/Export:**
1. Go to **Bookmarks** section
2. Click the **Sync** button in the header toolbar
3. Choose from the dropdown menu

**Export Options:**

- **Export Bookmarks** - Exports all bookmarks and folders as a hierarchical JSON file (`tabz-bookmarks-YYYY-MM-DD.json`)
  - Includes all regular bookmarks and terminal commands
  - Terminal commands are encoded with their settings (workingDir, profile, color, etc.)

- **Export as TabzChrome Profiles** - Exports terminal commands as TabzChrome profile format (`tabz-profiles-YYYY-MM-DD.json`)
  - Only exports terminal-type bookmarks
  - Folders become categories in the profile export
  - Compatible with TabzChrome's profile import feature

**Import Options:**

- **Import Bookmarks** - Import from a TabzChrome bookmark export or Chrome bookmark export
  - Supports hierarchical folder structure
  - Detects and parses `terminal://` URLs with their settings

- **Import TabzChrome Profiles** - Import TabzChrome profile exports as terminal commands
  - Converts profiles with commands to terminal bookmarks
  - Creates folders from profile categories
  - Preserves category colors

**Import Modes:**

- **Merge** (default) - Add new items, skip duplicates by ID
- **Replace** - Replace all existing bookmarks/terminal commands with imported data

## API Reference

### useTerminalExtension Hook

Location: `hooks/useTerminalExtension.ts`

```typescript
import { useTerminalExtension } from "@/hooks/useTerminalExtension"

const {
  // Status
  available,        // boolean - Full integration available (backend + auth)
  backendRunning,   // boolean - Backend server responding
  authenticated,    // boolean - Valid API token
  error,            // string | null - Error message if any
  isLoaded,         // boolean - Initial check complete
  hasToken,         // boolean - Token stored (may not be validated)
  defaultWorkDir,   // string - Default working directory

  // Actions
  runCommand,          // Execute terminal command
  setApiToken,         // Save API token (validates first)
  clearApiToken,       // Remove stored token
  refreshStatus,       // Re-check connection status
  updateDefaultWorkDir // Set default working directory
} = useTerminalExtension()
```

**runCommand Signature:**

```typescript
runCommand(command: string, options?: {
  workingDir?: string  // Directory to run in (falls back to default)
  name?: string        // Tab/session name
}): Promise<SpawnResult>

interface SpawnResult {
  success: boolean
  error?: string
  terminal?: {
    id: string
    name: string
  }
}
```

### BookmarkItem Type

Extended to support terminal commands:

```typescript
interface BookmarkItem {
  id: string
  name: string
  url: string           // For terminals: "terminal://command"
  folderId: string | null
  icon?: string
  description?: string
  createdAt: string

  // Terminal integration
  type?: "link" | "terminal"
  command?: string      // Shell command to execute
  workingDir?: string   // Working directory

  // TabzChrome-specific (future)
  profile?: string      // Terminal profile name
  sendToChat?: boolean  // Queue in chat input instead
}
```

## REST API Reference

TabzChrome backend exposes these endpoints on `localhost:8129`:

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/health` | GET | Check if backend is running | No |
| `/api/auth/token` | GET | Get current valid API token | No |
| `/api/spawn` | POST | Spawn a new terminal session | Yes (`X-Auth-Token` header) |

**Spawn Request:**

```json
POST /api/spawn
Content-Type: application/json
X-Auth-Token: <your-token>

{
  "name": "My Terminal",
  "workingDir": "~/projects/my-app",
  "command": "npm run dev"
}
```

**Spawn Response:**

```json
{
  "success": true,
  "terminal": {
    "id": "term-123",
    "name": "My Terminal"
  }
}
```

## Selector Reference (For AI/MCP Automation)

All interactive elements have `data-tabz-*` attributes for reliable MCP tool targeting.

### Attribute Taxonomy

| Attribute | Purpose | Example Values |
|-----------|---------|----------------|
| `data-tabz-section` | Section identity | `weather`, `bookmarks`, `ai-workspace` |
| `data-tabz-action` | Action type | `navigate`, `submit-message`, `refresh-weather` |
| `data-tabz-input` | Input field purpose | `chat-message`, `weather-location`, `stock-search` |
| `data-tabz-list` | List container | `feed-items`, `conversations`, `tasks` |
| `data-tabz-item` | List item | `feed-0`, `conversation-abc123`, `task-1` |
| `data-tabz-container` | Layout container | `sidebar`, `main`, `mobile-sidebar` |
| `data-tabz-region` | Content region | `weather-alerts`, `hourly-forecast` |
| `data-tabz-command` | Terminal command | `npm run dev`, `lazygit` |
| `data-tabz-project` | Working directory | `/home/user/projects/app` |
| `data-tabz-bridge` | TabzChrome bridge element | `true` |

### Navigation (page.tsx)

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="home"][data-tabz-action="navigate"]` | Go to Home |
| `[data-tabz-section="weather"][data-tabz-action="navigate"]` | Go to Weather |
| `[data-tabz-section="bookmarks"][data-tabz-action="navigate"]` | Go to Bookmarks |
| `[data-tabz-section="ai-workspace"][data-tabz-action="navigate"]` | Go to AI Workspace |
| `[data-tabz-action="toggle-sidebar"]` | Collapse/expand sidebar |
| `[data-tabz-action="toggle-mobile-menu"]` | Open mobile menu |
| `[data-tabz-container="main"]` | Main content area |

### Weather Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="weather"]` | Weather container |
| `[data-tabz-input="weather-location"]` | Location search input |
| `[data-tabz-action="search-location"]` | Search button |
| `[data-tabz-action="select-location"]` | Location result buttons |
| `[data-tabz-action="refresh-weather"]` | Refresh weather data |
| `[data-tabz-action="set-temp-fahrenheit"]` | Set Fahrenheit |
| `[data-tabz-action="set-temp-celsius"]` | Set Celsius |
| `[data-tabz-region="weather-radar"]` | Radar display |
| `[data-tabz-region="weather-alerts"]` | Alerts section |

### Daily Feed Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="daily-feed"]` | Feed container |
| `[data-tabz-list="feed-items"]` | Feed list |
| `[data-tabz-item="feed-0"]` | First feed item (0-indexed) |
| `[data-tabz-action="refresh-feed"]` | Refresh feed |
| `[data-tabz-action="filter-all"]` | Show all sources |
| `[data-tabz-action="filter-saved"]` | Show saved items |
| `[data-tabz-action="filter-hackernews"]` | Filter to HN |
| `[data-tabz-action="filter-github"]` | Filter to GitHub |
| `[data-tabz-action="open-link"]` | Open feed item link |

### AI Workspace Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="ai-workspace"]` | Workspace container |
| `[data-tabz-input="chat-message"]` | Chat input textarea |
| `[data-tabz-action="submit-message"]` | Send message button |
| `[data-tabz-list="conversations"]` | Conversation list |
| `[data-tabz-item^="conversation-"]` | Conversation items |
| `[data-tabz-action="new-conversation"]` | New conversation button |
| `[data-tabz-input="project-selector"]` | Project dropdown |
| `[data-tabz-input="model-selector"]` | Model dropdown |
| `[data-tabz-action="open-settings"]` | Settings button |
| `[data-tabz-bridge="true"]` | TabzChrome bridge elements |

### Bookmarks Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="bookmarks"]` | Bookmarks container |
| `[data-tabz-list="bookmark-list"]` | Bookmark list |
| `[data-tabz-item^="bookmark-"]` | Bookmark items |
| `[data-tabz-action="spawn-terminal"]` | Run in terminal |
| `[data-tabz-action="send-chat"]` | Send to TabzChrome chat |
| `[data-tabz-action="paste-terminal"]` | Paste to terminal |
| `[data-tabz-command]` | Terminal command value |
| `[data-tabz-project]` | Working directory |
| `[data-terminal-command]` | Legacy terminal attribute |

### Quick Notes Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="quick-notes"]` | Notes container |
| `[data-tabz-list="notes"]` | Note list |
| `[data-tabz-input="note-editor"]` | Editor textarea |
| `[data-tabz-action="save-note"]` | Save note button |

### API Playground Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="api-playground"]` | Playground container |
| `[data-tabz-input="api-url"]` | URL input |
| `[data-tabz-input="http-method"]` | Method selector |
| `[data-tabz-input="request-body"]` | Request body textarea |
| `[data-tabz-action="send-request"]` | Send request button |

### Tasks Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="tasks"]` | Tasks container |
| `[data-tabz-list="tasks"]` | Task list |
| `[data-tabz-item^="task-"]` | Task items |
| `[data-tabz-input="new-task"]` | New task input |
| `[data-tabz-action="add-task"]` | Add task button |

### Stocks Section

| Selector | Purpose |
|----------|---------|
| `[data-tabz-section="stocks"]` | Stocks container |
| `[data-tabz-input="stock-search"]` | Stock search input |
| `[data-tabz-action="buy"]` | Buy button |
| `[data-tabz-action="sell"]` | Sell button |

### Search Hub Section (Chrome Bookmarks)

| Selector | Purpose |
|----------|---------|
| `[data-tabz-action="search-bookmarks"]` | Chrome bookmarks tab |
| `[data-tabz-input="bookmark-search"]` | Bookmark search input |
| `[data-tabz-list="bookmark-results"]` | Bookmark results container |
| `[data-tabz-item^="bookmark-"]` | Individual bookmark results |
| `[data-tabz-action="open-bookmark"]` | Open bookmark button |

### Common Automation Patterns

**Navigate to a Section:**

```python
# Click the weather navigation item
tabz_click('[data-tabz-section="weather"][data-tabz-action="navigate"]')

# Or go to AI Workspace
tabz_click('[data-tabz-section="ai-workspace"][data-tabz-action="navigate"]')
```

**Search Weather Location:**

```python
tabz_click('[data-tabz-section="weather"][data-tabz-action="navigate"]')
tabz_fill('[data-tabz-input="weather-location"]', 'Seattle, WA')
tabz_click('[data-tabz-action="search-location"]')
tabz_click('[data-tabz-action="select-location"]')  # First result
```

**Send Chat Message in AI Workspace:**

```python
tabz_click('[data-tabz-section="ai-workspace"][data-tabz-action="navigate"]')
tabz_fill('[data-tabz-input="chat-message"]', 'Explain async/await in JavaScript')
tabz_click('[data-tabz-action="submit-message"]')
```

**Run Terminal Bookmark:**

```python
tabz_click('[data-tabz-section="bookmarks"][data-tabz-action="navigate"]')
# Find and click a specific terminal command
tabz_click('[data-tabz-command="lazygit"]')
# Or by action type
tabz_click('[data-tabz-action="spawn-terminal"][data-tabz-item="bookmark-dev-server"]')
```

**Search Chrome Bookmarks:**

```python
tabz_click('[data-tabz-section="search-hub"][data-tabz-action="navigate"]')
tabz_click('[data-tabz-action="search-bookmarks"]')  # Switch to Chrome tab
tabz_fill('[data-tabz-input="bookmark-search"]', 'github')
# Results appear automatically - click first result
tabz_click('[data-tabz-item="bookmark-0"]')
```

**Add a New Task:**

```python
tabz_click('[data-tabz-section="tasks"][data-tabz-action="navigate"]')
tabz_fill('[data-tabz-input="new-task"]', 'Review pull request #42')
tabz_click('[data-tabz-action="add-task"]')
```

**Quick Terminal Spawn (Direct API):**

```python
# If you have the token, call the API directly
import requests

response = requests.post(
    'http://localhost:8129/api/spawn',
    headers={'X-Auth-Token': 'your-token'},
    json={
        'name': 'Dev Server',
        'workingDir': '~/projects/my-app',
        'command': 'npm run dev'
    }
)
```

## Configuration Options

### localStorage Keys

| Key | Purpose | Default | Example Value |
|-----|---------|---------|---------------|
| `tabz-api-token` | API authentication token | - | `abc123...` |
| `tabz-default-workdir` | Default terminal directory | `~/projects` | `~/dev` |

### Environment Variables

TabzChrome integration uses no server-side environment variables. All configuration is client-side via localStorage.

## Security Considerations

### Token Management

- API tokens are stored in browser localStorage
- Tokens are validated against the TabzChrome backend before being stored
- Invalid or expired tokens trigger re-authentication prompts
- Tokens are sanitized to remove non-ASCII characters that could break HTTP headers

### Network Access

- TabzChrome backend only runs on localhost (127.0.0.1:8129)
- From remote sites (HTTPS), initial probing is skipped to avoid browser permission prompts
- Private Network Access headers are used when explicitly saving tokens from HTTPS sites
- All spawn commands execute locally - no remote code execution

### Best Practices

1. **Don't share your API token** - It grants terminal access to your machine
2. **Review commands before running** - Terminal bookmarks can execute arbitrary commands
3. **Use specific working directories** - Avoid running commands in sensitive directories
4. **Regenerate tokens periodically** - Tokens can be refreshed from TabzChrome extension

## Adding Connectors

When building new components or sections, add `data-tabz-*` attributes to enable MCP automation.

### Attribute Guidelines

**Section Container:**
```tsx
<div data-tabz-section="my-section">
  {/* Section content */}
</div>
```

**Interactive Actions:**
```tsx
<Button
  onClick={handleAction}
  data-tabz-action="submit-form"
>
  Submit
</Button>

<Button
  onClick={() => setView('list')}
  data-tabz-action="toggle-view"
>
  List View
</Button>
```

**Input Fields:**
```tsx
<Input
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  data-tabz-input="search-query"
/>

<Select data-tabz-input="sort-order">
  <SelectItem value="asc">Ascending</SelectItem>
</Select>
```

**Lists and Items:**
```tsx
<div data-tabz-list="items">
  {items.map((item, i) => (
    <div key={item.id} data-tabz-item={`item-${i}`}>
      {item.name}
    </div>
  ))}
</div>
```

**Named Regions:**
```tsx
<Card data-tabz-region="summary">
  {/* Summary content */}
</Card>

<Card data-tabz-region="details">
  {/* Details content */}
</Card>
```

**Terminal Commands:**
```tsx
<button
  onClick={() => runCommand(item.command)}
  data-tabz-command={item.command}
  data-tabz-project={item.workingDir}
>
  Run
</button>
```

### Naming Conventions

| Attribute | Format | Examples |
|-----------|--------|----------|
| `data-tabz-section` | kebab-case | `weather`, `ai-workspace`, `stocks-dashboard` |
| `data-tabz-action` | kebab-case, verb-noun | `submit-form`, `toggle-view`, `refresh-data` |
| `data-tabz-input` | kebab-case, noun | `search-query`, `stock-symbol`, `api-key` |
| `data-tabz-list` | kebab-case, plural | `items`, `conversations`, `results` |
| `data-tabz-item` | prefix-index or prefix-id | `item-0`, `conversation-abc123` |
| `data-tabz-region` | kebab-case, noun | `header`, `sidebar`, `chart-area` |

### Complete Example

```tsx
export default function MySection() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')

  return (
    <div data-tabz-section="my-section">
      {/* Header with search */}
      <div data-tabz-region="header">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-tabz-input="search"
        />
        <Button
          onClick={handleSearch}
          data-tabz-action="search"
        >
          Search
        </Button>
        <Button
          onClick={handleRefresh}
          data-tabz-action="refresh"
        >
          Refresh
        </Button>
      </div>

      {/* Results list */}
      <div data-tabz-list="results" data-tabz-region="results">
        {items.map((item, i) => (
          <Card
            key={item.id}
            data-tabz-item={`result-${i}`}
            onClick={() => handleSelect(item)}
            data-tabz-action="select-item"
          >
            {item.title}
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### Tips

1. **Be specific**: Use `data-tabz-action="refresh-weather"` over generic `data-tabz-action="refresh"`
2. **Combine attributes**: Elements can have multiple attributes (e.g., both `data-tabz-item` and `data-tabz-action`)
3. **Use regions**: Group related elements with `data-tabz-region` for easier targeting
4. **Index items**: For lists, use consistent indexing (`item-0`, `item-1`) for automation
5. **Document selectors**: Add new selectors to this file's Selector Reference section

## Troubleshooting

### Connection Issues

**Backend Not Running:**
```
Error: TabzChrome backend not running. Start the backend on localhost:8129
```
- Ensure TabzChrome extension is installed and enabled
- Check that the backend process is running
- Restart Chrome if needed

**Token Invalid:**
```
Error: API token expired. Copy a fresh token from TabzChrome extension Settings > API Token
```
- TabzChrome generates new tokens periodically
- Copy a fresh token from extension settings
- Clear old token and re-authenticate

**Network/CORS Errors:**
- TabzChrome backend includes CORS headers for localhost
- For remote sites, use explicit token entry (not auto-detection)
- Check browser console for specific error messages

### Commands Not Executing

**Terminal Not Spawned:**
- Verify backend is running (check Profile > TabzChrome Terminal status)
- Ensure working directory exists
- Check TabzChrome extension logs (chrome://extensions > TabzChrome > Errors)

**Wrong Directory:**
- Explicit `workingDir` in bookmark overrides default
- Check if path uses `~` expansion correctly
- Verify directory path exists on your system

### Debugging

Enable console logging for detailed debugging:

```javascript
// In browser console
localStorage.setItem('debug', 'tabz:*')
```

Check the browser console for `[useTerminalExtension]` prefixed messages.

## File Locations

| File | Purpose |
|------|---------|
| `hooks/useTerminalExtension.ts` | TabzChrome integration hook |
| `app/sections/profile.tsx` | TabzChrome configuration UI |
| `app/sections/bookmarks.tsx` | Terminal bookmark UI |
| `docs/terminal-integration.md` | Original terminal bookmark docs (superseded) |

## Related Documentation

- [Terminal Integration](terminal-integration.md) - Original terminal bookmark documentation
- [Navigation](navigation.md) - Sidebar navigation system
- [Auth](auth.md) - Authentication system (separate from TabzChrome)
