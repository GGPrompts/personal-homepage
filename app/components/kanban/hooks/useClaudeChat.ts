"use client"

import { useState, useCallback, useRef } from 'react'
import type { ClaudeSettings, ChatMessage } from '../lib/ai/types'
import type { Message, ToolUse } from '../types'

/**
 * Strip __CLAUDE_EVENT__...__END_EVENT__ markers from content
 * These are used for structured event transmission but should not be displayed
 */
function stripClaudeEventMarkers(content: string): string {
  return content.replace(/__CLAUDE_EVENT__.*?__END_EVENT__/g, '').replace(/\n{3,}/g, '\n\n')
}

interface UseClaudeChatOptions {
  onMessage?: (message: Omit<Message, 'id'>) => void
  onSessionId?: (sessionId: string) => void
  onError?: (error: string) => void
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
  totalTokens: number
  contextPercentage: number
}

// Default context limit for Claude models (200k tokens)
export const CONTEXT_LIMIT = 200000

interface UseClaudeChatReturn {
  isStreaming: boolean
  streamingContent: string
  currentToolUse: { name: string; input: string } | null
  usage: TokenUsage | null
  sendMessage: (content: string, settings?: ClaudeSettings, sessionId?: string) => Promise<void>
  cancel: () => void
}

/**
 * Hook for streaming Claude chat messages
 */
export function useClaudeChat(options: UseClaudeChatOptions = {}): UseClaudeChatReturn {
  const { onMessage, onSessionId, onError } = options

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [currentToolUse, setCurrentToolUse] = useState<{ name: string; input: string } | null>(null)
  const [usage, setUsage] = useState<TokenUsage | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const toolUsesRef = useRef<ToolUse[]>([])

  const sendMessage = useCallback(async (
    content: string,
    settings?: ClaudeSettings,
    sessionId?: string
  ) => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setIsStreaming(true)
    setStreamingContent('')
    setCurrentToolUse(null)
    setUsage(null)
    toolUsesRef.current = []

    let fullContent = ''

    try {
      const messages: ChatMessage[] = [{ role: 'user', content }]

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          backend: 'claude',
          settings: settings ? {
            systemPrompt: settings.systemPrompt,
            claudeModel: settings.model,
            claudeAgent: settings.agent,
            additionalDirs: settings.additionalDirs,
            permissionMode: settings.permissionMode,
            allowedTools: settings.allowedTools,
            disallowedTools: settings.disallowedTools,
          } : undefined,
          cwd: settings?.workingDir,
          claudeSessionId: sessionId,
        }),
        signal: abortController.signal
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process SSE format: data: {...}\n\n
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || '' // Keep incomplete chunk in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6)) // Remove 'data: ' prefix

            if (data.error) {
              onError?.(data.error)
              continue
            }

            if (data.content) {
              fullContent += data.content
              // Strip event markers before displaying to user
              setStreamingContent(stripClaudeEventMarkers(fullContent))
            }

            if (data.done) {
              // Final event with metadata
              if (data.claudeSessionId) {
                onSessionId?.(data.claudeSessionId)
              }
              if (data.usage) {
                const totalTokens = data.usage.totalTokens ||
                  (data.usage.inputTokens + data.usage.outputTokens)
                const contextPercentage = Math.round((totalTokens / CONTEXT_LIMIT) * 100)
                setUsage({
                  inputTokens: data.usage.inputTokens || 0,
                  outputTokens: data.usage.outputTokens || 0,
                  cacheReadTokens: data.usage.cacheReadTokens,
                  cacheCreationTokens: data.usage.cacheCreationTokens,
                  totalTokens,
                  contextPercentage
                })
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Finalize message - strip event markers from persisted content
      const cleanContent = stripClaudeEventMarkers(fullContent).trim()
      if (cleanContent || toolUsesRef.current.length > 0) {
        onMessage?.({
          role: 'assistant',
          content: cleanContent,
          timestamp: new Date(),
          model: 'claude-code',
          toolUses: toolUsesRef.current.length > 0 ? toolUsesRef.current : undefined
        })
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Cancelled by user
        return
      }
      onError?.(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
      setCurrentToolUse(null)
      abortControllerRef.current = null
    }
  }, [onMessage, onSessionId, onError])

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setStreamingContent('')
    setCurrentToolUse(null)
  }, [])

  return {
    isStreaming,
    streamingContent,
    currentToolUse,
    usage,
    sendMessage,
    cancel
  }
}
