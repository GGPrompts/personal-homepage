"use client"

import * as React from "react"
import { useAIChat, type UseAIChatReturn, type UseAIChatOptions } from "@/hooks/useAIChat"

// ============================================================================
// TYPES
// ============================================================================

export type DrawerSize = 'collapsed' | 'default' | 'expanded' | 'fullscreen'

export interface AIDrawerState {
  /** Whether the drawer is currently open */
  isOpen: boolean
  /** Current drawer size */
  size: DrawerSize
  /** Whether the drawer is currently minimized to just a button */
  isMinimized: boolean
}

export interface AIDrawerContextValue extends UseAIChatReturn {
  // Drawer state
  drawer: AIDrawerState

  // Drawer actions
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
  setDrawerSize: (size: DrawerSize) => void
  minimizeDrawer: () => void
  restoreDrawer: () => void

  // Quick actions
  quickMessage: (content: string, options?: { projectPath?: string | null }) => Promise<void>
  openWithMessage: (content: string, options?: { projectPath?: string | null }) => Promise<void>
}

export interface AIDrawerProviderProps {
  children: React.ReactNode
  /** Initial open state */
  defaultOpen?: boolean
  /** Initial drawer size */
  defaultSize?: DrawerSize
  /** Options passed to useAIChat */
  chatOptions?: UseAIChatOptions
}

// ============================================================================
// CONTEXT
// ============================================================================

const AIDrawerContext = React.createContext<AIDrawerContextValue | null>(null)

// Storage keys for drawer preferences
const DRAWER_STATE_KEY = 'ai-drawer-state'

function loadDrawerState(): Partial<AIDrawerState> {
  if (typeof window === 'undefined') return {}

  try {
    const saved = localStorage.getItem(DRAWER_STATE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // Invalid JSON
  }
  return {}
}

function saveDrawerState(state: AIDrawerState): void {
  if (typeof window === 'undefined') return

  localStorage.setItem(DRAWER_STATE_KEY, JSON.stringify({
    size: state.size,
    // Don't persist isOpen or isMinimized - these are session-based
  }))
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AIDrawerProvider({
  children,
  defaultOpen = false,
  defaultSize = 'default',
  chatOptions,
}: AIDrawerProviderProps) {
  // Load saved preferences
  const savedState = React.useMemo(() => loadDrawerState(), [])

  // Drawer state
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [size, setSize] = React.useState<DrawerSize>(savedState.size || defaultSize)
  const [isMinimized, setIsMinimized] = React.useState(false)

  // Use the existing chat hook - this provides all chat functionality
  const chat = useAIChat(chatOptions)

  // Persist size preference
  React.useEffect(() => {
    saveDrawerState({ isOpen, size, isMinimized })
  }, [size])

  // Drawer actions
  const openDrawer = React.useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeDrawer = React.useCallback(() => {
    setIsOpen(false)
    setIsMinimized(false)
  }, [])

  const toggleDrawer = React.useCallback(() => {
    if (isOpen && !isMinimized) {
      closeDrawer()
    } else {
      openDrawer()
    }
  }, [isOpen, isMinimized, openDrawer, closeDrawer])

  const setDrawerSize = React.useCallback((newSize: DrawerSize) => {
    setSize(newSize)
    // If setting size, ensure drawer is open and not minimized
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const minimizeDrawer = React.useCallback(() => {
    setIsMinimized(true)
  }, [])

  const restoreDrawer = React.useCallback(() => {
    setIsMinimized(false)
    setIsOpen(true)
  }, [])

  // Quick message - send a message, opening drawer if needed
  const quickMessage = React.useCallback(async (
    content: string,
    options?: { projectPath?: string | null }
  ) => {
    await chat.sendMessage(content, options)
  }, [chat])

  // Open drawer with a message already typed or being sent
  const openWithMessage = React.useCallback(async (
    content: string,
    options?: { projectPath?: string | null }
  ) => {
    openDrawer()
    // Small delay to let drawer animation start
    await new Promise(resolve => setTimeout(resolve, 50))
    await chat.sendMessage(content, options)
  }, [openDrawer, chat])

  // Create context value
  const value = React.useMemo<AIDrawerContextValue>(() => ({
    // Spread all chat functionality
    ...chat,

    // Drawer state
    drawer: {
      isOpen,
      size,
      isMinimized,
    },

    // Drawer actions
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setDrawerSize,
    minimizeDrawer,
    restoreDrawer,

    // Quick actions
    quickMessage,
    openWithMessage,
  }), [
    chat,
    isOpen,
    size,
    isMinimized,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    setDrawerSize,
    minimizeDrawer,
    restoreDrawer,
    quickMessage,
    openWithMessage,
  ])

  return (
    <AIDrawerContext.Provider value={value}>
      {children}
    </AIDrawerContext.Provider>
  )
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access the AI drawer context.
 * Must be used within an AIDrawerProvider.
 */
export function useAIDrawer(): AIDrawerContextValue {
  const context = React.useContext(AIDrawerContext)

  if (!context) {
    throw new Error('useAIDrawer must be used within an AIDrawerProvider')
  }

  return context
}

/**
 * Hook to access just the drawer state and actions (not chat).
 * Useful for components that only need to open/close the drawer.
 */
export function useAIDrawerControls() {
  const context = useAIDrawer()

  return {
    drawer: context.drawer,
    openDrawer: context.openDrawer,
    closeDrawer: context.closeDrawer,
    toggleDrawer: context.toggleDrawer,
    setDrawerSize: context.setDrawerSize,
    minimizeDrawer: context.minimizeDrawer,
    restoreDrawer: context.restoreDrawer,
    openWithMessage: context.openWithMessage,
  }
}

/**
 * Hook to check if AI drawer is available (has provider).
 * Returns null if no provider, or the context if available.
 * Useful for optional integration.
 */
export function useAIDrawerOptional(): AIDrawerContextValue | null {
  return React.useContext(AIDrawerContext)
}
