import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useAIDrawerChat, useAIDrawerTrigger } from '@/hooks/useAIDrawerChat'
import { AIDrawerProvider } from '@/contexts/AIDrawerContext'

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

// Helper wrapper component
const createWrapper = (options = {}) => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AIDrawerProvider, options, children)
}

describe('useAIDrawerChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.useFakeTimers()

    // Mock fetch for models endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: [
          { id: 'mock', name: 'Mock AI', backend: 'mock', description: 'Demo' },
          { id: 'claude-sonnet', name: 'Claude Sonnet', backend: 'claude', description: 'Fast' },
        ],
        backends: [
          { backend: 'mock', available: true },
          { backend: 'claude', available: true },
        ]
      }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('throws error without provider', () => {
    it('throws when used outside AIDrawerProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useAIDrawerChat())
      }).toThrow('useAIDrawer must be used within an AIDrawerProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('within provider', () => {
    it('provides drawer context', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      expect(result.current.drawer).toBeDefined()
      expect(result.current.drawer.isOpen).toBe(false)
      expect(result.current.drawer.size).toBe('default')
      expect(result.current.drawer.isMinimized).toBe(false)
    })

    it('provides input management functions', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      expect(result.current.inputValue).toBe('')
      expect(typeof result.current.setInputValue).toBe('function')
      expect(typeof result.current.preFillInput).toBe('function')
      expect(typeof result.current.clearInput).toBe('function')
    })

    it('updates input value', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setInputValue('Hello AI')
      })

      expect(result.current.inputValue).toBe('Hello AI')
    })

    it('prefills and clears input', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.preFillInput('Prefilled content')
      })

      expect(result.current.inputValue).toBe('Prefilled content')

      act(() => {
        result.current.clearInput()
      })

      expect(result.current.inputValue).toBe('')
    })

    it('provides conversation helpers', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.getConversation).toBe('function')
      expect(typeof result.current.getActiveMessages).toBe('function')
      expect(typeof result.current.hasMessages).toBe('boolean')
    })

    it('hasMessages returns false for empty conversation', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      expect(result.current.hasMessages).toBe(false)
    })

    it('getActiveMessages returns current conversation messages', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      const messages = result.current.getActiveMessages()
      expect(Array.isArray(messages)).toBe(true)
      expect(messages).toHaveLength(0)
    })

    it('getConversation returns undefined for non-existent id', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      const conv = result.current.getConversation('non-existent-id')
      expect(conv).toBeUndefined()
    })

    it('getConversation returns conversation for valid id', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      const activeId = result.current.activeConvId
      const conv = result.current.getConversation(activeId)

      expect(conv).toBeDefined()
      expect(conv?.id).toBe(activeId)
    })
  })

  describe('status checks', () => {
    it('isReady is true when models are loaded', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.isReady).toBe(true)
    })

    it('isWorking reflects typing/streaming state', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      expect(result.current.isWorking).toBe(false)
      // isTyping and isStreaming are both false initially
      expect(result.current.isTyping).toBe(false)
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('settings helpers', () => {
    it('getCurrentBackend returns the current model backend', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      // Default model is 'mock' or first non-mock model
      const backend = result.current.getCurrentBackend()
      expect(['mock', 'claude']).toContain(backend)
    })

    it('updateSettings updates specific settings', async () => {
      const { result } = renderHook(() => useAIDrawerChat(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.modelsLoading).toBe(false)
      })

      act(() => {
        result.current.updateSettings({ temperature: 0.5 })
      })

      expect(result.current.settings.temperature).toBe(0.5)
    })
  })

  describe('options', () => {
    it('respects autoFocus option', async () => {
      const { result } = renderHook(() => useAIDrawerChat({ autoFocus: false }), {
        wrapper: createWrapper(),
      })

      // Just verify hook doesn't crash with autoFocus false
      expect(result.current.drawer).toBeDefined()
    })

    it('supports shortcut key configuration', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      renderHook(() => useAIDrawerChat({ shortcutKey: 'k' }), {
        wrapper: createWrapper(),
      })

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      addEventListenerSpy.mockRestore()
    })
  })
})

describe('useAIDrawerTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.useFakeTimers()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [], backends: [] }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('without provider', () => {
    it('returns isAvailable false when no provider', () => {
      const { result } = renderHook(() => useAIDrawerTrigger())

      expect(result.current.isAvailable).toBe(false)
      expect(result.current.isOpen).toBe(false)
    })

    it('provides no-op functions when no provider', () => {
      const { result } = renderHook(() => useAIDrawerTrigger())

      // These should not throw
      act(() => {
        result.current.openDrawer()
        result.current.closeDrawer()
        result.current.toggleDrawer()
      })

      expect(result.current.isAvailable).toBe(false)
    })

    it('openWithMessage is safe to call without provider', async () => {
      const { result } = renderHook(() => useAIDrawerTrigger())

      // Should not throw
      await act(async () => {
        await result.current.openWithMessage('Hello')
      })

      expect(result.current.isAvailable).toBe(false)
    })
  })

  describe('with provider', () => {
    it('returns isAvailable true when provider exists', async () => {
      const { result } = renderHook(() => useAIDrawerTrigger(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isAvailable).toBe(true)
    })

    it('opens and closes drawer', async () => {
      const { result } = renderHook(() => useAIDrawerTrigger(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.openDrawer()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.closeDrawer()
      })

      expect(result.current.isOpen).toBe(false)
    })

    it('toggles drawer', async () => {
      const { result } = renderHook(() => useAIDrawerTrigger(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isOpen).toBe(false)

      act(() => {
        result.current.toggleDrawer()
      })

      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.toggleDrawer()
      })

      expect(result.current.isOpen).toBe(false)
    })
  })
})
