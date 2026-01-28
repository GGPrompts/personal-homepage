"use client"

import * as React from "react"
import {
  type Message,
  type AIBackend,
  type Conversation,
  type ChatSettings,
  type ModelInfo,
  type BackendStatus,
  type GeneratingConversations,
  type TokenUsage,
  generateId,
  parseClaudeEvents,
  loadConversations,
  loadSettings,
  loadGeneratingConversations,
  setGenerating,
  clearGenerating,
  isGenerating,
  accumulateUsage,
  GENERATING_STORAGE_KEY,
} from "@/lib/ai-workspace"

// ============================================================================
// TYPES
// ============================================================================

export interface UseAIChatOptions {
  /** Initial conversation ID to use (optional) */
  initialConversationId?: string
  /** Called when conversations change */
  onConversationsChange?: (conversations: Conversation[]) => void
  /** Called when settings change */
  onSettingsChange?: (settings: ChatSettings) => void
}

export interface UseAIChatReturn {
  // Conversations
  conversations: Conversation[]
  activeConvId: string
  activeConv: Conversation
  setActiveConvId: (id: string) => void
  createNewConversation: () => void
  deleteConversation: (id: string) => void
  clearConversation: () => void
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>

  // Settings
  settings: ChatSettings
  setSettings: React.Dispatch<React.SetStateAction<ChatSettings>>

  // Models
  availableModels: ModelInfo[]
  backends: BackendStatus[]
  modelsLoading: boolean

  // Generating state
  generatingConvs: GeneratingConversations
  isTyping: boolean
  isStreaming: boolean

  // Actions
  sendMessage: (content: string, options?: SendMessageOptions) => Promise<void>
  handleRegenerate: () => void
  handleFeedback: (messageId: string, type: 'up' | 'down') => void
  stopStreaming: () => void

  // Refs for external use
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export interface SendMessageOptions {
  /** Override the project path for this message */
  projectPath?: string | null
  /** Override the model for this message */
  model?: string
}

// ============================================================================
// HOOK
// ============================================================================

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const {
    onConversationsChange,
    onSettingsChange,
  } = options

  // ============================================================================
  // STATE
  // ============================================================================

