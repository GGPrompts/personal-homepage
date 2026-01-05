# Quick Notes

GitHub-synced markdown editor with file tree navigation.

## Files
- `app/sections/quick-notes.tsx` - Main component
- `lib/github.ts` - GitHub API helpers

## Features
- File tree navigation
- Markdown editing with preview
- Auto-save with debounce (2s)
- Create/delete files and folders
- Syntax highlighting in preview
- GitHub sync on save
- Local caching for offline

## Integration
- **Auth**: Requires GitHub OAuth via Supabase
- **Storage**: GitHub repository (configurable in Profile)
- **Cache**: localStorage with file content and metadata

## TabzChrome Selectors
- `data-tabz-section="quick-notes"` - Container
- `data-tabz-action="create-file"` - New file
- `data-tabz-action="create-folder"` - New folder
- `data-tabz-action="save-file"` - Manual save
- `data-tabz-action="delete-file"` - Delete
- `data-tabz-action="toggle-preview"` - Preview mode
- `data-tabz-input="file-content"` - Editor
- `data-tabz-list="file-tree"` - File browser
- `data-tabz-item="file"` - File item
- `data-tabz-item="folder"` - Folder item

## Configuration
Set notes repository in Profile section or Settings > API Keys.
