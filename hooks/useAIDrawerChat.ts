"use client"

import * as React from "react"
import { useAIDrawer, useAIDrawerOptional, type AIDrawerContextValue } from "@/contexts/AIDrawerContext"
import type { Conversation, Message, ChatSettings } from "@/lib/ai-workspace"

// ============================================================================
// TYPES
// ============================================================================

export interface UseAIDrawerChatOptions {
  /** Auto-focus input when drawer opens */
  autoFocus?: boolean
  /** Keyboard shortcut to toggle drawer (e.g., 'k' for Cmd+K) */
  shortcutKey?: string
  /** Modifier key for shortcut (default: 'meta' for Cmd/Ctrl) */
  shortcutModifier?: 'meta' | 'ctrl' | 'alt' | 'shift'
}

export interface UseAIDrawerChatReturn extends AIDrawerContextValue {
  // Input management
  inputValue: string
  setInputValue: (value: string) => void
  preFillInput: (content: string) => void
  clearInput: () => void

  // Focus management
  focusInput: () => void

  // Conversation helpers
  getConversation: (id: string) => Conversation | undefined
  getActiveMessages: () => Message[]
  hasMessages: boolean

  // Quick status checks
  isReady: boolean
  isWorking: boolean

  // Settings helpers
  getCurrentBackend: () => string
  updateSettings: (updates: Partial<ChatSettings>) => void
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Enhanced hook for interacting with the AI drawer.
 * Provides input management, focus control, and keyboard shortcuts.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const {
 *     drawer,
 *     openDrawer,
 *     preFillInput,
 *     sendMessage,
 *   } = useAIDrawerChat({ autoFocus: true, shortcutKey: 'k' })
 *
 *   const askAboutCode = () => {
 *     openDrawer()
 *     preFillInput("Explain this code:")
 *   }
 * }
 * ```
 */
export function useAIDrawerChat(options: UseAIDrawerChatOptions = {}): UseAIDrawerChatReturn {
  const {
    autoFocus = true,
    shortcutKey,
    shortcutModifier = 'meta',
  } = options

  const context = useAIDrawer()
  const [inputValue, setInputValue] = React.useState('')
  const wasOpenRef = React.useRef(context.drawer.isOpen)

  // Auto-focus when drawer opens
  React.useEffect(() => {
    if (autoFocus && context.drawer.isOpen && !wasOpenRef.current) {
      // Small delay to let drawer animation complete
      const timer = setTimeout(() => {
        context.textareaRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
    wasOpenRef.current = context.drawer.isOpen
  }, [autoFocus, context.drawer.isOpen, context.textareaRef])

  // Keyboard shortcut
  React.useEffect(() => {
    if (!shortcutKey) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const modifierPressed =
        shortcutModifier === 'meta' ? e.metaKey || e.ctrlKey :
        shortcutModifier === 'ctrl' ? e.ctrlKey :
        shortcutModifier === 'alt' ? e.altKey :
        e.shiftKey

      if (modifierPressed && e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault()
        context.toggleDrawer()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcutKey, shortcutModifier, context])

  // Input management
  const preFillInput = React.useCallback((content: string) => {
    setInputValue(content)
    // Focus after a small delay
    setTimeout(() => context.textareaRef.current?.focus(), 50)
  }, [context.textareaRef])

  const clearInput = React.useCallback(() => {
    setInputValue('')
  }, [])

  const focusInput = React.useCallback(() => {
    context.textareaRef.current?.focus()
  }, [context.textareaRef])

  // Conversation helpers
  const getConversation = React.useCallback((id: string): Conversation | undefined => {
    return context.conversations.find(c => c.id === id)
  }, [context.conversations])

  const getActiveMessages = React.useCallback((): Message[] => {
    return context.activeConv.messages
  }, [context.activeConv.messages])

  const hasMessages = context.activeConv.messages.length > 0

  // Status checks
  const isReady = !context.modelsLoading && context.availableModels.length > 0
  const isWorking = context.isTyping || context.isStreaming

  // Settings helpers
  const getCurrentBackend = React.useCallback((): string => {
    const model = context.availableModels.find(m => m.id === context.settings.model)
    return model?.backend || 'mock'
  }, [context.availableModels, context.settings.model])

  const updateSettings = React.useCallback((updates: Partial<ChatSettings>) => {
    context.setSettings(prev => ({ ...prev, ...updates }))
  }, [context])

  return {
    // Spread all context functionality
    ...context,

    // Input management
    inputValue,
    setInputValue,
    preFillInput,
    clearInput,

    // Focus management
    focusInput,

    // Conversation helpers
    getConversation,
    getActiveMessages,
    hasMessages,

    // Status checks
    isReady,
    isWorking,

    // Settings helpers
    getCurrentBackend,
    updateSettings,
  }
}

/**
 * Lightweight hook for components that just need to trigger the drawer.
 * Works even without AIDrawerProvider (returns no-op functions).
 *
 * @example
 * ```tsx
 * function AskAIButton() {
 *   const { isAvailable, openWithMessage } = useAIDrawerTrigger()
 *
 *   if (!isAvailable) return null
 *
 *   return (
 *     <Button onClick={() => openWithMessage("Help me with this code")}>
 *       Ask AI
 *     </Button>
 *   )
 * }
 * ```
 */
export function useAIDrawerTrigger() {
  const context = useAIDrawerOptional()

  const isAvailable = context !== null

  const openDrawer = React.useCallback(() => {
    context?.openDrawer()
  }, [context])

  const closeDrawer = React.useCallback(() => {
    context?.closeDrawer()
  }, [context])

  const toggleDrawer = React.useCallback(() => {
    context?.toggleDrawer()
  }, [context])

  const openWithMessage = React.useCallback(async (
    content: string,
    options?: { projectPath?: string | null }
  ) => {
    if (context) {
      await context.openWithMessage(content, options)
    }
  }, [context])

  return {
    isAvailable,
    isOpen: context?.drawer.isOpen ?? false,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    openWithMessage,
  }
}

// Re-export types for convenience
export type { AIDrawerContextValue, DrawerSize } from "@/contexts/AIDrawerContext"
