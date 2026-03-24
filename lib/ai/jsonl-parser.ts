export interface TextBlock {
  type: 'text'
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  name: string
  id?: string
  input: unknown
}

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id?: string
  content: string | unknown[]
  is_error?: boolean
}

export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock

export interface UserEntry {
  type: 'user'
  message: {
    role?: string
    content: string | ContentBlock[]
  }
  isMeta?: boolean
  uuid?: string
  timestamp?: string
}

export interface AssistantEntry {
  type: 'assistant'
  message: {
    role?: string
    content: string | ContentBlock[]
  }
  uuid?: string
  timestamp?: string
}

export interface SummaryEntry {
  type: 'summary'
  summary: string
  uuid?: string
  timestamp?: string
}

export type ConversationEntry = UserEntry | AssistantEntry | SummaryEntry

export interface ParsedMessage {
  id: string
  role: 'user' | 'assistant' | 'summary'
  blocks: ParsedBlock[]
  timestamp?: string
}

export type ParsedBlock =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | { kind: 'tool_use'; toolName: string; toolId: string; input: unknown }
  | { kind: 'tool_result'; toolId: string; text: string; isError: boolean }

export function isRealUserMessage(entry: UserEntry): boolean {
  if (entry.isMeta) return false
  const content = entry.message?.content
  if (!content) return false

  if (typeof content === 'string') {
    const trimmed = content.trim()
    if (!trimmed) return false
    if (trimmed.startsWith('<command-name>') || trimmed.startsWith('<command-message>')) return false
    if (trimmed === '<local-command-stdout></local-command-stdout>') return false
    if (trimmed.startsWith('<local-command-caveat>')) return false
    // Reject messages that are entirely XML tags with no meaningful text
    const stripped = trimmed.replace(/<[^>]+>/g, '').trim()
    if (!stripped) return false
    return true
  }

  if (Array.isArray(content)) {
    return content.some((block) => block.type !== 'tool_result')
  }

  return true
}

export function parseJsonlEntries(text: string): ConversationEntry[] {
  const entries: ConversationEntry[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const parsed = JSON.parse(trimmed)
      if (!parsed || !parsed.type) continue

      if (parsed.type === 'user') {
        if (isRealUserMessage(parsed)) {
          entries.push(parsed)
        }
      } else if (parsed.type === 'assistant' || parsed.type === 'summary') {
        entries.push(parsed)
      }
    } catch {
      // skip malformed lines
    }
  }

  return entries
}

export function extractMessageContent(entry: ConversationEntry): ParsedMessage | null {
  const id = ('uuid' in entry && entry.uuid) || Math.random().toString(36).slice(2)
  const timestamp = 'timestamp' in entry ? entry.timestamp : undefined

  if (entry.type === 'summary') {
    return {
      id,
      role: 'summary',
      blocks: [{ kind: 'text', text: entry.summary }],
      timestamp,
    }
  }

  if (entry.type === 'user') {
    const content = entry.message?.content
    let text = ''

    if (typeof content === 'string') {
      text = content
    } else if (Array.isArray(content)) {
      const textParts: string[] = []
      for (const block of content) {
        if (block.type === 'text') {
          textParts.push(block.text)
        }
      }
      text = textParts.join('\n')
    }

    if (!text.trim()) return null

    return {
      id,
      role: 'user',
      blocks: [{ kind: 'text', text }],
      timestamp,
    }
  }

  if (entry.type === 'assistant') {
    const content = entry.message?.content
    const blocks: ParsedBlock[] = []

    if (typeof content === 'string') {
      blocks.push({ kind: 'text', text: content })
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (!block) continue

        switch (block.type) {
          case 'text':
            blocks.push({ kind: 'text', text: block.text || '' })
            break
          case 'thinking':
            blocks.push({ kind: 'thinking', text: block.thinking || (block as unknown as { text?: string }).text || '' })
            break
          case 'tool_use':
            blocks.push({
              kind: 'tool_use',
              toolName: block.name || 'Tool',
              toolId: block.id || '',
              input: block.input || {},
            })
            break
          case 'tool_result': {
            let resultText = ''
            if (typeof block.content === 'string') {
              resultText = block.content
            } else if (Array.isArray(block.content)) {
              const parts: string[] = []
              for (const item of block.content) {
                if (item && typeof item === 'object' && 'text' in item) {
                  parts.push((item as { text: string }).text)
                }
              }
              resultText = parts.join('\n')
            }
            blocks.push({
              kind: 'tool_result',
              toolId: block.tool_use_id || '',
              text: resultText,
              isError: block.is_error || false,
            })
            break
          }
        }
      }
    }

    if (blocks.length === 0) return null

    return {
      id,
      role: 'assistant',
      blocks,
      timestamp,
    }
  }

  return null
}

export function entriesToMessages(entries: ConversationEntry[]): ParsedMessage[] {
  const messages: ParsedMessage[] = []
  for (const entry of entries) {
    const msg = extractMessageContent(entry)
    if (msg) messages.push(msg)
  }
  return messages
}

/**
 * Extract the first real user message text from raw JSONL content.
 * Designed to work on a small prefix (e.g. first 4KB) of a session file.
 * Returns the message text truncated to 100 chars, or null if none found.
 */
export function extractFirstUserMessage(text: string): string | null {
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      const parsed = JSON.parse(trimmed)
      if (!parsed || parsed.type !== 'user') continue
      if (!isRealUserMessage(parsed as UserEntry)) continue

      const content = parsed.message?.content
      let msgText = ''

      if (typeof content === 'string') {
        msgText = content
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block && block.type === 'text' && typeof block.text === 'string') {
            msgText = block.text
            break
          }
        }
      }

      // Strip all XML/HTML-like tags from the message text
      msgText = msgText.replace(/<[^>]+>/g, '').trim()
      if (!msgText) continue

      if (msgText.length > 100) {
        msgText = msgText.slice(0, 100)
      }

      return msgText
    } catch {
      // skip malformed lines (including truncated last line from partial read)
    }
  }

  return null
}
