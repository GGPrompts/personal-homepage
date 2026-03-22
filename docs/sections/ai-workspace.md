# AI Workspace

Live JSONL session viewer for Claude CLI sessions running in external terminals.

## Files
- `app/sections/ai-workspace.tsx` - Main component (session browser + viewer)
- `app/api/ai/sessions/route.ts` - List sessions, spawn new tmux+claude sessions
- `app/api/ai/stream/route.ts` - SSE endpoint tailing JSONL files
- `lib/ai/jsonl-parser.ts` - Parses JSONL entries into typed messages
- `components/ai/ConversationViewer.tsx` - Renders messages with collapsible blocks
- `hooks/useSessionStream.ts` - Client hook for SSE stream consumption

## Features
- **Session browser**: Lists all `.jsonl` sessions from `~/.claude/projects/`, grouped by project
- **Live streaming**: Watches active session files via offset-based SSE polling (500ms)
- **Rich rendering**:
  - User/assistant message display
  - Collapsible thinking blocks
  - Collapsible tool use/result blocks with category coloring
  - Code block extraction with syntax detection
  - Auto-scroll during streaming with pulsing indicator
- **New session**: Spawns a detached tmux session running `claude --session-id <uuid>`
- **Session metadata**: Shows file size, last modified time, message count

## Architecture

The viewer is read-only — users interact with Claude in their terminal, and the web UI renders the conversation in real-time.

```
~/.claude/projects/{path}/{session-id}.jsonl  ← Claude CLI writes here
         ↓
app/api/ai/stream/route.ts                    ← SSE polls file, sends new entries
         ↓
hooks/useSessionStream.ts                     ← Client batches updates (500ms throttle)
         ↓
components/ai/ConversationViewer.tsx           ← Renders messages
```

## AI Drawer (Sidebar)

The AI Drawer (`components/ai/AIDrawer.tsx`) is a separate system that provides a chat interface using `claude --print` mode. It uses `hooks/useAIChat.ts` and `app/api/ai/chat/route.ts`. Select the model from the dropdown in the drawer settings (defaults to first available non-mock backend).

## TabzChrome Selectors
- `data-tabz-section="ai-workspace"` - Container

## Configuration
No API keys required — reads JSONL files from Claude CLI sessions using your existing subscription.
