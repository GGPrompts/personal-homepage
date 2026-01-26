# Analytics

Claude Code usage statistics dashboard with token tracking, session monitoring, and tool usage insights.

## Files
- `app/sections/analytics.tsx` - Main component
- `app/api/claude-stats/route.ts` - Stats API proxy

## Features
- Daily token usage chart (7/14/30 day views)
- Input vs output token breakdown
- Cache savings tracking
- Session statistics (total, active, messages)
- Model usage breakdown by Claude model
- Tool usage distribution (Edit, Read, Bash, Grep, Write)
- Session list with status indicators
- Expandable session details (duration, tokens, messages, tool calls)
- Trend comparison (vs previous period)
- Demo mode fallback when real data unavailable

## Data Sources
- **Primary**: Claude Code stats cache (`~/.claude/stats-cache.json`)
- **Fallback**: Demo data generator for testing

The stats cache is populated by running `/stats` in Claude Code. The API reads this file and transforms it for dashboard display.

## Stats Tracked
- **Daily Token Usage**: Input/output tokens per day with cache metrics
- **Model Usage**: Per-model breakdown (input, output, cache read, cache creation, web searches)
- **Daily Activity**: Messages, sessions, and tool calls per day
- **Session Metrics**: Total sessions, total messages, first session date
- **Hour Distribution**: Activity by hour of day (when available)

## TabzChrome Selectors
- `data-tabz-section="analytics"` - Container

## State
- Analytics data in localStorage (`claude-analytics`)
- Time range selection (7d/14d/30d)
- Expanded session tracking

## Configuration
No API keys required. Data is read from the local Claude Code installation.

To populate statistics:
1. Use Claude Code normally
2. Run `/stats` in a Claude Code session to generate the cache
3. Refresh the Analytics section to load real data

## Session Statuses
- **Active** (green, pulsing) - Currently running session
- **Paused** (yellow) - Session on hold
- **Completed** (blue) - Finished session
- **Error** (red) - Session with errors

## Chart Display
The token usage chart shows stacked bars:
- **Blue** - Input tokens
- **Green** - Output tokens

Hover over bars for detailed tooltips showing exact token counts.
