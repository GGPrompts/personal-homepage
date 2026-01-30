/**
 * Conversation Storage (Simplified)
 *
 * Basic JSONL storage for AI conversations.
 * Multi-model context building has been archived - see _archived/conversation-multimodel.ts
 *
 * Claude sessions are primarily persisted by Claude CLI itself at:
 *   ~/.claude/projects/{path}/{session-id}.jsonl
 *
 * This file provides a lightweight server-side backup and API for non-Claude backends.
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types
// ============================================================================

export type ModelId = 'claude' | 'gemini' | 'codex' | 'docker'

export interface ConversationMessage {
  id: string
  ts: number
  role: 'user' | 'assistant' | 'system'
  content: string
  model?: ModelId
  modelVersion?: string
  metadata?: {
    tokenCount?: number
    durationMs?: number
    toolsUsed?: string[]
    cwd?: string
  }
}

export interface Conversation {
  id: string
  name?: string
  createdAt: number
  updatedAt: number
  messages: ConversationMessage[]
}

export interface ModelContext {
  systemPrompt: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
}

// ============================================================================
// JSONL File Operations
// ============================================================================

const CONVERSATIONS_DIR = process.env.CONVERSATIONS_DIR || '.conversations'

function getConversationPath(conversationId: string): string {
  return path.join(process.cwd(), CONVERSATIONS_DIR, `${conversationId}.jsonl`)
}

function ensureDir(): void {
  const dir = path.join(process.cwd(), CONVERSATIONS_DIR)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Append a message to a conversation
 */
export function appendMessage(
  conversationId: string,
  message: Omit<ConversationMessage, 'id' | 'ts'>
): ConversationMessage {
  ensureDir()

  const fullMessage: ConversationMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    ...message
  }

  const filePath = getConversationPath(conversationId)
  fs.appendFileSync(filePath, JSON.stringify(fullMessage) + '\n')

  return fullMessage
}

/**
 * Read all messages from a conversation
 */
export function readConversation(conversationId: string): ConversationMessage[] {
  const filePath = getConversationPath(conversationId)

  if (!fs.existsSync(filePath)) {
    return []
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  return lines.map(line => JSON.parse(line) as ConversationMessage)
}

/**
 * Read last N messages
 */
export function readLastMessages(conversationId: string, count: number): ConversationMessage[] {
  const all = readConversation(conversationId)
  return all.slice(-count)
}

/**
 * List all conversations
 */
export function listConversations(): Array<{ id: string; messageCount: number; updatedAt: number }> {
  ensureDir()
  const dir = path.join(process.cwd(), CONVERSATIONS_DIR)
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))

  return files.map(file => {
    const id = file.replace('.jsonl', '')
    const messages = readConversation(id)
    const lastMessage = messages[messages.length - 1]

    return {
      id,
      messageCount: messages.length,
      updatedAt: lastMessage?.ts || 0
    }
  }).sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Create a new conversation
 */
export function createConversation(name?: string): string {
  ensureDir()
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const metadata: ConversationMessage = {
    id: `msg_init`,
    ts: Date.now(),
    role: 'system',
    content: `Conversation started${name ? `: ${name}` : ''}`,
    metadata: {}
  }

  const filePath = getConversationPath(id)
  fs.writeFileSync(filePath, JSON.stringify(metadata) + '\n')

  return id
}

/**
 * Build context for a model (simplified - no multi-model identity)
 *
 * For multi-model identity-aware context, see _archived/conversation-multimodel.ts
 */
export function buildModelContext(
  messages: ConversationMessage[],
  _targetModel: ModelId,
  baseSystemPrompt?: string,
  maxMessages: number = 50
): ModelContext {
  const recentMessages = messages.slice(-maxMessages)

  return {
    systemPrompt: baseSystemPrompt || '',
    messages: recentMessages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
  }
}

/**
 * Build transcript context (simplified)
 */
export function buildTranscriptContext(
  messages: ConversationMessage[],
  targetModel: ModelId,
  baseSystemPrompt?: string,
  maxMessages: number = 50
): ModelContext {
  return buildModelContext(messages, targetModel, baseSystemPrompt, maxMessages)
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Prune old messages from a conversation
 */
export function pruneConversation(conversationId: string, keepLast: number = 100): void {
  const messages = readConversation(conversationId)

  if (messages.length <= keepLast) {
    return
  }

  const toKeep = messages.slice(-keepLast)
  const filePath = getConversationPath(conversationId)
  fs.writeFileSync(filePath, toKeep.map(m => JSON.stringify(m)).join('\n') + '\n')
}

/**
 * Export conversation to markdown
 */
export function exportConversation(conversationId: string): string {
  const messages = readConversation(conversationId)

  return messages
    .filter(m => m.role !== 'system')
    .map(msg => {
      if (msg.role === 'user') {
        return `**User**: ${msg.content}`
      } else {
        return `**Assistant**: ${msg.content}`
      }
    })
    .join('\n\n---\n\n')
}
