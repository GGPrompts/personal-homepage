"use client"

import { useState, useCallback, useRef } from 'react'
import type { StreamChunk, ClaudeSettings, ChatMessage } from '../lib/ai/types'
import type { Message, ToolUse } from '../types'

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
    let currentToolInput = ''
    let currentToolName = ''

    try {
      const messages: ChatMessage[] = [{ role: 'user', content }]

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, settings, sessionId }),
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

        // Process buffer - split on event markers or just accumulate text
        while (buffer.includes('__CLAUDE_EVENT__')) {
          const eventStart = buffer.indexOf('__CLAUDE_EVENT__')

          // Text before the event
          if (eventStart > 0) {
            const textBefore = buffer.substring(0, eventStart)
            fullContent += textBefore
            setStreamingContent(fullContent)
          }

          const eventEnd = buffer.indexOf('__END_EVENT__')
          if (eventEnd === -1) break // Wait for complete event

          const eventJson = buffer.substring(eventStart + 16, eventEnd)
          buffer = buffer.substring(eventEnd + 13)

          try {
            const event: StreamChunk = JSON.parse(eventJson)

            switch (event.type) {
              case 'tool_start':
                if (event.tool) {
                  currentToolName = event.tool.name
                  currentToolInput = event.tool.input || ''
                  setCurrentToolUse({ name: currentToolName, input: currentToolInput })
                }
                break

              case 'tool_input':
                if (event.tool) {
                  currentToolInput += event.tool.input || ''
                  setCurrentToolUse({ name: currentToolName, input: currentToolInput })
                }
                break

              case 'tool_end':
                if (event.tool) {
                  toolUsesRef.current.push({
                    name: event.tool.name,
                    input: event.tool.input ? JSON.parse(event.tool.input) : {}
                  })
                  setCurrentToolUse(null)
                  currentToolName = ''
                  currentToolInput = ''
                }
                break

              case 'done':
                if (event.sessionId) {
                  onSessionId?.(event.sessionId)
                }
                if (event.usage) {
                  const totalTokens = event.usage.totalTokens
                  const contextPercentage = Math.round((totalTokens / CONTEXT_LIMIT) * 100)
                  setUsage({
                    inputTokens: event.usage.inputTokens,
                    outputTokens: event.usage.outputTokens,
                    cacheReadTokens: event.usage.cacheReadTokens,
                    cacheCreationTokens: event.usage.cacheCreationTokens,
                    totalTokens,
                    contextPercentage
                  })
                }
                break

              case 'error':
                onError?.(event.error || 'Unknown error')
                break
            }
          } catch {
            // Ignore parse errors
          }
        }

        // Any remaining text in buffer (no event markers)
        if (buffer && !buffer.includes('__CLAUDE_EVENT__')) {
          fullContent += buffer
          setStreamingContent(fullContent)
          buffer = ''
        }
      }

      // Finalize message
      if (fullContent.trim() || toolUsesRef.current.length > 0) {
        onMessage?.({
          role: 'assistant',
          content: fullContent.trim(),
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
