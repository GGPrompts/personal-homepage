"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, useCallback } from "react"
import type { AgentCard, AIBackend } from "@/lib/agents/types"

// ============================================================================
// VANILLA AGENTS
// ============================================================================

/**
 * Create a vanilla (no custom config) agent for a CLI backend
 */
function createVanillaAgent(backend: AIBackend): AgentCard {
  const configs: Record<AIBackend, { name: string; avatar: string; description: string }> = {
    claude: {
      name: 'Claude',
      avatar: '🤖',
      description: 'Anthropic Claude - no custom configuration',
    },
    codex: {
      name: 'Codex',
      avatar: '💻',
      description: 'OpenAI Codex - no custom configuration',
    },
    copilot: {
      name: 'Copilot',
      avatar: '✈️',
      description: 'GitHub Copilot - no custom configuration',
    },
    gemini: {
      name: 'Gemini',
      avatar: '💎',
      description: 'Google Gemini - no custom configuration',
    },
  }

  const config = configs[backend]
  const now = new Date().toISOString()

  return {
    id: `__vanilla_${backend}__`,
    name: config.name,
    description: config.description,
    avatar: config.avatar,
    backend,
    flags: [],
    sections: [],
    enabled: true,
    created_at: now,
    updated_at: now,
  }
}

/** Pre-built vanilla agents for each CLI backend */
const VANILLA_AGENTS: AgentCard[] = [
  createVanillaAgent('claude'),
  createVanillaAgent('codex'),
  createVanillaAgent('copilot'),
  createVanillaAgent('gemini'),
]

// ============================================================================
// TYPES
// ============================================================================

export interface UseAgentsReturn {
  /** All available agents (enabled only) */
  agents: AgentCard[]
  /** All agents including disabled */
  allAgents: AgentCard[]
  /** Whether agents are loading */
  isLoading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Get an agent by ID */
  getById: (agentId: string | null | undefined) => AgentCard | null
  /** Get agents for a specific section */
  getForSection: (section: string | null | undefined) => AgentCard[]
  /** Find the first agent matching a section (for auto-selection) */
  findForSection: (section: string | null | undefined) => AgentCard | null
  /** Refetch agents */
  refetch: () => void
}

// ============================================================================
// QUERY KEY
// ============================================================================

export const AGENTS_QUERY_KEY = ['agent-registry']

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for fetching and working with AI agents from the registry
 *
 * @example
 * ```tsx
 * const { agents, isLoading, getById, getForSection } = useAgents()
 *
 * // Get a specific agent
 * const agent = getById('page-assistant')
 *
 * // Get agents that specialize in a section
 * const sectionAgents = getForSection('ai-workspace')
 * ```
 */
export function useAgents(): UseAgentsReturn {
  const {
    data: agentsData,
    isLoading,
    error,
    refetch,
  } = useQuery<{ agents: AgentCard[] }>({
    queryKey: AGENTS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/ai/agents/registry')
      if (!res.ok) {
        throw new Error('Failed to fetch agents')
      }
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Get all registered agents (including disabled)
  const registeredAgents = useMemo(() => {
    return agentsData?.agents ?? []
  }, [agentsData?.agents])

  // Combine vanilla agents with registered agents
  const allAgents = useMemo(() => {
    return [...VANILLA_AGENTS, ...registeredAgents]
  }, [registeredAgents])

  // Get enabled agents only (vanilla agents are always enabled)
  const agents = useMemo(() => {
    return [...VANILLA_AGENTS, ...registeredAgents.filter(a => a.enabled)]
  }, [registeredAgents])

  // Get agent by ID
  const getById = useCallback(
    (agentId: string | null | undefined): AgentCard | null => {
      if (!agentId) return null
      return agents.find(a => a.id === agentId) ?? null
    },
    [agents]
  )

  // Get agents for a section
  const getForSection = useCallback(
    (section: string | null | undefined): AgentCard[] => {
      if (!section) return []
      return agents.filter(a => a.sections?.includes(section))
    },
    [agents]
  )

  // Find first agent matching section (for auto-selection)
  const findForSection = useCallback(
    (section: string | null | undefined): AgentCard | null => {
      if (!section) return null
      return agents.find(a => a.sections?.includes(section)) ?? null
    },
    [agents]
  )

  return {
    agents,
    allAgents,
    isLoading,
    error: error as Error | null,
    getById,
    getForSection,
    findForSection,
    refetch,
  }
}
