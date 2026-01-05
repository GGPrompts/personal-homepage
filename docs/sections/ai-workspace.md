# AI Workspace

Multi-model AI chat interface with project context.

## Files
- `app/sections/ai-workspace.tsx` - Main component
- `lib/ai-workspace.ts` - Types and utilities
- `app/api/chat/route.ts` - Chat API proxy

## Features
- Multiple AI backends:
  - Claude (Sonnet, Opus, Haiku)
  - OpenAI GPT-4
  - OpenRouter models
- Conversation management:
  - Create/rename/delete
  - Export to markdown
  - Pin conversations
- Project context:
  - Attach local project
  - Include codebase context
- Tool use display
- Token counting
- Suggested prompts
- Settings per conversation:
  - Model selection
  - Temperature
  - Max tokens
- Streaming responses

## Integration
- **Auth**: API keys in Settings
- **Projects**: Context from Projects Dashboard
- **TabzChrome**: Bi-directional messaging

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
API keys required in Settings:
- `anthropic-api-key` - Claude
- `openai-api-key` - GPT models
- `openrouter-api-key` - OpenRouter
