# AI Workspace

Live JSONL session viewer for Claude CLI sessions running in external terminals.

## Files
- `app/sections/ai-workspace.tsx` - Main component (session browser + viewer)
- `app/api/ai/sessions/route.ts` - List sessions (GET), spawn Kitty sessions (POST), send prompt to terminal (PUT)
- `app/api/ai/sessions/active/route.ts` - Detect active sessions via `kitty @ ls`
- `app/api/ai/stream/route.ts` - SSE endpoint tailing JSONL files
- `lib/ai/jsonl-parser.ts` - Parses JSONL entries into typed messages
- `components/ai/ConversationViewer.tsx` - Renders messages with collapsible blocks
- `hooks/useSessionStream.ts` - Client hook for SSE stream consumption

## Features
- **Session browser**: Lists all `.jsonl` sessions from `~/.claude/projects/`, grouped by project or recent
- **Live streaming**: Watches active session files via offset-based SSE polling (500ms)
- **Active session detection**: Polls `kitty @ ls` every 10s to find windows running Claude. Active sessions show a pulsing green dot and can be filtered with the Zap toggle button.
- **Send to terminal**: Input below the viewer sends prompts to the selected session's Kitty window via `kitty @ send-text`. Matches by window title (`claude-{sessionId prefix}`) or by cwd + claude process.
- **Rich rendering**:
  - User/assistant message display
  - Collapsible thinking blocks
  - Collapsible tool use/result blocks with category coloring
  - Code block extraction with syntax detection
  - Auto-scroll during streaming with pulsing indicator
- **New session**: Spawns a detached Kitty window running `claude --session-id <uuid>`
- **Session metadata**: Shows file size, last modified time, context window %, message count

## Architecture

The viewer watches Claude CLI sessions running in Kitty terminals, rendering conversations in real-time. Users can also send prompts back to active terminals.

```
Reading (live viewer):
~/.claude/projects/{path}/{session-id}.jsonl  ← Claude CLI writes here
         ↓
app/api/ai/stream/route.ts                    ← SSE polls file, sends new entries
         ↓
hooks/useSessionStream.ts                     ← Client batches updates (500ms throttle)
         ↓
components/ai/ConversationViewer.tsx           ← Renders messages

Writing (send to terminal):
User types prompt → PUT /api/ai/sessions → kitty @ send-text → Kitty window

Active detection:
GET /api/ai/sessions/active → kitty @ ls → find windows with claude process
  Matches session by title prefix (claude-XXXXXXXX) from spawned sessions
  Falls back to cwd + foreground process matching for externally started sessions
```

## AI Drawer (Sidebar)

The AI Drawer (`components/ai/AIDrawer.tsx`) is a separate system that provides a chat interface using `claude --print` mode. It uses `hooks/useAIChat.ts` and `app/api/ai/chat/route.ts`. Select the model from the dropdown in the drawer settings (defaults to first available non-mock backend).

## TabzChrome Selectors
- `data-tabz-section="ai-workspace"` - Container

## Configuration
No API keys required — reads JSONL files from Claude CLI sessions using your existing subscription.
