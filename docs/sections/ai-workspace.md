# AI Workspace

Multi-model AI chat interface with project context, powered by CLI tools.

## Files
- `app/sections/ai-workspace.tsx` - Main component
- `lib/ai-workspace.ts` - Types and utilities
- `hooks/useAIChat.ts` - Chat state management
- `app/api/ai/chat/route.ts` - Chat API (routes to CLI backends)

## Features
- **CLI-based backends** (subscription-based, no API keys):
  - Claude Code CLI (Sonnet, Opus, Haiku) - full tool use, JSONL persistence
  - Codex CLI (OpenAI)
  - Gemini CLI
  - Docker models (for local experimentation)
- Conversation management:
  - Persistent JSONL storage (Claude backend)
  - Create/rename/delete
  - Export to markdown
- Project context:
  - Attach local project as working directory
  - Include codebase context
- Tool use display with real-time status
- **Accurate token tracking** via Claude CLI usage data:
  - Cumulative context tracking across messages
  - Input/output/cache token breakdown
  - Real-time context percentage indicator
  - Automatic fallback to estimation for non-Claude backends
- Agent system with specialized prompts
- Streaming responses

## Integration
- **Projects**: Working directory context from Projects Dashboard
- **TabzChrome**: Bi-directional messaging
- **Agents**: Specialized AI personas from `agents/` directory

## TabzChrome Selectors
- `data-tabz-section="ai-workspace"` - Container
- `data-tabz-input="message"` - Chat input
- `data-tabz-action="send"` - Send message
- `data-tabz-action="new-conversation"` - Create new
- `data-tabz-action="select-conversation"` - Switch
- `data-tabz-action="delete-conversation"` - Remove
- `data-tabz-action="export-conversation"` - Export MD
- `data-tabz-action="change-model"` - Model selector
- `data-tabz-action="attach-project"` - Add context
- `data-tabz-list="conversations"` - Sidebar list
- `data-tabz-list="messages"` - Message thread

## Configuration
No API keys required - uses CLI tools with your existing subscriptions:
- **Claude**: Requires Claude Code CLI (`claude`) and Claude Max/Pro subscription
- **Codex**: Requires Codex CLI (`codex`)
- **Gemini**: Requires Gemini CLI (`gemini`)
- **Docker**: Local models via Docker Desktop (temperature/system prompt configurable)
