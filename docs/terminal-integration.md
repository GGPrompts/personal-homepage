# Terminal Integration

The homepage supports terminal bookmarks that run commands in the browser's sidebar terminal via the TabzChrome extension.

## Overview

Terminal bookmarks allow you to save and quickly execute shell commands directly from the bookmarks section. When clicked, commands are sent to the TabzChrome Chrome extension which spawns them in a terminal panel.

## Requirements

- **Chrome browser** with TabzChrome-simplified extension installed
- Extension must be configured with `externally_connectable` for your homepage URL

## Setup

### 1. Install TabzChrome Extension

Load the TabzChrome-simplified extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the extension directory
4. Copy the extension ID (shown under the extension name)

### 2. Configure Extension ID

The homepage needs the extension ID to communicate with it:
1. Open the homepage
2. The extension ID is stored in localStorage key `terminal-extension-id`
3. Set it manually in browser dev tools:
   ```javascript
   localStorage.setItem('terminal-extension-id', 'YOUR_EXTENSION_ID')
   ```
4. Refresh the page

Once configured, the homepage will auto-detect the extension on load.

## Usage

### Creating Terminal Bookmarks

1. Go to **Bookmarks** section
2. Click **Add** button
3. If the extension is detected, you'll see a **Type** selector:
   - **Link** - Standard URL bookmark
   - **Terminal** - Command to run in terminal
4. For terminal type, enter:
   - **Name** - Display name (e.g., "LazyGit")
   - **Command** - Shell command to run (e.g., `lazygit`)
   - **Working Directory** (optional) - Path to cd to before running

### Running Commands

- **Click** a terminal bookmark to execute it immediately
- **Right-click** for context menu:
  - Run in Terminal
  - Copy Command
  - Edit / Delete

### Visual Indicators

Terminal bookmarks are styled differently from regular bookmarks:
- Green background tint (`bg-emerald-500/20`)
- Green border (`border-emerald-500/30`)
- Terminal icon (or custom emoji)
- Play icon when extension is available

## Architecture

### Hook: `useTerminalExtension`

Location: `hooks/useTerminalExtension.ts`

```typescript
const { available, version, extensionId, runCommand, setExtensionId, clearExtensionId } = useTerminalExtension()
```

**Returns:**
| Property | Type | Description |
|----------|------|-------------|
| `available` | `boolean` | Whether extension is detected and responding |
| `version` | `string \| null` | Extension version if available |
| `extensionId` | `string \| null` | Configured extension ID |
| `isLoaded` | `boolean` | Whether initial check is complete |
| `runCommand` | `function` | Execute a command in terminal |
| `setExtensionId` | `function` | Configure extension ID |
| `clearExtensionId` | `function` | Remove stored extension ID |

**runCommand signature:**
```typescript
runCommand(command: string, options?: {
  workingDir?: string  // Directory to run in
  name?: string        // Tab/session name
}): Promise<boolean>
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
}
```

### Chrome Extension Communication

Uses Chrome's `externally_connectable` messaging:

```typescript
// Ping to check availability
chrome.runtime.sendMessage(extensionId, { type: "PING" }, (response) => {
  // response: { ok: true, version: "1.0.0" }
})

// Spawn terminal
chrome.runtime.sendMessage(extensionId, {
  type: "SPAWN_TERMINAL",
  command: "lazygit",
  workingDir: "~/projects",
  name: "LazyGit"
}, (response) => {
  // response: { ok: true }
})
```

### Extension Manifest Requirements

The TabzChrome extension must include:

```json
{
  "externally_connectable": {
    "matches": [
      "http://localhost:*/*",
      "https://*.vercel.app/*"
    ]
  }
}
```

And handle external messages:

```javascript
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version })
  } else if (message.type === "SPAWN_TERMINAL") {
    // Spawn terminal with message.command, message.workingDir, message.name
    sendResponse({ ok: true })
  }
})
```

## Conditional UI

The type selector (Link/Terminal) only appears when the extension is detected:

```typescript
const { available: terminalAvailable } = useTerminalExtension()

// In JSX:
{terminalAvailable && (
  <div>
    <label>Type</label>
    <Button onClick={() => setFormType("link")}>Link</Button>
    <Button onClick={() => setFormType("terminal")}>Terminal</Button>
  </div>
)}
```

This prevents users from creating terminal bookmarks they can't use.

## Storage

| Key | Location | Purpose |
|-----|----------|---------|
| `terminal-extension-id` | localStorage | Chrome extension ID |
| Bookmarks with `type: "terminal"` | GitHub repo | Synced terminal commands |

## File Locations

| File | Purpose |
|------|---------|
| `hooks/useTerminalExtension.ts` | Extension communication hook |
| `app/sections/bookmarks.tsx` | Bookmark UI with terminal support |
