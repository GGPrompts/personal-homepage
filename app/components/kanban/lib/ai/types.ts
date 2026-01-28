/**
 * AI Chat Types for Claude CLI Integration
 * Re-exports common types from @/lib/ai/types and adds kanban-specific types
 */

// Re-export common types from the single source of truth
export type {
  ChatMessage,
  ClaudeStreamEvent,
  ClaudeStreamResult,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,
  ClaudeUsage,
  ClaudeRawStreamEvent,
  TokenUsage,
} from '@/lib/ai/types'

// Import for local use
import type { ClaudeSettings as BaseClaudeSettings } from '@/lib/ai/types'

// ============================================================================
// KANBAN-SPECIFIC STREAM CHUNK
// (Extends base StreamChunk with usage info for kanban UI)
// ============================================================================

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

// ============================================================================
// KANBAN-SPECIFIC CLAUDE SETTINGS
// (Per-task settings, subset of full ClaudeSettings)
// ============================================================================

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

// ============================================================================
// KANBAN CHAT REQUEST
// (Simplified request for task chat)
// ============================================================================

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  settings?: ClaudeSettings
  sessionId?: string  // For multi-turn conversations
  taskId?: string     // For tracking
}

// ============================================================================
// CLAUDE AGENT DEFINITION
// ============================================================================

/** Available Claude agents (will be populated from filesystem) */
export interface ClaudeAgent {
  name: string
  description?: string
  path: string
}
