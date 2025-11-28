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
}

export interface ChatRequest {
  messages: ChatMessage[]
  backend: 'claude' | 'docker' | 'mock'
  model?: string
  settings?: ChatSettings
  stream?: boolean
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
