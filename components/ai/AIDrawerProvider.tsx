"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useAIChat, type UseAIChatReturn } from "@/hooks/useAIChat"

// ============================================================================
// TYPES
// ============================================================================

export type AIDrawerState = "collapsed" | "minimized" | "expanded"

export interface AIDrawerContextType extends UseAIChatReturn {
  /** Current drawer state: collapsed (hidden), minimized (header bar), expanded (full chat) */
  state: AIDrawerState
  /** Open the drawer (to minimized state by default) */
  open: () => void
  /** Close the drawer completely */
  close: () => void
  /** Expand to full chat view */
  expand: () => void
  /** Minimize to header bar */
  minimize: () => void
  /** Toggle between states */
  toggle: () => void
  /** Whether drawer is currently visible (minimized or expanded) */
  isOpen: boolean
  /** Whether drawer is in expanded state */
  isExpanded: boolean
  /** Whether there's an active conversation */
  hasActiveConversation: boolean
  /** Set whether there's an active conversation (for indicator) */
  setHasActiveConversation: (value: boolean) => void
  /** Open drawer and send a message */
  openWithMessage: (content: string, options?: { projectPath?: string | null }) => Promise<void>
  /** Input value for the chat */
  inputValue: string
  /** Set input value */
  setInputValue: (value: string) => void
  /** Selected project path for context */
  selectedProjectPath: string | null
  /** Set selected project path */
  setSelectedProjectPath: (path: string | null) => void
}

const AIDrawerContext = createContext<AIDrawerContextType | null>(null)

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access AI drawer context
 * Throws if used outside AIDrawerProvider
 */
export function useAIDrawer() {
  const context = useContext(AIDrawerContext)
  if (!context) {
    throw new Error("useAIDrawer must be used within an AIDrawerProvider")
  }
  return context
}

/**
 * Hook to safely access AI drawer context
 * Returns null if used outside AIDrawerProvider
 */
export function useAIDrawerSafe() {
  return useContext(AIDrawerContext)
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEY_STATE = "ai-drawer-state"
const STORAGE_KEY_HAS_CONVERSATION = "ai-drawer-has-conversation"
const STORAGE_KEY_PROJECT_PATH = "ai-drawer-project-path"

// ============================================================================
// PROVIDER
// ============================================================================

interface AIDrawerProviderProps {
  children: React.ReactNode
  /** Default state when no persisted state exists */
  defaultState?: AIDrawerState
}

export function AIDrawerProvider({
  children,
  defaultState = "collapsed",
}: AIDrawerProviderProps) {
  // Use the chat hook for all chat functionality
  const chat = useAIChat()

  // Load initial state from localStorage
  const [state, setState] = useState<AIDrawerState>(() => {
    if (typeof window === "undefined") return defaultState
    const saved = localStorage.getItem(STORAGE_KEY_STATE)
    if (saved === "collapsed" || saved === "minimized" || saved === "expanded") {
      return saved
    }
    return defaultState
  })

  const [hasActiveConversation, setHasActiveConversation] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEY_HAS_CONVERSATION) === "true"
  })

  // Input state for the drawer
  const [inputValue, setInputValue] = useState("")

  // Project path state
  const [selectedProjectPath, setSelectedProjectPath] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEY_PROJECT_PATH)
  })

  // Persist state changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATE, state)
  }, [state])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HAS_CONVERSATION, String(hasActiveConversation))
  }, [hasActiveConversation])

  useEffect(() => {
    if (selectedProjectPath) {
      localStorage.setItem(STORAGE_KEY_PROJECT_PATH, selectedProjectPath)
    } else {
      localStorage.removeItem(STORAGE_KEY_PROJECT_PATH)
    }
  }, [selectedProjectPath])

  // Update hasActiveConversation based on chat state
  useEffect(() => {
    const hasMessages = chat.activeConv.messages.length > 0
    setHasActiveConversation(hasMessages)
  }, [chat.activeConv.messages.length])

  // Derived states
  const isOpen = state !== "collapsed"
  const isExpanded = state === "expanded"

  // Actions
  const open = useCallback(() => {
    setState("minimized")
  }, [])

  const close = useCallback(() => {
    setState("collapsed")
  }, [])

  const expand = useCallback(() => {
    setState("expanded")
  }, [])

  const minimize = useCallback(() => {
    setState("minimized")
  }, [])

  const toggle = useCallback(() => {
    setState((current) => {
      switch (current) {
        case "collapsed":
          return "expanded" // Opening goes straight to expanded for better UX
        case "minimized":
          return "expanded"
        case "expanded":
          return "collapsed"
      }
    })
  }, [])

  // Open drawer with a message
  const openWithMessage = useCallback(async (
    content: string,
    options?: { projectPath?: string | null }
  ) => {
    setState("expanded")
    // Small delay to let drawer animation start
    await new Promise(resolve => setTimeout(resolve, 50))
    await chat.sendMessage(content, { projectPath: options?.projectPath ?? selectedProjectPath })
  }, [chat, selectedProjectPath])

  const value: AIDrawerContextType = {
    // Spread all chat functionality
    ...chat,
    // Drawer state
    state,
    open,
    close,
    expand,
    minimize,
    toggle,
    isOpen,
    isExpanded,
    hasActiveConversation,
    setHasActiveConversation,
    openWithMessage,
    // Input state
    inputValue,
    setInputValue,
    // Project state
    selectedProjectPath,
    setSelectedProjectPath,
  }

  return (
    <AIDrawerContext.Provider value={value}>
      {children}
    </AIDrawerContext.Provider>
  )
}
