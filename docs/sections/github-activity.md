# GitHub Activity

Personal GitHub events and repository overview.

## Files
- `app/sections/github-activity.tsx` - Main component

## Features
- Recent activity feed (events)
- Event types:
  - Push events with commits
  - Pull request actions
  - Issue comments
  - Repository stars/forks
  - Releases
- Repository list with stats
- Search filtering
- Expandable event details
- Auto-refresh

## Integration
- **Auth**: Requires GitHub OAuth via Supabase
- Uses authenticated GitHub API for private activity

## TabzChrome Selectors
- `data-tabz-section="github-activity"` - Container
- `data-tabz-input="search"` - Search filter
- `data-tabz-action="refresh-activity"` - Refresh
- `data-tabz-action="view-event"` - Expand event
- `data-tabz-action="view-repo"` - Open on GitHub
- `data-tabz-region="events"` - Activity feed
- `data-tabz-region="repos"` - Repository list
- `data-tabz-list="events"` - Event list
- `data-tabz-item="event"` - Individual event

## State
- TanStack Query for caching
