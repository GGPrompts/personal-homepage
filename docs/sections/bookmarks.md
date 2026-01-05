# Bookmarks

Links and terminal commands with GitHub sync and TabzChrome integration.

## Files
- `app/sections/bookmarks.tsx` - Main component
- `lib/tabz-import-export.ts` - TabzChrome format conversion
- `hooks/useTerminalExtension.ts` - Terminal spawning

## Features
- Regular URL bookmarks
- Terminal command bookmarks (TabzChrome)
- Folder organization
- Grid/list view toggle
- Search filtering
- Drag-drop reordering
- Context menu actions
- Import/export (TabzChrome, Chrome formats)
- GitHub sync

## Terminal Bookmarks
When TabzChrome is connected:
- Create terminal-type bookmarks
- Click to execute in new terminal
- Set working directory per command
- Green styling for terminal items

## Integration
- **Auth**: GitHub OAuth for sync
- **TabzChrome**: Terminal spawning via `useTerminalExtension`
- **Storage**: GitHub repo + localStorage cache

## TabzChrome Selectors
- `data-tabz-section="bookmarks"` - Container
- `data-tabz-action="add-bookmark"` - Add button
- `data-tabz-action="create-folder"` - New folder
- `data-tabz-action="search"` - Search
- `data-tabz-action="toggle-view"` - Grid/list toggle
- `data-tabz-action="run-command"` - Execute terminal bookmark
- `data-tabz-input="search"` - Search input
- `data-tabz-list="bookmarks"` - Bookmark grid/list
- `data-tabz-item="bookmark"` - Bookmark item
- `data-tabz-command` - Terminal command identifier
- `data-tabz-project` - Associated project path
