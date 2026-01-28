"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo, useCallback } from "react"
import type { AgentCard } from "@/lib/agents/types"

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

  // Get all agents (including disabled)
  const allAgents = useMemo(() => {
    return agentsData?.agents ?? []
  }, [agentsData?.agents])

  // Get enabled agents only
  const agents = useMemo(() => {
    return allAgents.filter(a => a.enabled)
  }, [allAgents])

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
