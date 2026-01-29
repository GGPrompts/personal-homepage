import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIChat } from '@/hooks/useAIChat'
import type { ModelInfo } from '@/lib/ai-workspace'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useAIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    // Default successful fetch mock for models endpoint
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [], backends: [] }),
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initialization', () => {
    it('initializes with default conversation', async () => {
      const { result } = renderHook(() => useAIChat())

      expect(result.current.conversations).toHaveLength(1)
      expect(result.current.conversations[0].title).toBe('New Conversation')
      expect(result.current.conversations[0].messages).toHaveLength(0)
      expect(result.current.activeConv).toBeDefined()
    })

    it('loads conversations from localStorage', async () => {
      const savedConversations = [
        {
          id: 'test-conv-1',
          title: 'Test Conversation',
          messages: [
            { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      expect(result.current.conversations).toHaveLength(1)
      expect(result.current.conversations[0].id).toBe('test-conv-1')
      expect(result.current.conversations[0].title).toBe('Test Conversation')
    })

    it('loads settings from localStorage', async () => {
      const savedSettings = {
        model: 'claude-sonnet',
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: 'You are a helpful assistant',
      }
      localStorageMock.setItem('ai-workspace-settings', JSON.stringify(savedSettings))

      const { result } = renderHook(() => useAIChat())

      expect(result.current.settings.model).toBe('claude-sonnet')
      expect(result.current.settings.temperature).toBe(0.5)
      expect(result.current.settings.maxTokens).toBe(4096)
      expect(result.current.settings.systemPrompt).toBe('You are a helpful assistant')
    })
  })

  describe('models fetching', () => {
    it('fetches available models on mount', async () => {
      const mockModels: ModelInfo[] = [
        { id: 'claude-sonnet', name: 'Claude Sonnet', backend: 'claude', description: 'Fast model' },
        { id: 'mock', name: 'Mock AI', backend: 'mock', description: 'Demo model' },
      ]
      const mockBackends = [
        { backend: 'claude', available: true, error: null },
        { backend: 'mock', available: true, error: null },
      ]

      // Reset and set up fresh mock that returns models for ALL calls
      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/ai/models') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ models: mockModels, backends: mockBackends }),
          })
        }
        // For other calls (like conversation sync), return not ok
        return Promise.resolve({ ok: false })
      })

      const { result } = renderHook(() => useAIChat())

      // Initially loading
      expect(result.current.modelsLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.availableModels).toHaveLength(2)
      expect(result.current.backends).toHaveLength(2)
    })

    it('falls back to mock model on fetch error', async () => {
      // Reset and set up mock that rejects for models endpoint
      mockFetch.mockReset()
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/ai/models') {
          return Promise.reject(new Error('Network error'))
        }
        // For other calls, return not ok
        return Promise.resolve({ ok: false })
      })

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.availableModels).toHaveLength(1)
      expect(result.current.availableModels[0].id).toBe('mock')
      expect(result.current.availableModels[0].backend).toBe('mock')
    })
  })

  describe('conversation management', () => {
    it('creates a new conversation', async () => {
      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      const initialCount = result.current.conversations.length

      act(() => {
        result.current.createNewConversation()
      })

      expect(result.current.conversations).toHaveLength(initialCount + 1)
      expect(result.current.conversations[0].title).toBe('New Conversation')
      expect(result.current.conversations[0].messages).toHaveLength(0)
      expect(result.current.activeConvId).toBe(result.current.conversations[0].id)
    })

    it('deletes a conversation', async () => {
      const savedConversations = [
        {
          id: 'conv-1',
          title: 'First',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'conv-2',
          title: 'Second',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.conversations).toHaveLength(2)

      act(() => {
        result.current.deleteConversation('conv-1')
      })

      expect(result.current.conversations).toHaveLength(1)
      expect(result.current.conversations[0].id).toBe('conv-2')
    })

    it('creates new conversation when deleting the last one', async () => {
      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      const convId = result.current.conversations[0].id

      act(() => {
        result.current.deleteConversation(convId)
      })

      expect(result.current.conversations).toHaveLength(1)
      expect(result.current.conversations[0].id).not.toBe(convId)
      expect(result.current.conversations[0].title).toBe('New Conversation')
    })

    it('clears conversation messages', async () => {
      const savedConversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          messages: [
            { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date().toISOString() },
            { id: 'msg-2', role: 'assistant', content: 'Hi there', timestamp: new Date().toISOString() },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          claudeSessionId: 'session-123',
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.activeConv.messages).toHaveLength(2)

      act(() => {
        result.current.clearConversation()
      })

      expect(result.current.activeConv.messages).toHaveLength(0)
      expect(result.current.activeConv.title).toBe('New Conversation')
      expect(result.current.activeConv.claudeSessionId).toBeNull()
    })

    it('switches active conversation', async () => {
      const savedConversations = [
        {
          id: 'conv-1',
          title: 'First',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'conv-2',
          title: 'Second',
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.setActiveConvId('conv-2')
      })

      expect(result.current.activeConvId).toBe('conv-2')
      expect(result.current.activeConv.title).toBe('Second')
    })
  })

  describe('settings management', () => {
    it('updates settings', async () => {
      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.setSettings(prev => ({ ...prev, temperature: 0.9 }))
      })

      expect(result.current.settings.temperature).toBe(0.9)
    })

    it('persists settings to localStorage', async () => {
      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.setSettings(prev => ({ ...prev, temperature: 0.3 }))
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ai-workspace-settings',
        expect.stringContaining('"temperature":0.3')
      )
    })
  })

  describe('feedback handling', () => {
    it('adds feedback to a message', async () => {
      const savedConversations = [
        {
          id: 'conv-1',
          title: 'Test',
          messages: [
            { id: 'msg-1', role: 'assistant', content: 'Hello', timestamp: new Date().toISOString() },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.handleFeedback('msg-1', 'up')
      })

      expect(result.current.activeConv.messages[0].feedback).toBe('up')
    })

    it('toggles feedback off when clicking same type', async () => {
      const savedConversations = [
        {
          id: 'conv-1',
          title: 'Test',
          messages: [
            { id: 'msg-1', role: 'assistant', content: 'Hello', timestamp: new Date().toISOString(), feedback: 'up' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]
      localStorageMock.setItem('ai-workspace-conversations', JSON.stringify(savedConversations))

      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.handleFeedback('msg-1', 'up')
      })

      expect(result.current.activeConv.messages[0].feedback).toBeUndefined()
    })
  })

  describe('callbacks', () => {
    it('calls onConversationsChange when conversations change', async () => {
      const onConversationsChange = vi.fn()

      const { result } = renderHook(() => useAIChat({ onConversationsChange }))

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      // Initial call
      expect(onConversationsChange).toHaveBeenCalled()

      act(() => {
        result.current.createNewConversation()
      })

      // Called again after creating conversation
      expect(onConversationsChange.mock.calls.length).toBeGreaterThan(1)
    })

    it('calls onSettingsChange when settings change', async () => {
      const onSettingsChange = vi.fn()

      const { result } = renderHook(() => useAIChat({ onSettingsChange }))

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.setSettings(prev => ({ ...prev, temperature: 0.5 }))
      })

      expect(onSettingsChange).toHaveBeenCalled()
    })
  })

  describe('stopStreaming', () => {
    it('resets streaming state when stopped', async () => {
      const { result } = renderHook(() => useAIChat())

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.stopStreaming()
      })

      expect(result.current.isStreaming).toBe(false)
      expect(result.current.isTyping).toBe(false)
    })
  })

  describe('refs', () => {
    it('provides textarea and messagesEnd refs', async () => {
      const { result } = renderHook(() => useAIChat())

      expect(result.current.textareaRef).toBeDefined()
      expect(result.current.messagesEndRef).toBeDefined()
      expect(result.current.textareaRef.current).toBeNull()
      expect(result.current.messagesEndRef.current).toBeNull()
    })
  })
})
