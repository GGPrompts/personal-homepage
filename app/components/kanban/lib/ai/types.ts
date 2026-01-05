/**
 * AI Chat Types for Claude CLI Integration
 */

// Content block types from Claude CLI stream-json
export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock

export interface ClaudeUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

export interface ClaudeStreamEvent {
  type: 'system' | 'assistant' | 'result' | 'error' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_start' | 'message_stop'
  subtype?: string
  session_id?: string
  message?: {
    content: ContentBlock[]
  }
  index?: number
  content_block?: ContentBlock
  result?: string
  is_error?: boolean
  usage?: ClaudeUsage
  delta?: {
    type: 'text_delta' | 'input_json_delta'
    text?: string
    partial_json?: string
  }
  error?: {
    type: string
    message: string
  }
}

// Stream chunk types for the client
export interface StreamChunk {
  type: 'text' | 'tool_start' | 'tool_input' | 'tool_end' | 'heartbeat' | 'error' | 'done'
  content?: string
  tool?: {
    id: string
    name: string
    input?: string
  }
  error?: string
  sessionId?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    totalTokens: number
  }
}

export interface ClaudeStreamResult {
  stream: ReadableStream<string>
  getSessionId: () => string | null
}

// Chat message for API requests
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Per-task Claude settings
export interface ClaudeSettings {
  // System prompt
  systemPrompt?: string

  // Model selection
  model?: string

  // Agent (from ~/.claude/agents/)
  agent?: string

  // Working directory for task context
  workingDir?: string

  // Additional directories to include
  additionalDirs?: string[]

  // Permission mode: bypassPermissions, plan, default
  permissionMode?: 'bypassPermissions' | 'plan' | 'default'

  // Tool permissions
  allowedTools?: string[]
  disallowedTools?: string[]
}

// API request types
export interface ChatRequest {
  messages: ChatMessage[]
  settings?: ClaudeSettings
  sessionId?: string  // For multi-turn conversations
  taskId?: string     // For tracking
}

// Available Claude agents (will be populated from filesystem)
export interface ClaudeAgent {
  name: string
  description?: string
  path: string
}
