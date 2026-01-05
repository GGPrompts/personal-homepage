# Search Hub

Multi-engine search with AI chat and Chrome bookmark search.

## Files
- `app/sections/search-hub.tsx` - Main component
- `hooks/useTabzBookmarks.ts` - Chrome bookmark integration

## Features
- Multiple search engines:
  - Web: Google, DuckDuckGo
  - Dev: GitHub, Stack Overflow, npm, MDN, YouTube
  - AI: ChatGPT, Claude, Perplexity
  - Image: Midjourney, DALL-E, Stable Diffusion
- Keyboard shortcuts (e.g., `g:` for Google)
- Chrome bookmarks search (via TabzChrome)
- Quick action buttons per engine

## Categories
- **search** - Traditional web search
- **ai** - AI assistants
- **image** - AI image generation
- **bookmarks** - Chrome bookmarks

## Integration
- **TabzChrome**: Chrome bookmark search via MCP
- Opens searches in new browser tabs

## TabzChrome Selectors
- `data-tabz-section="search-hub"` - Container
- `data-tabz-input="search"` - Main search input
- `data-tabz-action="search-engine"` - Engine selector
- `data-tabz-action="quick-search"` - Engine quick button
- `data-tabz-list="bookmarks"` - Chrome bookmark results
- `data-tabz-item="bookmark"` - Bookmark result

## State
- Recent searches in localStorage
