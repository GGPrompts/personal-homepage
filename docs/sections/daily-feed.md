# Daily Feed

Aggregated content feed from developer-focused sources.

## Files
- `app/sections/daily-feed.tsx` - Main component
- `app/api/feed/route.ts` - Feed aggregation API

## Features
- 5 sources: Hacker News, GitHub, Reddit, Lobsters, Dev.to
- Sort options: Trending, Newest, Top
- Multi-select source filtering
- Save/bookmark items
- Hide items
- Custom subreddits configuration
- 15-minute server-side caching

## APIs
- Hacker News API (stories)
- GitHub trending (scraped)
- Reddit JSON API
- Lobste.rs API
- Dev.to API

## TabzChrome Selectors
- `data-tabz-section="daily-feed"` - Container
- `data-tabz-action="refresh-feed"` - Refresh button
- `data-tabz-action="toggle-source"` - Source filter toggle
- `data-tabz-action="change-sort"` - Sort selector
- `data-tabz-action="save-item"` - Bookmark item
- `data-tabz-action="hide-item"` - Hide item
- `data-tabz-list="feed-items"` - Feed list
- `data-tabz-item="feed-item"` - Individual item

## State
- TanStack Query for caching (15 min)
- localStorage for saved/hidden items
