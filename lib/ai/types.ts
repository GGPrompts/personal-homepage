/**
 * Shared types for AI integrations
 */

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: MessageRole
  content: string
}

export interface ChatSettings {
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  // Claude CLI specific options
  additionalDirs?: string[]  // --add-dir
  claudeModel?: string  // --model (sonnet, opus, haiku, or full model name)
  allowedTools?: string[]  // --allowed-tools
  disallowedTools?: string[]  // --disallowed-tools
  permissionMode?: 'acceptEdits' | 'bypassPermissions' | 'default' | 'plan'  // --permission-mode
}

export interface ChatRequest {
  messages: ChatMessage[]
  backend: 'claude' | 'docker' | 'mock'
  model?: string
  settings?: ChatSettings
  stream?: boolean
  cwd?: string  // Working directory for Claude CLI (project path)
}

export interface Model {
  id: string
  name: string
  backend: 'claude' | 'docker' | 'mock'
  description?: string
}

export interface StreamChunk {
  content: string
  done: boolean
  error?: string
}
