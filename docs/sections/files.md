# Files

File browser with tree navigation, syntax-highlighted content viewer, and plugin management sidebar.

## Files
- `app/sections/files.tsx` - Main section component
- `app/components/files/FileTree.tsx` - Local file tree navigation
- `app/components/files/FileViewer.tsx` - Content viewer with tabs
- `app/components/files/PluginList.tsx` - Plugin browser sidebar
- `app/components/files/GitHubFileTree.tsx` - GitHub repository browser
- `app/components/files/GitHubFileViewer.tsx` - GitHub file viewer
- `app/contexts/FilesContext.tsx` - Shared state management

## Features
- Tree view for local file system navigation
- GitHub repository file browsing
- Syntax-highlighted code viewer
- Image viewer with zoom/rotate/download
- Video player for media files
- CSV table viewer
- Markdown rendering
- JSON formatting
- Git status indicators (staged/modified/untracked)
- Breadcrumb navigation
- Keyboard navigation (arrow keys, Enter)
- Drag-and-drop file paths
- Expand/collapse all directories
- File pinning (preview vs pinned tabs)
- Plugin management sidebar

## File Sources

Toggle between two sources in the left sidebar:

### Local Files
- Navigates the local filesystem starting from working directory
- Shows git status with color-coded indicators
- Breadcrumb navigation for quick directory jumps
- Lazy loading of directory contents on expand

### GitHub Files
- Browse any GitHub repository
- Requires GitHub OAuth authentication
- Repository selector from user's repos
- View and navigate remote file contents

## File Viewer

The central content area displays file contents based on type:

| File Type | Viewer | Features |
|-----------|--------|----------|
| Code | Syntax highlighter | Line numbers, language detection |
| Markdown | Rendered view | Headers, links, code blocks |
| JSON | Formatted view | Pretty-printed with highlighting |
| CSV | Table view | Headers, row/column counts |
| Images | Image viewer | Zoom, rotate, download |
| Video | Video player | Native controls |
| Prompty | Prompty viewer | AI prompt template rendering |

### Tab System
- **Preview tabs** (italic): Single-click opens preview, replaced by next file
- **Pinned tabs**: Double-click or explicit pin to keep open
- Multiple pinned tabs supported
- Close button on hover

### Text-to-Speech
Code, markdown, CSV, and text files include a TTS button (speaker icon) to read content aloud via TabzChrome integration.

## Plugin Sidebar

Right panel showing installed Claude Code plugins:

### Plugin Display
- Grouped by marketplace
- Component type badges (Skill, Agent, Command, Hook, MCP)
- Enable/disable toggle per plugin
- Expandable file lists for multi-file plugins
- Click to open plugin files in viewer

### Filtering
- All/Enabled/Disabled status filter
- Component type filter (skills, agents, commands, hooks, mcp)
- Scope filter (User, Project, Local)
- Text search by plugin name

### Health Check
- Outdated plugin detection
- Update single or all plugins
- Cache statistics and pruning
- Shows version SHA changes

## Git Status Indicators

Files and folders show git status:

| Color | Status |
|-------|--------|
| Blue dot | Staged for commit |
| Yellow dot | Modified |
| Green dot | Untracked |

Folders show softer indicators when containing changed files.

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/files/tree` | Get directory tree structure |
| `/api/files/content` | Read file contents |
| `/api/files/image` | Get image as data URI |
| `/api/files/video` | Get video as data URI |
| `/api/files/audio` | Get audio as data URI |
| `/api/files/git-status` | Get git status for directory |
| `/api/files/list` | Get filtered file lists (by type) |
| `/api/files/write` | Write file contents |
| `/api/plugins` | List installed plugins |
| `/api/plugins/toggle` | Enable/disable plugin |
| `/api/plugins/health` | Check plugin versions |
| `/api/plugins/update` | Update single plugin |
| `/api/plugins/update-all` | Update all outdated plugins |
| `/api/plugins/cache/prune` | Clean old plugin cache |

## Configuration

Working directory is shared via `useWorkingDirectory` hook:
- Set from Projects section when opening a project
- Persisted in localStorage
- Controls FileTree root path

Plugin sidebar visibility persists per session (toggle button in viewer header).

## Integration
- **Auth**: GitHub OAuth for remote file browsing
- **Working Directory**: Shared context for project-aware file browsing
- **TabzChrome**: TTS reading, file path drag-drop
- **Terminal Hyperlinks**: Direct file opening via URL hash

## TabzChrome Selectors
- `data-tabz-section="files"` - Container
- `data-tabz-action="source-local"` - Local files tab
- `data-tabz-action="source-github"` - GitHub files tab
- `data-tabz-action="toggle-plugins"` - Plugin sidebar toggle
- `data-tabz-action="close-file-tab"` - Close file tab
- `data-tabz-action="read-aloud"` - TTS button
- `data-tabz-region="code-viewer"` - Code viewer area
- `data-tabz-region="image-viewer"` - Image viewer area
- `data-tabz-region="video-viewer"` - Video viewer area
- `data-tabz-region="markdown-viewer"` - Markdown viewer area
- `data-tabz-region="csv-viewer"` - CSV viewer area
- `data-tabz-region="file-viewer"` - Main file viewer
- `data-tabz-item="file-tab"` - File tab
- `data-tabz-file` - File path attribute on tabs
- `data-tabz-list="file-tabs"` - Tab bar

## URL Hash Navigation

Files can be opened directly via URL hash:
```
#/files?path=/path/to/file.tsx
#/files?path=/path/to/dir&dir=true
```

This enables terminal hyperlink integration and cross-section navigation.
