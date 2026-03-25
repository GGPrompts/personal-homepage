"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import type { LaunchProfile, AIBackend } from "@/lib/agents/types"

// Keep for backwards compat
export type { LaunchProfile as AgentCard } from "@/lib/agents/types"

const STORAGE_KEY = "launch-profiles"

// ============================================================================
// DEFAULT PROFILES
// ============================================================================

const DEFAULT_PROFILES: LaunchProfile[] = [
  {
    id: "claude",
    name: "Claude",
    avatar: "🤖",
    description: "Anthropic Claude Code",
    backend: "claude",
    flags: [],
    enabled: true,
  },
  {
    id: "codex",
    name: "Codex",
    avatar: "💻",
    description: "OpenAI Codex",
    backend: "codex",
    flags: [],
    enabled: true,
  },
  {
    id: "copilot",
    name: "Copilot",
    avatar: "✈️",
    description: "GitHub Copilot",
    backend: "copilot",
    flags: [],
    enabled: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    avatar: "💎",
    description: "Google Gemini",
    backend: "gemini",
    flags: [],
    enabled: true,
  },
]

// ============================================================================
// STORAGE
// ============================================================================

function loadProfiles(): LaunchProfile[] {
  if (typeof window === "undefined") return DEFAULT_PROFILES
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PROFILES
    const parsed = JSON.parse(stored) as LaunchProfile[]
    return parsed.length > 0 ? parsed : DEFAULT_PROFILES
  } catch {
    return DEFAULT_PROFILES
  }
}

function saveProfiles(profiles: LaunchProfile[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

// ============================================================================
// HOOK
// ============================================================================

export interface UseAgentsReturn {
  /** All enabled profiles */
  agents: LaunchProfile[]
  /** All profiles including disabled */
  allAgents: LaunchProfile[]
  /** Always false (no async loading) */
  isLoading: boolean
  /** Always null */
  error: Error | null
  /** Get a profile by ID */
  getById: (id: string | null | undefined) => LaunchProfile | null
  /** Update profiles */
  setProfiles: (profiles: LaunchProfile[]) => void
  /** Reset to defaults */
  resetProfiles: () => void
  /** No-op for compat */
  refetch: () => void
}

export const AGENTS_QUERY_KEY = ["launch-profiles"]

export function useAgents(): UseAgentsReturn {
  const [profiles, setProfilesState] = useState<LaunchProfile[]>(loadProfiles)

  // Sync from storage on mount (handles SSR hydration)
  useEffect(() => {
    setProfilesState(loadProfiles())
  }, [])

  const agents = useMemo(() => profiles.filter((p) => p.enabled), [profiles])

  const getById = useCallback(
    (id: string | null | undefined): LaunchProfile | null => {
      if (!id) return null
      return profiles.find((p) => p.id === id) ?? null
    },
    [profiles]
  )

  const setProfiles = useCallback((newProfiles: LaunchProfile[]) => {
    setProfilesState(newProfiles)
    saveProfiles(newProfiles)
  }, [])

  const resetProfiles = useCallback(() => {
    setProfilesState(DEFAULT_PROFILES)
    saveProfiles(DEFAULT_PROFILES)
  }, [])

  return {
    agents,
    allAgents: profiles,
    isLoading: false,
    error: null,
    getById,
    setProfiles,
    resetProfiles,
    refetch: () => {},
  }
}
