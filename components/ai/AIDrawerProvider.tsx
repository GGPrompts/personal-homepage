"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react"
import { useAIChat, type UseAIChatReturn } from "@/hooks/useAIChat"
import { useQuery } from "@tanstack/react-query"
import type { AgentCard } from "@/lib/agents/types"

// ============================================================================
// TYPES
// ============================================================================

export type AIDrawerState = "collapsed" | "minimized" | "expanded"
export type AIDrawerWidth = "narrow" | "default" | "wide"

export const DRAWER_WIDTH_VALUES: Record<AIDrawerWidth, number> = {
  narrow: 360,
  default: 480,
  wide: 640,
}

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
  /** Current section/page for contextual agent selection */
  currentSection: string | null
  /** Set current section */
  setCurrentSection: (section: string | null) => void
  /** Selected agent ID (null for default/no agent) */
  selectedAgentId: string | null
  /** Set selected agent */
  setSelectedAgentId: (agentId: string | null) => void
  /** Recommended agent based on current section (auto-selected) */
  recommendedAgent: AgentCard | null
  /** All available agents */
  availableAgents: AgentCard[]
  /** Whether agents are loading */
  agentsLoading: boolean
  /** Whether the selected agent was auto-selected based on section */
  isAgentAutoSelected: boolean
  /** Current drawer width preference */
  drawerWidth: AIDrawerWidth
  /** Set drawer width */
  setDrawerWidth: (width: AIDrawerWidth) => void
  /** Cycle to next width preset */
  cycleDrawerWidth: () => void
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
const STORAGE_KEY_SELECTED_AGENT = "ai-drawer-selected-agent"
const STORAGE_KEY_WIDTH = "ai-drawer-width"

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

  // Current section for contextual agent selection
  const [currentSection, setCurrentSection] = useState<string | null>(null)

  // Selected agent ID (null means use recommended or default)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(STORAGE_KEY_SELECTED_AGENT)
  })

  // Track if user has manually selected an agent (to prevent auto-selection override)
  const [userHasSelectedAgent, setUserHasSelectedAgent] = useState(false)

  // Drawer width preference
  const [drawerWidth, setDrawerWidthState] = useState<AIDrawerWidth>(() => {
    if (typeof window === "undefined") return "default"
    const saved = localStorage.getItem(STORAGE_KEY_WIDTH)
    if (saved === "narrow" || saved === "default" || saved === "wide") {
      return saved
    }
    return "default"
  })

  // Fetch available agents
  const { data: agentsData, isLoading: agentsLoading } = useQuery<{ agents: AgentCard[] }>({
    queryKey: ['agents-registry'],
    queryFn: async () => {
      const res = await fetch('/api/ai/agents/registry')
      if (!res.ok) throw new Error('Failed to fetch agents')
      return res.json()
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })

  // Get enabled agents
  const availableAgents = useMemo(() => {
    return agentsData?.agents?.filter(a => a.enabled) ?? []
  }, [agentsData?.agents])

  // Find recommended agent based on current section
  const recommendedAgent = useMemo(() => {
    if (!currentSection || availableAgents.length === 0) return null
    return availableAgents.find(
      agent => agent.sections?.includes(currentSection)
    ) ?? null
  }, [currentSection, availableAgents])

  // Auto-select agent when section changes (only if user hasn't manually selected)
  useEffect(() => {
    if (!userHasSelectedAgent && recommendedAgent) {
      setSelectedAgentId(recommendedAgent.id)
    }
  }, [recommendedAgent, userHasSelectedAgent])

  // Determine if current selection is auto-selected
  const isAgentAutoSelected = useMemo(() => {
    return !userHasSelectedAgent && selectedAgentId === recommendedAgent?.id
  }, [userHasSelectedAgent, selectedAgentId, recommendedAgent?.id])

  // Wrapper for setSelectedAgentId that tracks manual selection
  const handleSetSelectedAgentId = useCallback((agentId: string | null) => {
    setSelectedAgentId(agentId)
    setUserHasSelectedAgent(true)
  }, [])

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

  // Persist selected agent
  useEffect(() => {
    if (selectedAgentId) {
      localStorage.setItem(STORAGE_KEY_SELECTED_AGENT, selectedAgentId)
    } else {
      localStorage.removeItem(STORAGE_KEY_SELECTED_AGENT)
    }
  }, [selectedAgentId])

  // Persist drawer width
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIDTH, drawerWidth)
  }, [drawerWidth])

  // Width actions
  const setDrawerWidth = useCallback((width: AIDrawerWidth) => {
    setDrawerWidthState(width)
  }, [])

  const cycleDrawerWidth = useCallback(() => {
    setDrawerWidthState((current) => {
      switch (current) {
        case "narrow": return "default"
        case "default": return "wide"
        case "wide": return "narrow"
        default: return current
      }
    })
  }, [])

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
  // TODO: [code-review] sendMessage promise not caught - verify error handling in chat.sendMessage
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
    // Agent selection
    currentSection,
    setCurrentSection,
    selectedAgentId,
    setSelectedAgentId: handleSetSelectedAgentId,
    recommendedAgent,
    availableAgents,
    agentsLoading,
    isAgentAutoSelected,
    // Width
    drawerWidth,
    setDrawerWidth,
    cycleDrawerWidth,
  }

  return (
    <AIDrawerContext.Provider value={value}>
      {children}
    </AIDrawerContext.Provider>
  )
}
