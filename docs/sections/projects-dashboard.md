# Projects Dashboard

Local project management with git status and Claude integration.

## Files
- `app/sections/projects-dashboard.tsx` - Main component
- `lib/projects.ts` - Project types and helpers
- `hooks/useProjectMeta.ts` - Project metadata hooks
- `app/api/projects/route.ts` - Local projects API

## Features
- TanStack Table with sorting/filtering
- Project list from local directories
- Git status per project (branch, dirty state)
- Pin favorite projects
- Column visibility toggle
- Actions per project:
  - Open in terminal (TabzChrome)
  - Open in VS Code
  - Copy path
  - Run Claude Code
- Batch operations
- Project details modal
- GitHub repository linking

## Integration
- **TabzChrome**: Terminal spawning, Claude Code launch
- **GitHub**: Link local projects to repos
- **Local**: Scans configured project directories

## TabzChrome Selectors
- `data-tabz-section="projects"` - Container
- `data-tabz-input="search"` - Filter input
- `data-tabz-action="refresh-projects"` - Rescan
- `data-tabz-action="open-terminal"` - Open in terminal
- `data-tabz-action="open-vscode"` - Open in VS Code
- `data-tabz-action="run-claude"` - Start Claude Code
- `data-tabz-action="pin-project"` - Pin/unpin
- `data-tabz-action="toggle-column"` - Show/hide column
- `data-tabz-list="projects"` - Project table
- `data-tabz-item="project"` - Table row

## State
- Pinned projects in localStorage
- Column visibility in localStorage
- TanStack Query for project list
