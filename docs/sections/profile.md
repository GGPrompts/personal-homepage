# Profile

User authentication and service configuration.

## Files
- `app/sections/profile.tsx` - Main component
- `components/AuthProvider.tsx` - Auth context
- `components/AuthModal.tsx` - Login modal
- `components/RepoSelector.tsx` - GitHub repo picker
- `hooks/useTerminalExtension.ts` - Terminal backend status (TabzChrome + Native Kitty)

## Features
- GitHub OAuth login (Supabase)
- User profile display
- Sync status:
  - Quick Notes repo
  - Bookmarks repo
  - Last sync times
- Terminal backend configuration:
  - Backend selector (Native Kitty vs TabzChrome)
  - Native: Kitty terminal ready status
  - TabzChrome: API token setup, connection status
  - Default working directory (shared between backends)
- Sign out

## Integration
- **Supabase**: GitHub OAuth provider
- **Terminal**: Native Kitty backend (`/api/terminal`) or TabzChrome

## TabzChrome Selectors
- `data-tabz-section="profile"` - Container
- `data-tabz-action="sign-in"` - Login button
- `data-tabz-action="sign-out"` - Logout
- `data-tabz-action="select-notes-repo"` - Notes repo picker
- `data-tabz-action="select-bookmarks-repo"` - Bookmarks repo picker
- `data-tabz-action="save-tabz-token"` - Save API token
- `data-tabz-action="clear-tabz-token"` - Remove token
- `data-tabz-action="refresh-tabz-status"` - Check connection
- `data-tabz-input="tabz-token"` - Token input
- `data-tabz-input="default-workdir"` - Working directory
- `data-tabz-region="sync-status"` - Sync information
- `data-tabz-region="tabz-config"` - TabzChrome card

## Configuration
Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