  const [conversations, setConversations] = React.useState<Conversation[]>(loadConversations)
  const [activeConvId, setActiveConvId] = React.useState(() => {
    const loaded = loadConversations()
    return loaded[0]?.id || generateId()
  })
  const [settings, setSettings] = React.useState<ChatSettings>(loadSettings)
  const [isTyping, setIsTyping] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<ModelInfo[]>([])
  const [backends, setBackends] = React.useState<BackendStatus[]>([])
  const [modelsLoading, setModelsLoading] = React.useState(true)
  const [generatingConvs, setGeneratingConvs] = React.useState<GeneratingConversations>(() => loadGeneratingConversations())

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Default conversation for SSR when conversations array is empty
  const defaultConv: Conversation = React.useMemo(() => ({
    id: generateId(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }), [])

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0] || defaultConv

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Listen for cross-tab storage events to sync generating state
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === GENERATING_STORAGE_KEY) {
        setGeneratingConvs(loadGeneratingConversations())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Periodic cleanup of stale generating flags
  React.useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setGeneratingConvs(loadGeneratingConversations())
    }, 60000) // Check every minute

    return () => clearInterval(cleanupInterval)
  }, [])

  // Sync from server-side JSONL on mount and when active conversation changes
  // Track if we're currently streaming to prevent sync from adding duplicates
  const isStreamingRef = React.useRef(false)

  React.useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  React.useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null
    let mounted = true

    async function syncFromServer(): Promise<boolean> {
      if (!activeConv?.id) return false

      // Don't sync while actively streaming - the streaming code handles message updates
      if (isStreamingRef.current) {
        console.debug('Skipping server sync - streaming in progress')
        return false
      }

      try {
        const response = await fetch(`/api/ai/conversations?id=${activeConv.id}`)
        if (!response.ok) return false

        const data = await response.json()
        if (!data.messages || data.messages.length === 0) return false

        const serverMessages = data.messages.filter((m: any) => m.role !== 'system')
        const lastServerAssistant = [...serverMessages].reverse().find((m: any) => m.role === 'assistant')

        if (!lastServerAssistant) return false

        const localMessages = activeConv.messages
        const lastLocalAssistant = [...localMessages].reverse().find(m => m.role === 'assistant')

        // Check if we already have an assistant message with similar content
        // This handles the case where IDs differ but content is the same
        const hasMatchingContent = localMessages.some(m =>
          m.role === 'assistant' &&
          m.content === lastServerAssistant.content
        )

        if (hasMatchingContent) {
          console.debug('Skipping server sync - matching content already exists')
          return false
        }

        if (lastServerAssistant.ts > (lastLocalAssistant?.timestamp?.getTime() || 0)) {
          console.log('Syncing missed response from server')

          const syncedMessage: Message = {
            id: lastServerAssistant.id,
            role: 'assistant',
            content: lastServerAssistant.content,
            timestamp: new Date(lastServerAssistant.ts),
            model: lastServerAssistant.model as AIBackend,
            isStreaming: false,
          }

          if (mounted) {
            setConversations(prev => prev.map(conv => {
              if (conv.id !== activeConvId) return conv
              if (conv.messages.find(m => m.id === syncedMessage.id)) return conv
              // Additional check: don't add if we already have matching content
              if (conv.messages.some(m => m.role === 'assistant' && m.content === syncedMessage.content)) return conv
              return {
                ...conv,
                messages: [...conv.messages, syncedMessage],
                updatedAt: new Date(),
              }
            }))

            clearGenerating(activeConvId)
            setGeneratingConvs(loadGeneratingConversations())
          }
          return true
        }
        return false
      } catch (error) {
        console.debug('Server sync failed:', error)
        return false
      }
    }

    syncFromServer()

    const wasGenerating = isGenerating(activeConvId)
    if (wasGenerating) {
      console.log('Conversation was generating in background, polling for completion...')

      let pollCount = 0
      const maxPolls = 30
      pollInterval = setInterval(async () => {
        pollCount++

        // Skip polling if we're now streaming in this tab
        if (isStreamingRef.current) {
          console.debug('Pausing poll - streaming started in this tab')
          return
        }

        const synced = await syncFromServer()
        if (synced || pollCount >= maxPolls) {
          if (pollInterval) clearInterval(pollInterval)

          if (!synced && pollCount >= maxPolls) {
            console.log('Background generation polling timed out, clearing flag')
            clearGenerating(activeConvId)
            setGeneratingConvs(loadGeneratingConversations())
          }
        }
      }, 1000)
    }

    return () => {
      mounted = false
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [activeConvId])

  // Fetch available models on mount
  React.useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch('/api/ai/models')
        const data = await response.json()

        if (data.models) {
          setAvailableModels(data.models)

          const defaultModel = data.models.find((m: ModelInfo) => m.backend !== 'mock') || data.models[0]
          if (defaultModel && !data.models.find((m: ModelInfo) => m.id === settings.model)) {
            setSettings(prev => ({ ...prev, model: defaultModel.id }))
          }
        }

        if (data.backends) {
          setBackends(data.backends)
        }
      } catch (error) {
        console.error('Failed to fetch models:', error)
        setAvailableModels([{
          id: 'mock',
          name: 'Mock AI (Demo)',
          backend: 'mock',
          description: 'Simulated responses'
        }])
      } finally {
        setModelsLoading(false)
      }
    }

    fetchModels()
  }, [])

  // Save conversations to localStorage
  React.useEffect(() => {
    localStorage.setItem("ai-workspace-conversations", JSON.stringify(conversations))
    onConversationsChange?.(conversations)
  }, [conversations, onConversationsChange])

  // Save settings to localStorage
  React.useEffect(() => {
    localStorage.setItem("ai-workspace-settings", JSON.stringify(settings))
    onSettingsChange?.(settings)
  }, [settings, onSettingsChange])

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv.messages, isTyping])

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const sendMessage = React.useCallback(async (content: string, options: SendMessageOptions = {}) => {
    if (!content.trim()) return

    const { projectPath, model } = options

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const effectiveProjectPath = projectPath ?? activeConv.projectPath

    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv

      const newMessages = [...conv.messages, userMessage]
      const newTitle = conv.messages.length === 0
        ? content.slice(0, 50) + (content.length > 50 ? '...' : '')
        : conv.title

      const shouldSaveContext = conv.messages.length === 0

      return {
        ...conv,
        title: newTitle,
        messages: newMessages,
        updatedAt: new Date(),
        ...(shouldSaveContext && {
          model: model || settings.model,
          projectPath: effectiveProjectPath,
        }),
      }
    }))

    setIsTyping(true)

    // Prepare messages for API
    const allMessages = activeConv.messages
      .concat(userMessage)
      .map(m => ({ role: m.role, content: m.content }))

    if (settings.systemPrompt) {
      allMessages.unshift({
        role: 'system',
        content: settings.systemPrompt
      })
    }

    const selectedModel = availableModels.find(m => m.id === (model || settings.model))
    const backend = selectedModel?.backend || 'mock'

    const convSettings = activeConv.settings || {}

    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      abortControllerRef.current = new AbortController()

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages,
          backend,
          model: activeConv.model || model || settings.model,
          conversationId: activeConvId,
          settings: {
            temperature: convSettings.temperature ?? settings.temperature,
            maxTokens: convSettings.maxTokens ?? settings.maxTokens,
            systemPrompt: convSettings.systemPrompt ?? settings.systemPrompt,
            additionalDirs: convSettings.additionalDirs ?? settings.additionalDirs,
            claudeModel: convSettings.claudeModel ?? settings.claudeModel,
            claudeAgent: settings.claudeAgent,
            allowedTools: convSettings.allowedTools ?? settings.allowedTools,
            disallowedTools: convSettings.disallowedTools ?? settings.disallowedTools,
            permissionMode: convSettings.permissionMode ?? settings.permissionMode,
            agentMode: settings.agentMode, // Pass agent mode for context isolation
          },
          cwd: effectiveProjectPath || undefined,
          claudeSessionId: activeConv.claudeSessionId || undefined
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      setIsTyping(false)

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        model: backend as AIBackend,
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: [...conv.messages, assistantMessage],
          updatedAt: new Date(),
        }
      }))

      setIsStreaming(true)
      setGenerating(activeConvId, backend)
      setGeneratingConvs(loadGeneratingConversations())

      // Parse SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue

          const data = line.slice(6)

          if (data === '[DONE]') {
            setIsStreaming(false)
            clearGenerating(activeConvId)
            setGeneratingConvs(loadGeneratingConversations())
            setConversations(prev => prev.map(conv => {
              if (conv.id !== activeConvId) return conv
              return {
                ...conv,
                messages: conv.messages.map(msg =>
                  msg.id === assistantMessage.id
                    ? { ...msg, isStreaming: false }
                    : msg
                ),
              }
            }))
            break
          }

          try {
            const chunk = JSON.parse(data)

            if (chunk.error) {
              console.error('Stream error:', chunk.error)
              setIsStreaming(false)
              clearGenerating(activeConvId)
              setGeneratingConvs(loadGeneratingConversations())
              break
            }

            if (chunk.done) {
              setConversations(prev => prev.map(conv => {
                if (conv.id !== activeConvId) return conv

                // Accumulate usage data for accurate context tracking
                const newCumulativeUsage = chunk.usage
                  ? accumulateUsage(conv.cumulativeUsage ?? null, chunk.usage as TokenUsage)
                  : conv.cumulativeUsage

                return {
                  ...conv,
                  ...(chunk.claudeSessionId && { claudeSessionId: chunk.claudeSessionId }),
                  ...(chunk.usage && { usage: chunk.usage }),
                  ...(newCumulativeUsage && { cumulativeUsage: newCumulativeUsage }),
                }
              }))
            }

            if (chunk.content) {
              const { text, events } = parseClaudeEvents(chunk.content)

              for (const event of events) {
                if (event.type === 'tool_start' && event.tool) {
                  setConversations(prev => prev.map(conv => {
                    if (conv.id !== activeConvId) return conv
                    return {
                      ...conv,
                      messages: conv.messages.map(msg => {
                        if (msg.id !== assistantMessage.id) return msg
                        const existingTools = msg.toolUses || []
                        if (existingTools.find(t => t.id === event.tool!.id)) return msg
                        return {
                          ...msg,
                          toolUses: [...existingTools, {
                            id: event.tool!.id,
                            name: event.tool!.name,
                            input: event.tool!.input,
                            status: 'running' as const
                          }]
                        }
                      }),
                    }
                  }))
                } else if (event.type === 'tool_end' && event.tool) {
                  setConversations(prev => prev.map(conv => {
                    if (conv.id !== activeConvId) return conv
                    return {
                      ...conv,
                      messages: conv.messages.map(msg => {
                        if (msg.id !== assistantMessage.id) return msg
                        return {
                          ...msg,
                          toolUses: (msg.toolUses || []).map(t =>
                            t.id === event.tool!.id
                              ? { ...t, status: 'complete' as const, input: event.tool!.input || t.input }
                              : t
                          )
                        }
                      }),
                    }
                  }))
                }
              }

              if (text.trim()) {
                setConversations(prev => prev.map(conv => {
                  if (conv.id !== activeConvId) return conv
                  return {
                    ...conv,
                    messages: conv.messages.map(msg =>
                      msg.id === assistantMessage.id
                        ? { ...msg, content: msg.content + text }
                        : msg
                    ),
                    updatedAt: new Date(),
                  }
                }))
              }
            }
          } catch (error) {
            console.error('Failed to parse SSE chunk:', data, error)
          }
        }
      }

      setIsStreaming(false)
      clearGenerating(activeConvId)
      setGeneratingConvs(loadGeneratingConversations())
      abortControllerRef.current = null
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat request aborted')
        setIsTyping(false)
        setIsStreaming(false)
        return
      }

      console.error('Chat error:', error)
      setIsTyping(false)
      setIsStreaming(false)
      clearGenerating(activeConvId)
      setGeneratingConvs(loadGeneratingConversations())
      abortControllerRef.current = null

      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Falling back to mock responses.`,
        timestamp: new Date(),
      }

      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: [...conv.messages, errorMessage],
          updatedAt: new Date(),
        }
      }))
    }
  }, [activeConvId, activeConv, settings, availableModels])

  const handleRegenerate = React.useCallback(() => {
    const lastUserMessage = [...activeConv.messages]
      .reverse()
      .find(m => m.role === 'user')

    if (lastUserMessage) {
      setConversations(prev => prev.map(conv => {
        if (conv.id !== activeConvId) return conv
        return {
          ...conv,
          messages: conv.messages.slice(0, -1),
        }
      }))

      setTimeout(() => sendMessage(lastUserMessage.content), 100)
    }
  }, [activeConvId, activeConv.messages, sendMessage])

  const handleFeedback = React.useCallback((messageId: string, type: 'up' | 'down') => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv
      return {
        ...conv,
        messages: conv.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, feedback: msg.feedback === type ? undefined : type }
            : msg
        ),
      }
    }))
  }, [activeConvId])

  const createNewConversation = React.useCallback(() => {
    const newConv: Conversation = {
      id: generateId(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: settings.model,
      projectPath: null,
      settings: {
        systemPrompt: settings.systemPrompt,
        claudeModel: settings.claudeModel,
        additionalDirs: settings.additionalDirs,
        allowedTools: settings.allowedTools,
        disallowedTools: settings.disallowedTools,
        permissionMode: settings.permissionMode,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      },
      claudeSessionId: null,
    }

    setConversations(prev => [newConv, ...prev])
    setActiveConvId(newConv.id)
  }, [settings])

  const deleteConversation = React.useCallback((id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id)
      if (filtered.length === 0) {
        const newConv: Conversation = {
          id: generateId(),
          title: 'New Conversation',
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: settings.model,
        }
        setActiveConvId(newConv.id)
        return [newConv]
      }
      if (id === activeConvId) {
        setActiveConvId(filtered[0].id)
      }
      return filtered
    })
  }, [activeConvId, settings.model])

  const clearConversation = React.useCallback(() => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv
      return {
        ...conv,
        messages: [],
        title: 'New Conversation',
        updatedAt: new Date(),
        claudeSessionId: null, // Reset session to start fresh
        usage: null, // Clear token usage
        cumulativeUsage: null, // Clear cumulative tracking
      }
    }))
  }, [activeConvId])

  const stopStreaming = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsTyping(false)
  }, [])

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Conversations
    conversations,
    activeConvId,
    activeConv,
    setActiveConvId,
    createNewConversation,
    deleteConversation,
    clearConversation,
    setConversations,

    // Settings
    settings,
    setSettings,

    // Models
    availableModels,
    backends,
    modelsLoading,

    // Generating state
    generatingConvs,
    isTyping,
    isStreaming,

    // Actions
    sendMessage,
    handleRegenerate,
    handleFeedback,
    stopStreaming,

    // Refs
    textareaRef,
    messagesEndRef,
  }
}
